// src/execution/logic.js
// Goal handlers DEFINE steps; the runner EXECUTES them (retry, approval, sentinel, metering, events, DB rows).
import OpenAI from "openai";
import { v5 as uuidv5 } from "uuid";
import dotenv from "dotenv";

dotenv.config();

const NS = "6f1b2d5e-3c4a-4e8b-9a71-2d0c5b8f1a34";
const MODELS = new Set(["gpt-4o", "gpt-4o-mini"]);

// Deterministic ids: the same step gets the same id on a retry-from-step, so rows upsert instead of duplicating
const stepId = (executionId, key) => uuidv5(`${executionId}:${key}`, NS);
const fatal = (msg, status = 400) => Object.assign(new Error(msg), { status, retryable: false });

// Lazy client: a missing key no longer crashes the server at import time
let _openai = null;
function openai() {
  if (!process.env.OPENAI_API_KEY) throw fatal("OPENAI_API_KEY is not configured", 500);
  return (_openai ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY, maxRetries: 1, timeout: 60_000 }));
}

/* ---------------- Goal: analysis ---------------- */
function runAnalysisGoal(payload, executionId, step) {
  const text = payload?.text || "";
  return step({
    id: stepId(executionId, "analysis"),
    name: "analysis",
    step_type: "analysis",
    reasoning: "Measuring length, words and structure of the input",
    run: async () => {
      const words = text.trim() ? text.trim().split(/\s+/) : [];
      return {
        length: text.length,
        wordCount: words.length,
        characterCountNoSpaces: text.replace(/\s+/g, "").length,
        timestamp: new Date().toISOString(),
      };
    },
  });
}

/* ---------------- Goal: automation (uses the reviewed plan when the user saved one) ---------------- */
async function runAutomationGoal(payload, executionId, step) {
  const raw = Array.isArray(payload?.plan) && payload.plan.length ? payload.plan : payload?.steps;
  const items = (Array.isArray(raw) ? raw : [])
    .map((t) => (typeof t === "string" ? { title: t } : t))
    .filter((t) => t?.title && String(t.title).trim());
  if (!items.length) throw fatal("Automation requires at least one step.");

  // Default is sequential, because the UI promises "steps, in order"
  const concurrency = Math.min(Math.max(Number(payload?.concurrency) || 1, 1), 5);
  const results = [];

  const runItem = async (item, i) => {
    const out = await step({
      id: stepId(executionId, `task:${i}`),
      name: String(item.title).slice(0, 200),
      step_type: "automation_task",
      tool: item.tool,
      risk: item.risk,
      payload: item.payload || item.params || {},
      reasoning: item.reasoning || `Pipeline step ${i + 1} of ${items.length}`,
      // Fallback used only when no registered plugin matches `tool` (see registerStepPlugin in runner.js)
      run: async () => {
        await new Promise((r) => setTimeout(r, Number(payload?.delayMs) || 400));
        return { task: item.title, status: "success", executedAt: new Date().toISOString() };
      },
    });
    return { id: stepId(executionId, `task:${i}`), name: item.title, status: "completed", result: out };
  };

  for (let i = 0; i < items.length; i += concurrency) {
    const chunk = items.slice(i, i + concurrency);
    results.push(...(await Promise.all(chunk.map((it, j) => runItem(it, i + j)))));
  }
  return { status: "all_tasks_completed", summary: results };
}

/* ---------------- Goal: ai_plan ---------------- */
function runAiPlanGoal(payload, executionId, step) {
  const prompt = payload?.prompt || payload?.objective; // the Goals form sends `objective`
  if (!prompt) throw fatal("AI Plan needs an objective.");
  const model = MODELS.has(payload?.model) ? payload.model : "gpt-4o";

  return step({
    id: stepId(executionId, "ai_plan"),
    name: "ai_plan",
    step_type: "ai_plan",
    reasoning: "Turning the objective into a structured plan",
    timeoutMs: 90_000,
    run: async ({ signal } = {}) => {
      const response = await openai().chat.completions.create(
        {
          model,
          messages: [
            { role: "system", content: "You are Nexus Core's planning engine. Reply with one JSON object containing the plan." },
            { role: "user", content: prompt },
          ],
          response_format: { type: "json_object" },
          temperature: 0.2,
        },
        { signal }
      );
      let plan;
      try { plan = JSON.parse(response.choices[0]?.message?.content || "{}"); }
      catch { throw fatal("The model returned invalid JSON", 502); }
      return { plan, model: response.model, usage: response.usage, tokensUsed: response.usage?.total_tokens || 0 };
    },
  });
}

/* ---------------- Goal: http_request (executed by the runner's built-in http_request step) ---------------- */
function runHttpGoal(payload, executionId, step) {
  if (!payload?.url) throw fatal("An API request needs a URL.");
  return step({
    id: stepId(executionId, "http_request"),
    name: "http_request",
    step_type: "http_request",
    reasoning: `${(payload.method || "GET").toUpperCase()} ${payload.url}`,
    payload,
  });
}

/* ---------------- Fallback ---------------- */
function runNoopGoal(payload, executionId, step) {
  return step({
    id: stepId(executionId, "noop"),
    name: "noop",
    step_type: "noop",
    reasoning: "No handler for this goal type; echoing the payload",
    run: async () => ({ echo: payload || null, processedAt: new Date().toISOString() }),
  });
}

/* ---------------- Entry point ---------------- */
export async function executeGoalLogic(goalType, payload, executionId, executeStep = (s) => s.run({})) {
  switch (goalType) {
    case "analysis": return runAnalysisGoal(payload, executionId, executeStep);
    case "automation": return runAutomationGoal(payload, executionId, executeStep);
    case "ai_plan": return runAiPlanGoal(payload, executionId, executeStep);
    case "http_request": return runHttpGoal(payload, executionId, executeStep);
    default: return runNoopGoal(payload, executionId, executeStep);
  }
}

/* ---------------- Plan drafting for POST /goals/plan (used by the Goals page) ---------------- */
export async function draftPlan(goalType, payload = {}) {
  const goal =
    payload.objective || payload.prompt || payload.description || payload.title || payload.text ||
    (Array.isArray(payload.steps) ? payload.steps.filter(Boolean).join("; ") : "");
  if (!String(goal).trim()) throw fatal("Describe the goal first.");

  const res = await openai().chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          'Break the goal into 3 to 8 concrete steps. Reply with JSON: {"steps":[{"title":string,"tool":string,"risk":"low"|"medium"|"high"}]}. ' +
          "Use risk high for anything that sends messages, spends money, or deletes or writes external data.",
      },
      { role: "user", content: String(goal).slice(0, 4000) },
    ],
  });

  let steps = [];
  try { steps = JSON.parse(res.choices[0]?.message?.content || "{}").steps || []; } catch { /* handled below */ }
  const risks = new Set(["low", "medium", "high"]);
  return steps
    .filter((s) => s?.title)
    .slice(0, 12)
    .map((s) => ({
      title: String(s.title).slice(0, 200),
      tool: s.tool ? String(s.tool).slice(0, 60) : undefined,
      risk: risks.has(s.risk) ? s.risk : "low",
    }));
}