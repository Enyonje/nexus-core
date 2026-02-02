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

  /* =========================
     LOAD GOALS
  ========================= */
  useEffect(() => {
    async function loadGoals() {
      try {
        const data = await apiFetch("/goals");

        // backend may return { goals: [...] }
        if (Array.isArray(data.goals)) {
          setGoals(data.goals);
        } else if (Array.isArray(data)) {
          setGoals(data);
        } else {
          console.error("Unexpected goals payload:", data);
          setGoals([]);
        }
      } catch (err) {
        addToast(err.message || "Failed to load goals", "error");
      } finally {
        setLoading(false);
      }
    }

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
      const data = await apiFetch("/goals", {
        method: "POST",
        body: JSON.stringify({
          goalType: "analysis",
          payload: { title, description },
        }),
      });

      const newGoal = data.goal || data;
      setGoals((prev) => [newGoal, ...prev]);

      setTitle("");
      setDescription("");
      addToast("Goal created", "success");
    } catch (err) {
      addToast(err.message || "Failed to create goal", "error");
    } finally {
      setCreating(false);
    }
  }

  /* =========================
     RUN GOAL (CORRECT FLOW)
  ========================= */
  async function runGoal(goalId) {
    setRunning(goalId);
    try {
      // 1️⃣ Create execution
      const execRes = await apiFetch("/executions", {
        method: "POST",
        body: JSON.stringify({ goalId }),
      });

      const executionId = execRes.execution?.id || execRes.id;
      if (!executionId) throw new Error("Execution creation failed");

      // 2️⃣ Run execution
      await apiFetch(`/executions/${executionId}/run`, {
        method: "POST",
      });

      addToast("Execution started", "success");
    } catch (err) {
      addToast(err.message || "Failed to run goal", "error");
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
      <div>
        <h1 className="text-2xl font-bold">Goals</h1>
        <p className="text-gray-500 text-sm">
          Create goals, then run executions on them.
        </p>
      </div>

      <form
        onSubmit={createGoal}
        className="bg-white dark:bg-gray-900 p-4 rounded shadow space-y-3"
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Goal title"
          className="w-full p-2 border rounded"
        />

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional description"
          rows={3}
          className="w-full p-2 border rounded"
        />

        <button
          disabled={creating}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {creating ? "Creating…" : "Create Goal"}
        </button>
      </form>

      <div className="space-y-4">
        {goals.length === 0 ? (
          <div className="text-gray-500 text-sm">
            No goals yet. Create one above.
          </div>
        ) : (
          goals.map((goal) => (
            <div
              key={goal.id}
              className="bg-white dark:bg-gray-800 p-4 rounded shadow flex justify-between"
            >
              <div>
                <div className="font-medium">
                  {goal.goal_payload?.title || "Untitled goal"}
                </div>
                <div className="text-xs text-gray-500">
                  Created {new Date(goal.created_at).toLocaleString()}
                </div>
              </div>

              <button
                onClick={() => runGoal(goal.id)}
                disabled={running === goal.id}
                className="text-blue-600 text-sm hover:underline"
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
