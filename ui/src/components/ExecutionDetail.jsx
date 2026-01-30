import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/utils";
import { useExecutionStream } from "../hooks/useExecutionStream";
import toast from "react-hot-toast";

export default function ExecutionDetail() {
  const { id } = useParams();
  const [execution, setExecution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const events = useExecutionStream(id);

  const totalSteps = execution?.goal_payload?.steps?.length || 0;
  const progressEvents = events.filter((evt) => evt.event === "execution_progress");
  const completedSteps = progressEvents.length;
  const progressPercent =
    totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Toast notifications for key events
  useEffect(() => {
    if (events.length === 0) return;

    const latest = events[events.length - 1];

    // Decide bar color based on event type/status
    let barColor = "bg-blue-600"; // default running
    if (latest.event === "execution_completed") barColor = "bg-green-600";
    if (latest.event === "execution_failed") barColor = "bg-red-600";
    if (latest.status === "warning" || latest.status === "retrying") barColor = "bg-yellow-500";

    switch (latest.event) {
      case "execution_started":
        toast("Execution started 🚀", { icon: "⚡", duration: 3000 });
        break;
      case "execution_progress":
        toast.custom(
          (t) => (
            <div
              className={`bg-white dark:bg-gray-800 p-3 rounded shadow-md w-64 transform transition-all duration-300
                ${t.visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"}`}
            >
              <div className="text-sm font-medium mb-2">
                Execution in progress… Step {completedSteps} of {totalSteps}
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-2">
                <div
                  className={`${barColor} h-2 rounded transition-all duration-300`}
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
          ),
          { id: "progress-toast" }
        );
        break;
      case "execution_completed":
        toast.dismiss("progress-toast");
        toast.success("Execution completed successfully 🎉", { duration: 4000 });
        break;
      case "execution_failed":
        toast.dismiss("progress-toast");
        toast.error(`Execution failed ❌: ${latest.error || "Unknown error"}`, {
          duration: 5000,
        });
        break;
      default:
        break;
    }
  }, [events, completedSteps, totalSteps, progressPercent]);

  useEffect(() => {
    apiFetch(`/executions/${id}`)
      .then(setExecution)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-gray-500">Loading execution…</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (!execution) return <div className="p-6 text-gray-500">Execution not found.</div>;

  // ... keep your existing JSX (progress bar, logs, etc.)
}