import { db } from "../db/db.js";
import { publishEvent } from "../routes/executions.js";
import OpenAI from "openai";

/* =========================
   SAFE OPENAI CLIENT
========================= */
function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

/**
 * Sentinel Governance Agent
 * Validates execution steps in real time
 */
export async function runSentinel(executionId) {
  const { rows: steps } = await db.query(
    `SELECT id, step_type, output
     FROM execution_steps
     WHERE execution_id = $1
       AND status = 'completed'`,
    [executionId]
  );

  for (const step of steps) {
    const verdict = await validateStep(step);

    if (!verdict.ok) {
      // Mark step as failed
      await db.query(
        `UPDATE execution_steps
         SET status = 'failed', error = $1
         WHERE id = $2`,
        [verdict.reason, step.id]
      );

      // Fail execution
      await db.query(
        `UPDATE executions
         SET status = 'failed', finished_at = NOW()
         WHERE id = $1`,
        [executionId]
      );

      // Publish sentinel event
      publishEvent(executionId, {
        event: "sentinel_blocked",
        stepId: step.id,
        reason: verdict.reason,
      });

      console.error("Sentinel blocked execution", executionId, verdict.reason);
      return false;
    }
  }

  publishEvent(executionId, {
    event: "sentinel_passed",
    executionId,
  });

  return true;
}

/**
 * Hybrid validation: rules + LLM reasoning
 */
async function validateStep(step) {
  if (!step.output) {
    return { ok: false, reason: "Missing output (possible hallucination)" };
  }

  const outputStr =
    typeof step.output === "string" ? step.output : JSON.stringify(step.output);

  if (outputStr.length < 10) {
    return { ok: false, reason: "Output too small to be valid" };
  }

  if (step.step_type === "API_CALL") {
    try {
      const parsed =
        typeof step.output === "object" ? step.output : JSON.parse(outputStr);
      if (!parsed.result || !String(parsed.result).toLowerCase().includes("success")) {
        return { ok: false, reason: "API call did not return success" };
      }
    } catch {
      return { ok: false, reason: "API call output not valid JSON" };
    }
  }

  // 🔎 LLM semantic validation
  const verdictLLM = await validateStepLLM(step.step_type, outputStr);
  if (verdictLLM) return verdictLLM;

  // Default: pass if no issues
  return { ok: true };
}

/**
 * LLM-based semantic validation helper
 */
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

Rules:
- Outputs must be coherent, complete, and non-empty.
- Financial data must include currency symbols and totals.
- API responses must contain a "result" field with a clear success/failure indicator.
- Plans must be actionable, with numbered steps or bullet points.
- Analysis must reference the input data and provide measurable insights.
- Summaries must be concise and faithful to the source text.
- Automation steps must produce structured JSON with status fields.

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
    const verdict = JSON.parse(content);
    return verdict;
  } catch (err) {
    console.warn("LLM validation failed, falling back to rules:", err.message);
    return null;
  }
}