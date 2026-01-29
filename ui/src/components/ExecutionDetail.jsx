import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/utils";

export default function ExecutionDetail() {
  const { id } = useParams();
  const [execution, setExecution] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch(`/executions/${id}`)
      .then(setExecution)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-gray-500">Loading execution…</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (!execution) return <div className="p-6 text-gray-500">Execution not found.</div>;

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Execution Detail</h1>

      <div className="bg-white dark:bg-gray-800 p-4 rounded shadow space-y-3">
        <div className="text-sm text-gray-500">Execution ID</div>
        <div className="font-mono">{execution.id}</div>

        <div className="text-sm text-gray-500">Goal Title</div>
        <div>{execution.goal_payload?.title || "Untitled goal"}</div>

        {execution.goal_payload?.description && (
          <>
            <div className="text-sm text-gray-500">Description</div>
            <div>{execution.goal_payload.description}</div>
          </>
        )}

        <div className="text-sm text-gray-500">Goal Type</div>
        <div>{execution.goal_type}</div>

        <div className="text-sm text-gray-500">Status</div>
        <StatusBadge status={execution.status} />

        <div className="text-sm text-gray-500">Started</div>
        <div>{formatDate(execution.started_at)}</div>

        <div className="text-sm text-gray-500">Finished</div>
        <div>{formatDate(execution.finished_at)}</div>
      </div>

      <Link
        to="/executions"
        className="text-blue-600 dark:text-blue-400 underline text-sm"
      >
        ← Back to Executions
      </Link>
    </div>
  );
}

function StatusBadge({ status }) {
  const base = "px-2 py-1 rounded text-xs font-medium";
  const styles = {
    running: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    completed: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    failed: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    blocked: "bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  };
  return (
    <span className={`${base} ${styles[status?.toLowerCase()] || "bg-gray-200 text-gray-800"}`}>
      {status}
    </span>
  );
}