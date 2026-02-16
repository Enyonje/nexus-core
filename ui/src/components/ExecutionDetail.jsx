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

  // Configurable payload fields
  const [analysisText, setAnalysisText] = useState("");
  const [threshold, setThreshold] = useState(0.75);
  const [mode, setMode] = useState("fast");

  useEffect(() => {
    async function loadExecution() {
      try {
        const res = await apiFetch(`/api/executions/${id}`);
        setExecution(res);
        setSteps(res.steps || []);
      } catch {
        addToast("Failed to load execution", "error");
      } finally {
        setLoading(false);
      }
    }
    loadExecution();

    // ✅ Append token to SSE URL safely
    const token = localStorage.getItem("authToken");
    if (!token) {
      addToast("No auth token found, please log in", "error");
      return;
    }

    const evtSource = new EventSource(
      `${import.meta.env.VITE_API_URL}/api/executions/${id}/stream?token=${encodeURIComponent(token)}`,
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
      await apiFetch(`/api/executions/${id}/run`, {
        method: "POST",
        body: JSON.stringify({
          text: analysisText || "Default analysis input",
          parameters: {
            threshold: parseFloat(threshold),
            mode,
          },
        }),
      });
      addToast(`Execution ${id} triggered`, "info");
    } catch {
      console.error("Run execution error:", err);
      addToast("Failed to start execution", "error");
    }
  }

  async function rerunExecution() {
    try {
      await apiFetch(`/api/executions/${id}/rerun`, { method: "POST" });
      addToast(`Execution ${id} rerun started`, "info");
    } catch {
      addToast("Failed to rerun execution", "error");
    }
  }

  async function deleteExecution() {
    if (!window.confirm("Delete this execution?")) return;
    try {
      await apiFetch(`/api/executions/${id}`, { method: "DELETE" });
      addToast(`Execution ${id} deleted`, "success");
    } catch {
      addToast("Failed to delete execution", "error");
    }
  }

  const groupedSteps = useMemo(() => {
    const groups = { running: [], completed: [], failed: [], blocked: [] };
    steps.forEach((s) => {
      groups[s.status]?.push(s);
    });
    return groups;
  }, [steps]);

  const totalSteps = steps.length;
  const completedCount = groupedSteps.completed.length;
  const failedCount = groupedSteps.failed.length;
  const blockedCount = groupedSteps.blocked.length;
  const progressPercent =
    totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

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
          {/* Configurable payload form */}
          <input
            type="text"
            value={analysisText}
            onChange={(e) => setAnalysisText(e.target.value)}
            placeholder="Enter analysis text..."
            className="border rounded px-2 py-1 mr-2"
          />
          <input
            type="number"
            step="0.01"
            value={threshold}
            onChange={(e) => setThreshold(e.target.value)}
            placeholder="Threshold"
            className="border rounded px-2 py-1 mr-2 w-24"
          />
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value)}
            className="border rounded px-2 py-1 mr-2"
          >
            <option value="fast">Fast</option>
            <option value="deep">Deep</option>
          </select>

          <button
            onClick={runExecution}
            className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700"
          >
            Run Execution
          </button>

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

            {["running", "completed", "failed", "blocked"].map((status) => (
        <div key={status}>
          <h2 className="text-lg font-semibold capitalize mt-4">
            {status} steps
          </h2>
          {groupedSteps[status].length === 0 ? (
            <p className="text-sm text-gray-500">No {status} steps</p>
          ) : (
            <ul className="space-y-2">
              {groupedSteps[status].map((s) => (
                <li
                  key={s.id}
                  className="border rounded p-2 bg-gray-50 dark:bg-gray-800"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-gray-500">
                      {s.status}
                    </span>
                  </div>
                  {s.result && (
                    <pre className="text-xs bg-gray-100 dark:bg-gray-900 p-2 rounded mt-1 overflow-x-auto">
                      {JSON.stringify(s.result, null, 2)}
                    </pre>
                  )}
                  {s.error && (
                    <p className="text-xs text-red-600 mt-1">{s.error}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}