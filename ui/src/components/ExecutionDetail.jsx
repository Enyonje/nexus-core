import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import LoadingSpinner from "./LoadingSpinner.jsx";

export default function ExecutionDetail() {
  const { id } = useParams();
  const [execution, setExecution] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

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

        if (data.event === "step_progress") {
          setSteps((prev) =>
            prev.map((s) =>
              s.id === data.stepId ? { ...s, status: data.status } : s
            )
          );
        }

        if (data.event === "execution_completed") {
          addToast(`Execution ${id} completed 🎉`, "success");
          evtSource.close();
        }

        if (data.event === "execution_failed") {
          addToast(`Execution ${id} failed ❌`, "error");
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

  if (loading) return <LoadingSpinner label="Loading execution…" />;

  if (!execution) return <p>Execution not found</p>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Execution {execution.id}</h1>
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
            </div>
          ))
        )}
      </div>
    </div>
  );
}