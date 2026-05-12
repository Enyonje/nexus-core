import { db } from "../db/db.js";
import { publishEvent } from "../routes/executions.js";
import OpenAI from "openai";

function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Sentinel Governance Agent
 * Validates a single execution step in real time
 */
export async function runSentinel(executionId, stepInfo, output) {
  const verdict = await validateStep(stepInfo, output);

  if (!verdict.ok) {
    // Mark step as blocked
    await db.query(
      `UPDATE execution_steps
       SET status = 'blocked', error = $1, finished_at = NOW()
       WHERE id = $2`,
      [verdict.reason, stepInfo.id]
    );

    publishEvent(executionId, {
      event: "sentinel_blocked",
      stepId: stepInfo.id,
      reason: verdict.reason,
    });

    console.warn("Sentinel blocked step", stepInfo.id, "reason:", verdict.reason);

    // Return verdict but don't throw
    return { allowed: false, reason: verdict.reason };
  }

  publishEvent(executionId, {
    event: "sentinel_passed",
    stepId: stepInfo.id,
    executionId,
  });

  return { allowed: true };
}

/**
 * At the end of an execution, summarize blocked steps
 */
export async function summarizeBlockedSteps(executionId) {
  const { rows: blocked } = await db.query(
    `SELECT id, name, error
     FROM execution_steps
     WHERE execution_id = $1 AND status = 'blocked'`,
    [executionId]
  );

  if (blocked.length > 0) {
    const summary = blocked.map(step => ({
      stepId: step.id,
      name: step.name,
      reason: step.error,
    }));

    // Publish summary event
    publishEvent(executionId, {
      event: "sentinel_summary",
      executionId,
      blockedSteps: summary,
    });

    // Optionally record in audit log
    await db.query(
      `INSERT INTO execution_audit (id, execution_id, event, meta, created_at)
       VALUES (gen_random_uuid(), $1, 'sentinel_summary', $2, NOW())`,
      [executionId, JSON.stringify({ blockedSteps: summary })]
    );

    console.log("Sentinel summary for execution", executionId, summary);
  }
}

/**
 * Hybrid validation: rules + LLM reasoning
 */
async function validateStep(stepInfo, output) {
  if (!output) {
    return { ok: false, reason: "Missing output (possible hallucination)" };
  }

  const outputStr =
    typeof output === "string" ? output : JSON.stringify(output);

  if (outputStr.length < 10) {
    return { ok: false, reason: "Output too small to be valid" };
  }

  if (stepInfo.step_type === "API_CALL") {
    try {
      const parsed =
        typeof output === "object" ? output : JSON.parse(outputStr);
      if (!parsed.result || !String(parsed.result).toLowerCase().includes("success")) {
        return { ok: false, reason: "API call did not return success" };
      }
    } catch {
      return { ok: false, reason: "API call output not valid JSON" };
    }
  }

  const verdictLLM = await validateStepLLM(stepInfo.step_type, outputStr);
  if (verdictLLM) return verdictLLM;

  return { ok: true };
}

async function validateStepLLM(stepType, outputStr) {
  const client = getOpenAIClient();
  if (!client) return null;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `
You are Sentinel, a governance agent for Nexus Core.
Validate execution step outputs in real time.

Respond ONLY with JSON:
{ "ok": true/false, "reason": "string explanation" }
          `,
        },
        {
          role: "user",
          content: `Step type: ${stepType}\nOutput: ${outputStr}`,
        },
      ],
    });

    const content = completion.choices[0].message.content;
    return JSON.parse(content);
  } catch (err) {
    console.warn("LLM validation failed, falling back to rules:", err.message);
    return null;
  }
}
