import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [running, setRunning] = useState(null); // track which goal is running

  const { addToast } = useToast();

  /* =========================
     LOAD GOALS
  ========================= */
  async function loadGoals() {
    try {
      const data = await apiFetch("/goals");
      setGoals(data || []);
    } catch (err) {
      addToast(err.message || "Failed to load goals", "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadGoals();
  }, []);

  /* =========================
     CREATE GOAL
  ========================= */
  async function createGoal(e) {
    e.preventDefault();

    if (!title.trim()) {
      addToast("Goal title is required", "error");
      return;
    }

    setCreating(true);
    try {
      const newGoal = await apiFetch("/goals", {
        method: "POST",
        body: JSON.stringify({
          goalType: "analysis", // adjust type as needed
          payload: { title, description },
        }),
      });

      setGoals((prev) => [newGoal, ...prev]);
      setTitle("");
      setDescription("");
      addToast("Goal created successfully", "success");
    } catch (err) {
      addToast(err.message || "Failed to create goal", "error");
    } finally {
      setCreating(false);
    }
  }

  /* =========================
     RUN EXECUTION
  ========================= */
  async function runExecution(goalId) {
    setRunning(goalId);
    try {
      const res = await apiFetch(`/executions/${goalId}/run`, {
        method: "POST",
      });
      addToast(`Execution started for goal ${goalId}`, "success");
    } catch (err) {
      addToast(err.message || "Failed to start execution", "error");
    } finally {
      setRunning(null);
    }
  }

  /* =========================
     UI
  ========================= */
  if (loading) {
    return <div className="p-6 text-gray-500">Loading goals…</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      {/* HEADER */}
      <div>
        <h1 className="text-2xl font-bold">Goals</h1>
        <p className="text-gray-500 text-sm">
          Create goals to run executions and test Nexus Core.
        </p>
      </div>

      {/* CREATE GOAL */}
      <form
        onSubmit={createGoal}
        className="bg-white dark:bg-gray-900 p-4 rounded shadow space-y-3"
      >
        <input
          type="text"
          placeholder="Goal title (e.g. Analyze market trends)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 border rounded"
        />

        <textarea
          placeholder="Optional description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full p-2 border rounded"
          rows={3}
        />

        <button
          type="submit"
          disabled={creating}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
        >
          {creating ? "Creating…" : "Create Goal"}
        </button>
      </form>

      {/* GOALS LIST */}
      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="text-gray-500 text-sm">
            No goals yet. Create your first goal above.
          </div>
        ) : (
          goals.map((goal) => (
            <div
              key={goal.id}
              className="bg-white dark:bg-gray-800 p-4 rounded shadow flex justify-between items-center"
            >
              <div>
                <div className="font-medium">
                  {goal.goal_payload?.title || "Untitled goal"}
                </div>
                {goal.goal_payload?.description && (
                  <div className="text-xs text-gray-500">
                    {goal.goal_payload.description}
                  </div>
                )}
                <div className="text-xs text-gray-500">
                  Created {new Date(goal.created_at).toLocaleString()}
                </div>
              </div>

              <button
                onClick={() => runExecution(goal.id)}
                disabled={running === goal.id}
                className="text-sm text-blue-600 hover:underline"
              >
                {running === goal.id ? "Running…" : "Run →"}
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}