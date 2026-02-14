import { useEffect, useState, useMemo } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import LoadingSpinner from "./LoadingSpinner.jsx";
import { useAuth } from "../context/AuthProvider.jsx";

export default function ExecutionDetail({ setSelectedExecutionId }) {
  const { id } = useParams();
  const [execution, setExecution] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { role } = useAuth();

  useEffect(() => {
    async function loadExecution() {
      try {
        const res = await apiFetch(`/executions/${id}`);
        setExecution(res);
        setSteps(res.steps || []);
      } catch {
        addToast("Failed to load execution", "error");
      } finally {
        setLoading(false);
      }
    }
    loadExecution();

    const evtSource = new EventSource(
      `${import.meta.env.VITE_API_URL}/executions/${id}/stream`,
      { withCredentials: true }
    );

    evtSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        switch (data.event) {
          case "execution_started":
            addToast(`Execution ${id} started 🚀`, "info");
            setExecution((prev) => ({ ...prev, status: "running" }));
            break;

          case "execution_progress":
            setSteps((prev) => [
              ...prev,
              {
                id: `${id}-${data.stepId || data.step}`,
                name: data.step,
                status: data.error ? "failed" : "completed",
                result: data.result,
                error: data.error,
                started_at: new Date().toISOString(),
                finished_at: new Date().toISOString(),
              },
            ]);
            break;

          case "sentinel_blocked":
            addToast(`Sentinel blocked step ${data.stepId}`, "error");
            setSteps((prev) => [
              ...prev,
              {
                id: `${id}-${data.stepId}`,
                name: data.stepId,
                status: "blocked",
                error: data.reason,
                started_at: new Date().toISOString(),
                finished_at: new Date().toISOString(),
              },
            ]);
            break;

          case "execution_completed":
            addToast(`Execution ${id} completed 🎉`, "success");
            setExecution((prev) => ({ ...prev, status: "completed" }));
            evtSource.close();
            break;

          case "execution_failed":
            addToast(`Execution ${id} failed ❌`, "error");
            setExecution((prev) => ({ ...prev, status: "failed" }));
            evtSource.close();
            break;
        }
      } catch {
        console.warn("Bad stream event", e.data);
      }
    };

    evtSource.onerror = () => {
      addToast("Stream disconnected", "error");
      evtSource.close();
    };

    return () => {
      evtSource.close();
    };
  }, [id]);

  async function runExecution() {
    try {
      await apiFetch(`/executions/${id}/run`, { method: "POST" });
      addToast(`Execution ${id} triggered`, "info");
    } catch {
      addToast("Failed to start execution", "error");
    }
  }

  async function rerunExecution() {
    try {
      await apiFetch(`/admin/executions/${id}/rerun`, { method: "POST" });
      addToast(`Execution ${id} rerun started`, "info");
    } catch {
      addToast("Failed to rerun execution", "error");
    }
  }

  async function deleteExecution() {
    if (!window.confirm("Delete this execution?")) return;
    try {
      await apiFetch(`/executions/${id}`, { method: "DELETE" });
      addToast(`Execution ${id} deleted`, "success");
    } catch {
      addToast("Failed to delete execution", "error");
    }
  }

  // Group steps by status
  const groupedSteps = useMemo(() => {
    const groups = { running: [], completed: [], failed: [], blocked: [] };
    steps.forEach((s) => {
      groups[s.status]?.push(s);
    });
    return groups;
  }, [steps]);

  // Progress calculation
  const totalSteps = steps.length;
  const completedCount = groupedSteps.completed.length;
  const failedCount = groupedSteps.failed.length;
  const blockedCount = groupedSteps.blocked.length;
  const progressPercent =
    totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  // ETA calculation
  const avgDurationMs = useMemo(() => {
    const durations = steps
      .filter((s) => s.started_at && s.finished_at)
      .map(
        (s) =>
          new Date(s.finished_at).getTime() - new Date(s.started_at).getTime()
      );
    if (durations.length === 0) return null;
    return durations.reduce((a, b) => a + b, 0) / durations.length;
  }, [steps]);

  const remainingSteps = totalSteps - completedCount - failedCount - blockedCount;
  const etaMinutes =
    avgDurationMs && remainingSteps > 0
      ? Math.round((avgDurationMs * remainingSteps) / 60000)
      : null;

  if (loading) return <LoadingSpinner label="Loading execution…" />;
  if (!execution) return <p>Execution not found</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Execution {execution.id}</h1>
        <div className="space-x-2">
          <button
            onClick={runExecution}
            className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
          >
            Run Execution
          </button>

          {/* ✅ New View Logs button */}
          <button
            onClick={() => setSelectedExecutionId(execution.id)}
            className="px-4 py-2 bg-indigo-600 text-white rounded shadow hover:bg-indigo-700"
          >
            View Logs
          </button>

          {role === "admin" && (
            <>
              <button
                onClick={rerunExecution}
                className="px-4 py-2 bg-yellow-600 text-white rounded shadow hover:bg-yellow-700"
              >
                Rerun (Admin)
              </button>
              <button
                onClick={deleteExecution}
                className="px-4 py-2 bg-red-600 text-white rounded shadow hover:bg-red-700"
              >
                Delete (Admin)
              </button>
            </>
          )}
        </div>
      </div>

      <p>Status: {execution.status}</p>

      {/* Progress bar */}
      {totalSteps > 0 && (
        <div className="w-full bg-gray-200 rounded h-4 overflow-hidden">
          <div
            className="bg-green-600 h-4"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}
      <p className="text-sm text-gray-600">
        Progress: {completedCount}/{totalSteps} steps completed
        {failedCount > 0 && ` | ${failedCount} failed`}
        {blockedCount > 0 && ` | ${blockedCount} blocked`}
        {etaMinutes !== null && ` | ETA: ~${etaMinutes} min`}
      </p>

      {/* Steps grouped by status */}
      {["running", "completed", "failed", "blocked"].map((status) => (
        <div key={status}>
          <h2 className="text-lg font-semibold capitalize mt-4">
            {status} steps
          </h2>
          {groupedSteps[status].length === 0 ? (
            <p className="text-gray-500 text-sm">No {status} steps</p>
          ) : (
            groupedSteps[status].map((step) => (
              <div
                key={step.id}
                className="p-3 bg-white dark:bg-gray-800 rounded shadow mt-2"
              >
                <div className="flex justify-between">
                  <span>{step.name}</span>
                  <span
                    className={`text-sm ${
                      status === "completed"
                        ? "text-green-600"
                        : status === "failed"
                        ? "text-red-600"
                        : status === "blocked"
                        ? "text-yellow-600"
                        : "text-blue-600"
                    }`}
                  >
                    {status}
                  </span>
                </div>
                <div className="text-xs text-gray-500">
                  {step.started_at &&
                    `Started: ${new Date(step.started_at).toLocaleString()}`}
                  {step.finished_at &&
                    ` | Finished: ${new Date(step.finished_at).toLocaleString()}`}
                </div>
                                {step.result && (
                  <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 mt-2 rounded">
                    {JSON.stringify(step.result, null, 2)}
                  </pre>
                )}
                {step.error && (
                  <p className="text-xs text-red-600 mt-2">Error: {step.error}</p>
                )}
              </div>
            ))
          )}
        </div>
      ))}
    </div>
  );
}