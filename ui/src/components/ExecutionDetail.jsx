import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import LoadingSpinner from "./LoadingSpinner.jsx";
import { useAuth } from "../context/AuthProvider.jsx";

export default function ExecutionDetail() {
  const { id } = useParams();
  const [execution, setExecution] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();
  const { role } = useAuth(); // ✅ check if admin

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

    // Subscribe to SSE stream
    const evtSource = new EventSource(
      `${import.meta.env.VITE_API_URL}/executions/${id}/stream`,
      { withCredentials: true }
    );

    evtSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);

        if (data.event === "execution_started") {
          addToast(`Execution ${id} started 🚀`, "info");
          setExecution((prev) => ({ ...prev, status: "running" }));
        }

        if (data.event === "execution_progress") {
          setSteps((prev) => [
            ...prev,
            {
              id: `${id}-${data.step}`,
              name: data.step,
              status: data.error ? "failed" : "completed",
              result: data.result,
              error: data.error,
              started_at: new Date().toISOString(),
              finished_at: new Date().toISOString(),
            },
          ]);
        }

        if (data.event === "execution_completed") {
          addToast(`Execution ${id} completed 🎉`, "success");
          setExecution((prev) => ({ ...prev, status: "completed" }));
          evtSource.close();
        }

        if (data.event === "execution_failed") {
          addToast(`Execution ${id} failed ❌`, "error");
          setExecution((prev) => ({ ...prev, status: "failed" }));
          evtSource.close();
        }
      } catch {
        console.warn("Bad stream event", e.data);
      }
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

  // ✅ Admin-only actions
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

      <div className="space-y-4">
        {steps.length === 0 ? (
          <p className="text-gray-500">No steps yet</p>
        ) : (
          steps.map((step) => (
            <div
              key={step.id}
              className="p-3 bg-white dark:bg-gray-800 rounded shadow"
            >
              <div className="flex justify-between">
                <span>{step.name}</span>
                <span
                  className={`text-sm ${
                    step.status === "completed"
                      ? "text-green-600"
                      : step.status === "failed"
                      ? "text-red-600"
                      : "text-blue-600"
                  }`}
                >
                  {step.status}
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
    </div>
  );
}