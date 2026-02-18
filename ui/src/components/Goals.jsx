import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [goalType, setGoalType] = useState("analysis");
  const [payload, setPayload] = useState({ title: "", description: "", website: "" });
  const [errorMessage, setErrorMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState(null);
  const { addToast } = useToast();
  const [progress, setProgress] = useState({});

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch("/goals");
        setGoals(Array.isArray(res) ? res : res.goals || []);
      } catch {
        addToast("Critical: Failed to load objectives", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function createGoal(e) {
    e.preventDefault();
    setCreating(true);
    setErrorMessage("");
    try {
      const goal = await apiFetch("/goals", {
        method: "POST",
        body: JSON.stringify({ goalType, payload }),
      });
      setGoals((g) => [goal, ...g]);
      resetPayload(goalType);
      addToast("Objective Uploaded", "success");
    } catch (err) {
      setErrorMessage(err?.error || "Submission rejected");
      addToast("Protocol Error", "error");
    } finally {
      setCreating(false);
    }
  }

  async function deleteGoal(goalId) {
    try {
      await apiFetch(`/goals/${goalId}`, { method: "DELETE" });
      setGoals((g) => g.filter((goal) => goal.id !== goalId));
      addToast("Objective Terminated", "success");
    } catch (err) {
      addToast("Deletion Interrupted", "error");
    }
  }

  async function runGoal(goalId) {
    setRunning(goalId);
    try {
      const execution = await apiFetch("/executions", {
        method: "POST",
        body: JSON.stringify({ goalId }),
      });
      await apiFetch(`/executions/${execution.id}/run`, { method: "POST" });
      addToast("Swarm Dispatched", "success");
    } catch (err) {
      addToast("Dispatch Failed", "error");
    } finally {
      setRunning(null);
    }
  }

  function resetPayload(type) {
    if (type === "analysis") setPayload({ title: "", description: "", website: "" });
    else if (type === "test") setPayload({ message: "" });
    else if (type === "automation") setPayload({ steps: [""] });
    else if (type === "http_request") setPayload({ url: "", method: "GET", headers: {}, body: "" });
    else if (type === "ai_analysis") setPayload({ prompt: "" });
    else if (type === "ai_summary") setPayload({ text: "" });
    else if (type === "ai_plan") setPayload({ objective: "" });
    else setPayload({});
  }

  const inputClass = "w-full bg-slate-950/50 border-none text-white px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all placeholder:text-slate-700";

  function renderPayloadFields() {
    switch (goalType) {
      case "analysis":
        return (
          <div className="space-y-4">
            <input value={payload.title} onChange={(e) => setPayload({ ...payload, title: e.target.value })} placeholder="Mission Title" className={inputClass} />
            <textarea value={payload.description} onChange={(e) => setPayload({ ...payload, description: e.target.value })} placeholder="Operational Description" className={inputClass} rows="3" />
            <input value={payload.website} onChange={(e) => setPayload({ ...payload, website: e.target.value })} placeholder="Target URL" className={inputClass} />
          </div>
        );
      case "automation":
        return (
          <div className="space-y-3">
            {payload.steps.map((step, idx) => (
              <div key={idx} className="flex gap-2">
                <input value={step} onChange={(e) => {
                  const newSteps = [...payload.steps];
                  newSteps[idx] = e.target.value;
                  setPayload({ steps: newSteps });
                }} placeholder={`Step ${idx + 1}`} className={inputClass} />
                <button type="button" onClick={() => setPayload({ steps: payload.steps.filter((_, i) => i !== idx) })} className="px-3 text-red-500 hover:bg-red-500/10 rounded-xl transition">✖</button>
              </div>
            ))}
            <button type="button" onClick={() => setPayload({ steps: [...payload.steps, ""] })} className="text-xs font-bold text-blue-400 uppercase tracking-widest">+ Add Sub-Process</button>
          </div>
        );
      default:
        return <textarea value={payload.prompt || payload.text || payload.objective || ""} onChange={(e) => setPayload({ ...payload, [Object.keys(payload)[0]]: e.target.value })} placeholder="Configure Parameters..." className={inputClass} rows="4" />;
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617]">
      <div className="animate-pulse text-blue-500 font-mono tracking-widest uppercase">Initializing Core...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 py-12 px-6 relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-6xl mx-auto relative z-10">
        <header className="mb-12 text-center">
          <h1 className="text-4xl font-black bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">MISSION CONTROL</h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-[0.4em] mt-2">Active Objective Management</p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Sidebar: Creation Form */}
          <div className="lg:col-span-4">
            <form onSubmit={createGoal} className="bg-slate-900/40 backdrop-blur-xl p-8 rounded-3xl shadow-2xl sticky top-8 space-y-6">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Protocol Type</label>
                <select 
                  value={goalType} 
                  onChange={(e) => { setGoalType(e.target.value); resetPayload(e.target.value); }} 
                  className="w-full bg-slate-950 text-blue-400 font-bold border-none rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500/40 appearance-none"
                >
                  <option value="analysis">Neural Analysis</option>
                  <option value="automation">Swarm Automation</option>
                  <option value="http_request">Network Request</option>
                  <option value="ai_plan">Strategic Planning</option>
                </select>
              </div>

              {renderPayloadFields()}

              {errorMessage && <div className="text-[10px] font-bold text-red-400 uppercase tracking-tighter bg-red-400/10 p-2 rounded-lg text-center">{errorMessage}</div>}

              <button type="submit" disabled={creating} className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 py-4 rounded-xl font-black text-white uppercase tracking-widest text-xs hover:from-blue-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.2)]">
                {creating ? "Syncing..." : "Deploy Objective"}
              </button>
            </form>
          </div>

          {/* Main Area: Objectives Grid */}
          <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-4 h-fit">
            {goals.map((goal) => (
              <div key={goal.id} className="group relative bg-slate-900/20 backdrop-blur-md p-6 rounded-2xl border border-slate-800/50 hover:border-blue-500/30 transition-all duration-300">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest bg-blue-500/10 px-2 py-0.5 rounded-full">
                      {goal.goal_type}
                    </span>
                    <h3 className="font-bold text-white truncate max-w-[150px]">
                      {goal.goal_payload?.title || goal.goal_payload?.objective || "Standard Operation"}
                    </h3>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => runGoal(goal.id)} disabled={running === goal.id} className="p-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600 hover:text-white transition">
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4.512 1.512a.5.5 0 01.5.5v15a.5.5 0 01-1 0V2a.5.5 0 01.5-.5zM16.5 10l-10 6V4l10 6z" /></svg>
                    </button>
                    <button onClick={() => deleteGoal(goal.id)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>

                {/* Status & Progress */}
                <div className="space-y-3 pt-4 border-t border-slate-800/50">
                  <div className="flex justify-between text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                    <span>Signal Strength</span>
                    <span className={progress[goal.id]?.status === 'failed' ? 'text-red-400' : 'text-blue-400'}>
                      {progress[goal.id]?.status || "Standby"}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-slate-950 rounded-full overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-1000 shadow-[0_0_10px_rgba(59,130,246,0.5)] ${progress[goal.id]?.status === 'failed' ? 'bg-red-500' : 'bg-blue-500'}`}
                      style={{ width: `${progress[goal.id]?.percent || 5}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}