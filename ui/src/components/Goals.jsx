import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";

export default function Goals() {
  const [goals, setGoals] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
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
    if (!title.trim()) return;

    setCreating(true);
    try {
      const goal = await apiFetch("/goals", {
        method: "POST",
        body: JSON.stringify({
          goal_type: "analysis",
          goal_payload: { title, description },
        }),
      });

      setGoals((g) => [goal, ...g]);
      setTitle("");
      setDescription("");
      addToast("Goal created", "success");
    } catch {
      addToast("Failed to create goal", "error");
    } finally {
      setCreating(false);
    }
  }

  /* RUN GOAL */
  async function runGoal(goalId) {
    setRunning(goalId);
    try {
      // STEP 1 — create execution
      const execution = await apiFetch("/executions", {
        method: "POST",
        body: JSON.stringify({ goal_id: goalId }),
      });

      // STEP 2 — run execution
      await apiFetch(`/executions/${execution.id}/run`, {
        method: "POST",
      });

      addToast("Execution started", "success");
    } catch (err) {
      addToast(err.message || "Execution failed", "error");
    } finally {
      setRunning(null);
    }
  }

  if (loading) return <div className="p-6">Loading goals…</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Goals</h1>

      <form onSubmit={createGoal} className="space-y-2">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Goal title"
          className="w-full p-2 border rounded"
        />
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description"
          className="w-full p-2 border rounded"
        />
        <button className="bg-blue-600 text-white px-4 py-2 rounded">
          {creating ? "Creating…" : "Create Goal"}
        </button>
      </form>

      {goals.map((goal) => (
        <div
          key={goal.id}
          className="p-4 bg-white dark:bg-gray-800 rounded flex justify-between"
        >
          <div>
            <div className="font-medium">
              {goal.goal_payload?.title || "Untitled"}
            </div>
            <div className="text-xs text-gray-500">
              {new Date(goal.created_at).toLocaleString()}
            </div>
          </div>

          <button
            onClick={() => runGoal(goal.id)}
            disabled={running === goal.id}
            className="text-blue-600"
          >
            {running === goal.id ? "Running…" : "Run →"}
          </button>
        </div>
      ))}
    </div>
  );
}
