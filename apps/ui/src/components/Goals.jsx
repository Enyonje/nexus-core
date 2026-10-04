import { useEffect, useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";

const TYPES = {
  analysis: { label: "Analysis", fields: [["title", "Title"], ["description", "What should the agent look into?", "area"], ["website", "Target URL"]] },
  ai_plan: { label: "Plan an outcome", fields: [["objective", "Describe the outcome you want", "area"]] },
  ai_analysis: { label: "AI analysis", fields: [["prompt", "What should be analysed?", "area"]] },
  ai_summary: { label: "Summarise", fields: [["text", "Text to summarise", "area"]] },
  http_request: { label: "API request", fields: [["url", "URL"], ["method", "Method", "method"], ["body", "Body (JSON)", "area"]] },
  automation: { label: "Automation", fields: [] },
};
const TRIGGERS = [["manual", "Manual"], ["hourly", "Every hour"], ["daily", "Every day"], ["webhook", "Incoming webhook"]];
const APPROVALS = [["risky", "Ask before risky actions"], ["always", "Ask before every step"], ["never", "Run without asking"]];
const RISK = { low: "text-emerald-400", medium: "text-amber-400", high: "text-rose-400" };

const blank = (type) =>
  type === "http_request" ? { url: "", method: "GET", body: "" } : type === "automation" ? { steps: [""] } : Object.fromEntries((TYPES[type]?.fields || []).map(([k]) => [k, ""]));

const unwrapId = (o) => o?.id ?? o?.execution?.id ?? o?.data?.id ?? o?.executionId ?? o?.execution_id ?? null;
const unwrapList = (r) => (Array.isArray(r) ? r : r?.goals ?? []);

export default function Goals() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [goals, setGoals] = useState([]);
  const [goalType, setGoalType] = useState("ai_plan");
  const [payload, setPayload] = useState(blank("ai_plan"));
  const [plan, setPlan] = useState([]); // [{title, tool, risk}]
  const [settings, setSettings] = useState({ trigger: "manual", approval: "risky", budgetUsd: 1 });
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [running, setRunning] = useState(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      setGoals(unwrapList(await apiFetch("/goals")));
    } catch (err) {
      addToast(err?.message || "Could not load goals", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const changeType = (t) => { setGoalType(t); setPayload(blank(t)); setPlan([]); setError(""); };
  const set = (k, v) => { setPayload((p) => ({ ...p, [k]: v })); setPlan([]); };

  /* Draft a plan the user can edit before anything runs */
  async function draftPlan() {
    setPlanning(true);
    setError("");
    try {
      const res = await apiFetch("/goals/plan", { method: "POST", body: JSON.stringify({ goalType, payload }) });
      const steps = Array.isArray(res) ? res : res?.steps ?? res?.plan ?? [];
      setPlan(steps.map((s) => (typeof s === "string" ? { title: s, risk: "low" } : s)));
      if (!steps.length) addToast("The agent returned no steps. Add detail and try again.", "error");
    } catch (err) {
      setError(err?.message || "Could not draft a plan");
    } finally {
      setPlanning(false);
    }
  }
  const editStep = (i, patch) => setPlan((p) => p.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const moveStep = (i, d) => setPlan((p) => { const n = [...p]; const j = i + d; if (j < 0 || j >= n.length) return p;[n[i], n[j]] = [n[j], n[i]]; return n; });

  async function createGoal(e) {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const body = { goalType, payload: plan.length ? { ...payload, plan } : payload, settings };
      const res = await apiFetch("/goals", { method: "POST", body: JSON.stringify(body) });
      const created = Array.isArray(res?.goal ?? res) ? (res.goal ?? res)[0] : res?.goal ?? res?.data ?? res;
      if (created?.id) setGoals((g) => [created, ...g]);
      else await load();
      setPayload(blank(goalType));
      setPlan([]);
      addToast("Goal saved", "success");
    } catch (err) {
      setError(err?.message || "Goal was rejected");
    } finally {
      setCreating(false);
    }
  }

  async function deleteGoal(id) {
    if (!window.confirm("Delete this goal? Its past runs stay in the archive.")) return;
    try {
      await apiFetch(`/goals/${encodeURIComponent(id)}`, { method: "DELETE" });
      setGoals((g) => g.filter((x) => x.id !== id));
      addToast("Goal deleted", "success");
    } catch (err) {
      addToast(err?.message || "Delete failed", "error");
    }
  }

  async function runGoal(id) {
    setRunning(id);
    try {
      const created = await apiFetch("/executions", { method: "POST", body: JSON.stringify({ goalId: id }) });
      const execId = unwrapId(created);
      if (!execId) throw new Error("Server returned no execution id");
      await apiFetch(`/executions/${encodeURIComponent(execId)}/run`, { method: "POST", body: JSON.stringify({}) });
      navigate(`/executions/${execId}`); // watch it live instead of guessing progress
    } catch (err) {
      addToast(err?.message || "Run failed to start", "error");
      setRunning(null);
    }
  }

  const input = "w-full bg-slate-950/60 border border-slate-800 text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 placeholder:text-slate-600 text-sm";
  const label = "block text-xs font-medium text-slate-400 mb-1.5";

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#020617] text-sm text-blue-400 animate-pulse">Loading goals...</div>;
  }

  const canSubmit = !creating && Object.values(payload).some((v) => (Array.isArray(v) ? v.some(Boolean) : v));

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 py-12 px-6 relative overflow-hidden">
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-10">
          <h1 className="text-3xl font-black text-white">Goals</h1>
          <p className="text-sm text-slate-400 mt-1">Describe an outcome, review the plan, set the guardrails, then let the agent work.</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Builder */}
          <form onSubmit={createGoal} className="lg:col-span-5 bg-slate-900/40 backdrop-blur-xl p-6 rounded-3xl border border-slate-800/60 space-y-5 h-fit lg:sticky lg:top-8">
            <div>
              <label className={label} htmlFor="gtype">Goal type</label>
              <select id="gtype" value={goalType} onChange={(e) => changeType(e.target.value)} className={`${input} text-blue-300 font-semibold`}>
                {Object.entries(TYPES).map(([k, t]) => <option key={k} value={k}>{t.label}</option>)}
              </select>
            </div>

            {goalType === "automation" ? (
              <div className="space-y-2">
                <span className={label}>Steps, in order</span>
                {(payload.steps || []).map((s, i) => (
                  <div key={i} className="flex gap-2">
                    <input value={s} onChange={(e) => set("steps", payload.steps.map((x, j) => (j === i ? e.target.value : x)))} placeholder={`Step ${i + 1}`} className={input} />
                    <button type="button" aria-label={`Remove step ${i + 1}`} onClick={() => set("steps", payload.steps.filter((_, j) => j !== i))} className="px-3 text-rose-400 hover:bg-rose-500/10 rounded-xl">Remove</button>
                  </div>
                ))}
                <button type="button" onClick={() => set("steps", [...(payload.steps || []), ""])} className="text-xs font-semibold text-blue-400">Add step</button>
              </div>
            ) : (
              (TYPES[goalType]?.fields || []).map(([k, ph, kind]) => (
                <div key={k}>
                  <label className={label} htmlFor={`f-${k}`}>{ph}</label>
                  {kind === "area" ? (
                    <textarea id={`f-${k}`} rows={4} value={payload[k] ?? ""} onChange={(e) => set(k, e.target.value)} className={input} />
                  ) : kind === "method" ? (
                    <select id={`f-${k}`} value={payload[k]} onChange={(e) => set(k, e.target.value)} className={input}>
                      {["GET", "POST", "PUT", "PATCH", "DELETE"].map((m) => <option key={m}>{m}</option>)}
                    </select>
                  ) : (
                    <input id={`f-${k}`} value={payload[k] ?? ""} onChange={(e) => set(k, e.target.value)} className={input} />
                  )}
                </div>
              ))
            )}

            {/* Editable AI plan */}
            <div className="border-t border-slate-800 pt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white">Plan</span>
                <button type="button" onClick={draftPlan} disabled={planning || !canSubmit} className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-600/20 text-indigo-300 hover:bg-indigo-600/40 disabled:opacity-40">
                  {planning ? "Drafting..." : plan.length ? "Redraft plan" : "Draft plan with AI"}
                </button>
              </div>
              {plan.length === 0 ? (
                <p className="text-xs text-slate-500">Optional. Draft a plan to review each step before the agent runs it.</p>
              ) : (
                <ol className="space-y-2">
                  {plan.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 bg-slate-950/50 border border-slate-800 rounded-lg p-2.5">
                      <div className="flex-1 min-w-0">
                        <input value={s.title} onChange={(e) => editStep(i, { title: e.target.value })} aria-label={`Plan step ${i + 1}`} className="w-full bg-transparent text-sm text-white focus:outline-none" />
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {s.tool ? `${s.tool} · ` : ""}<span className={RISK[s.risk] || RISK.low}>{s.risk || "low"} risk</span>
                        </p>
                      </div>
                      <div className="flex gap-1 text-xs text-slate-400">
                        <button type="button" aria-label="Move up" onClick={() => moveStep(i, -1)} className="px-1.5 hover:text-white">Up</button>
                        <button type="button" aria-label="Move down" onClick={() => moveStep(i, 1)} className="px-1.5 hover:text-white">Down</button>
                        <button type="button" aria-label="Remove step" onClick={() => setPlan((p) => p.filter((_, j) => j !== i))} className="px-1.5 text-rose-400">Remove</button>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </div>

            {/* Guardrails + trigger */}
            <div className="border-t border-slate-800 pt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={label} htmlFor="trig">Starts</label>
                <select id="trig" value={settings.trigger} onChange={(e) => setSettings({ ...settings, trigger: e.target.value })} className={input}>
                  {TRIGGERS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className={label} htmlFor="budget">Spend limit per run (USD)</label>
                <input id="budget" type="number" min="0" step="0.25" value={settings.budgetUsd} onChange={(e) => setSettings({ ...settings, budgetUsd: Number(e.target.value) })} className={input} />
              </div>
              <div className="sm:col-span-2">
                <label className={label} htmlFor="appr">Approvals</label>
                <select id="appr" value={settings.approval} onChange={(e) => setSettings({ ...settings, approval: e.target.value })} className={input}>
                  {APPROVALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
            </div>

            {error && <div role="alert" className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 p-2.5 rounded-lg">{error}</div>}

            <button type="submit" disabled={!canSubmit} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 rounded-xl font-bold text-white text-sm hover:from-blue-500 transition-all disabled:opacity-40">
              {creating ? "Saving..." : "Save goal"}
            </button>
          </form>

          {/* Goal list */}
          <div className="lg:col-span-7 grid grid-cols-1 md:grid-cols-2 gap-4 h-fit">
            {goals.length === 0 && (
              <div className="md:col-span-2 text-center py-16 border border-dashed border-slate-800 rounded-2xl text-sm text-slate-500">
                No goals yet. Describe an outcome on the left to create your first one.
              </div>
            )}
            {goals.map((g) => {
              const p = g.goal_payload || {};
              const s = g.settings || p.settings || {};
              const last = g.last_execution_status;
              return (
                <div key={g.id} className="bg-slate-900/30 p-5 rounded-2xl border border-slate-800/60 hover:border-blue-500/30 transition-colors flex flex-col">
                  <span className="self-start text-[11px] font-semibold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full mb-2">{TYPES[g.goal_type]?.label || g.goal_type}</span>
                  <h3 className="font-bold text-white line-clamp-2">{p.title || p.objective || p.prompt || p.url || "Untitled goal"}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    {(TRIGGERS.find(([v]) => v === s.trigger) || TRIGGERS[0])[1]}
                    {p.plan?.length ? ` · ${p.plan.length} planned steps` : ""}
                    {s.budgetUsd ? ` · max $${s.budgetUsd}` : ""}
                  </p>
                  <div className="mt-auto pt-4 flex items-center gap-2">
                    <button onClick={() => runGoal(g.id)} disabled={running === g.id} className="flex-1 text-xs font-semibold py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white disabled:opacity-50">
                      {running === g.id ? "Starting..." : "Run now"}
                    </button>
                    {g.last_execution_id && (
                      <Link to={`/executions/${g.last_execution_id}`} className={`text-xs px-3 py-2 rounded-lg border border-slate-700 hover:bg-slate-800 ${last === "failed" ? "text-rose-400" : "text-slate-300"}`}>
                        Last run{last ? `: ${last}` : ""}
                      </Link>
                    )}
                    <button onClick={() => deleteGoal(g.id)} aria-label="Delete goal" className="text-xs px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
