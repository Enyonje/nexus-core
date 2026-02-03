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
  const [progress, setProgress] = useState({});

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
          goalType: "analysis",
          payload: { title, description },
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

  /* RUN GOAL + STREAM */
  async function runGoal(goalId) {
    setRunning(goalId);
    try {
      // STEP 1 — create execution
      const execution = await apiFetch("/executions", {
        method: "POST",
        body: JSON.stringify({ goalId }), // ✅ ensure goalId is sent
      });

      // STEP 2 — run execution
      await apiFetch(`/executions/${execution.id}/run`, { method: "POST" });

      addToast("Execution started", "success");

      // STEP 3 — subscribe to stream (use relative URL)
      const evtSource = new EventSource(`/executions/${execution.id}/stream`, {
        withCredentials: true,
      });

      evtSource.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data);

          if (data.event === "execution_progress") {
            const { completedSteps, totalSteps } = data;
            const percent =
              totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

            setProgress((prev) => ({
              ...prev,
              [execution.id]: {
                percent,
                status: "running",
                completedSteps,
                totalSteps,
              },
            }));
          }

          if (data.event === "execution_completed") {
            setProgress((prev) => ({
              ...prev,
              [execution.id]: {
                percent: 100,
                status: "completed",
                completedSteps: data.totalSteps,
                totalSteps: data.totalSteps,
              },
            }));
            addToast(`Execution ${execution.id} completed 🎉`, "success");
            evtSource.close();
          }

          if (data.event === "execution_failed") {
            setProgress((prev) => ({
              ...prev,
              [execution.id]: {
                percent: 0,
                status: "failed",
                completedSteps: 0,
                totalSteps: data.totalSteps || 0,
              },
            }));
            addToast(`Execution ${execution.id} failed ❌`, "error");
            evtSource.close();
          }
        } catch {
          console.warn("Bad stream event", e.data);
        }
      };
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
        <button
          type="submit"
          disabled={creating}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {creating ? "Creating…" : "Create Goal"}
        </button>
      </form>

      {goals.map((goal) => {
        const prog = progress[goal.id];
        return (
          <div
            key={goal.id}
            className="p-4 bg-white dark:bg-gray-800 rounded space-y-2"
          >
            <div className="flex justify-between">
              <div>
                <div className="font-medium">
                  {/* ✅ handle different payload shapes */}
                  {goal.goal_payload?.title ||
                   goal.goal_payload?.message ||
                   "Untitled"}
                </div>
                <div className="text-xs text-gray-500">
                  {new Date(goal.created_at).toLocaleString()}
                </div>
              </div>

              <button
                onClick={() => runGoal(goal.id)}
                disabled={running === goal.id}
                className="text-sm text-blue-600 hover:underline"
              >
                {running === goal.id ? "Running…" : "Run →"}
              </button>
            </div>

            {prog && (
              <div className="space-y-1">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2">
                  <div
                    className={`h-2 rounded transition-all duration-300 ${
                      prog.status === "completed"
                        ? "bg-green-600"
                        : prog.status === "failed"
                        ? "bg-red-600"
                        : "bg-blue-600"
                    }`}
                    style={{ width: `${prog.percent}%` }}
                  ></div>
                </div>
                <div className="text-xs text-gray-600">
                  {prog.status === "running" &&
                    `Step ${prog.completedSteps} of ${prog.totalSteps}`}
                  {prog.status === "completed" && "Completed ✅"}
                  {prog.status === "failed" && "Failed ❌"}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}