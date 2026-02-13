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

  /* LOAD GOALS */
  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch("/goals");
        setGoals(Array.isArray(res) ? res : res.goals || []);
      } catch {
        addToast("Failed to load goals", "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  /* CREATE GOAL */
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
      addToast("Goal created", "success");
    } catch (err) {
      setErrorMessage(err?.error || "Failed to create goal");
      addToast("Failed to create goal", "error");
    } finally {
      setCreating(false);
    }
  }

  /* DELETE GOAL */
  async function deleteGoal(goalId) {
    try {
      await apiFetch(`/goals/${goalId}`, { method: "DELETE" });
      setGoals((g) => g.filter((goal) => goal.id !== goalId));
      addToast("Goal deleted", "success");
    } catch (err) {
      addToast(err.message || "Failed to delete goal", "error");
    }
  }

  /* RUN GOAL */
  async function runGoal(goalId) {
    setRunning(goalId);
    try {
      const execution = await apiFetch("/executions", {
        method: "POST",
        body: JSON.stringify({ goalId }),
      });
      await apiFetch(`/executions/${execution.id}/run`, { method: "POST" });
      addToast("Execution started", "success");
    } catch (err) {
      addToast(err.message || "Execution failed", "error");
    } finally {
      setRunning(null);
    }
  }

  /* Reset payload when switching goal type */
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

  /* Dynamic payload fields */
  function renderPayloadFields() {
    switch (goalType) {
      case "analysis":
        return (
          <>
            <input
              value={payload.title}
              onChange={(e) => setPayload({ ...payload, title: e.target.value })}
              placeholder="Goal title"
              className="w-full p-3 border rounded-lg"
            />
            <textarea
              value={payload.description}
              onChange={(e) => setPayload({ ...payload, description: e.target.value })}
              placeholder="Description"
              className="w-full p-3 border rounded-lg"
            />
            <input
              value={payload.website}
              onChange={(e) => setPayload({ ...payload, website: e.target.value })}
              placeholder="Organization website"
              className="w-full p-3 border rounded-lg"
            />
          </>
        );
      case "test":
        return (
          <input
            value={payload.message}
            onChange={(e) => setPayload({ message: e.target.value })}
            placeholder="Message"
            className="w-full p-3 border rounded-lg"
          />
        );
      case "automation":
        return (
          <div className="space-y-2">
            {payload.steps.map((step, idx) => (
              <div key={idx} className="flex gap-2">
                <input
                  value={step}
                  onChange={(e) => {
                    const newSteps = [...payload.steps];
                    newSteps[idx] = e.target.value;
                    setPayload({ steps: newSteps });
                  }}
                  placeholder={`Step ${idx + 1}`}
                  className="flex-1 p-2 border rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    const newSteps = payload.steps.filter((_, i) => i !== idx);
                    setPayload({ steps: newSteps });
                  }}
                  className="px-2 text-red-600"
                >
                  ✖
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setPayload({ steps: [...payload.steps, ""] })}
              className="text-sm text-blue-600 hover:underline"
            >
              + Add Step
            </button>
          </div>
        );
      case "http_request":
        return (
          <>
            <input
              value={payload.url}
              onChange={(e) => setPayload({ ...payload, url: e.target.value })}
              placeholder="Request URL"
              className="w-full p-3 border rounded-lg"
            />
            <select
              value={payload.method}
              onChange={(e) => setPayload({ ...payload, method: e.target.value })}
              className="w-full p-3 border rounded-lg"
            >
              <option>GET</option>
              <option>POST</option>
              <option>PUT</option>
              <option>DELETE</option>
            </select>
            <textarea
              value={payload.body}
              onChange={(e) => setPayload({ ...payload, body: e.target.value })}
              placeholder="Request body"
              className="w-full p-3 border rounded-lg"
            />
          </>
        );
      case "ai_analysis":
        return (
          <textarea
            value={payload.prompt}
            onChange={(e) => setPayload({ prompt: e.target.value })}
            placeholder="Prompt"
            className="w-full p-3 border rounded-lg"
          />
        );
      case "ai_summary":
        return (
          <textarea
            value={payload.text}
            onChange={(e) => setPayload({ text: e.target.value })}
            placeholder="Text to summarize"
            className="w-full p-3 border rounded-lg"
          />
        );
      case "ai_plan":
        return (
          <input
            value={payload.objective}
            onChange={(e) => setPayload({ objective: e.target.value })}
            placeholder="Objective"
            className="w-full p-3 border rounded-lg"
          />
        );
      default:
        return null;
    }
  }

  if (loading) return <div className="p-6 text-center">Loading goals…</div>;

  return (
    <div className="flex justify-center px-6 py-10">
      <div className="w-full max-w-4xl space-y-8">
        <h1 className="text-3xl font-bold text-center">Goals</h1>

        {/* Create Goal Form */}
        <form
          onSubmit={createGoal}
          className="space-y-4 bg-gray-50 p-6 rounded-xl shadow"
        >
          <label>
            Goal Type:
            <select
              value={goalType}
              onChange={(e) => {
                setGoalType(e.target.value);
                resetPayload(e.target.value);
              }}
              className="ml-2 p-2 border rounded-lg"
            >
              <option value="analysis">Analysis</option>
              <option value="test">Test</option>
              <option value="automation">Automation</option>
              <option value="http_request">HTTP Request</option>
              <option value="ai_analysis">AI Analysis</option>
              <option value="ai_summary">AI Summary</option>
              <option value="ai_plan">AI Plan</option>
            </select>
          </label>

          {renderPayloadFields()}

          {errorMessage && <div className="text-sm text-red-600">{errorMessage}</div>}

          <button
            type="submit"
            disabled={creating}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow hover:bg-blue-700"
          >
            {creating ? "Creating…" : "Create Goal"}
          </button>
        </form>

                {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {goals.map((goal) => (
            <div
              key={goal.id}
              className="p-6 bg-white rounded-xl shadow-md space-y-4"
            >
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-semibold text-lg">
                    {goal.goal_payload?.title ||
                      goal.goal_payload?.message ||
                      goal.goal_payload?.objective ||
                      "Untitled"}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(goal.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => runGoal(goal.id)}
                    disabled={running === goal.id}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    {running === goal.id ? "Running…" : "Run →"}
                  </button>
                  <button
                    onClick={() => deleteGoal(goal.id)}
                    className="text-sm text-red-600 hover:underline"
                  >
                    Delete ✖
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}