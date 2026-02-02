import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/utils";

export default function ExecutionList() {
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadExecutions() {
      try {
        const data = await apiFetch("/executions");

        // ✅ HANDLE ALL BACKEND SHAPES
        if (Array.isArray(data)) {
          setExecutions(data);
        } else if (Array.isArray(data.executions)) {
          setExecutions(data.executions);
        } else {
          console.error("Unexpected executions payload:", data);
          setExecutions([]);
        }
      } catch (err) {
        console.error("Execution fetch failed:", err);
        setError(err.message || "Failed to load executions");
      } finally {
        setLoading(false);
      }
    }

    loadExecutions();
  }, []);

  if (loading) {
    return <div className="p-6 text-gray-500">Loading executions…</div>;
  }

  if (error) {
    return <div className="p-6 text-red-500">Error: {error}</div>;
  }

  if (executions.length === 0) {
    return (
      <div className="p-6 text-gray-500">
        No executions found. Create a goal and run it 🚀
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Recent Executions</h1>

      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800 text-left text-sm text-gray-600 dark:text-gray-300">
            <th className="p-2">ID</th>
            <th className="p-2">Status</th>
            <th className="p-2">Started</th>
            <th className="p-2">Finished</th>
          </tr>
        </thead>

        <tbody>
          {executions.map((exec) => (
            <tr
              key={exec.id || Math.random()}
              className="border-b hover:bg-gray-50 dark:hover:bg-gray-900"
            >
              <td className="p-2">
                {exec.id ? (
                  <Link
                    to={`/executions/${exec.id}`}
                    className="text-blue-600 dark:text-blue-400 underline"
                  >
                    {exec.id.substring(0, 8)}…
                  </Link>
                ) : (
                  <span className="text-gray-400">unknown</span>
                )}
              </td>

              <td className="p-2">
                <StatusBadge status={exec.status} />
              </td>

              <td className="p-2">
                {exec.started_at ? formatDate(exec.started_at) : "—"}
              </td>

              <td className="p-2">
                {exec.finished_at ? formatDate(exec.finished_at) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }) {
  const base = "px-2 py-1 rounded text-xs font-medium";

  const styles = {
    running:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    completed:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    failed:
      "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    blocked:
      "bg-gray-300 text-gray-800 dark:bg-gray-700 dark:text-gray-200",
  };

  const key = status?.toLowerCase();

  return (
    <span
      className={`${base} ${
        styles[key] || "bg-gray-200 text-gray-800"
      }`}
    >
      {status || "unknown"}
    </span>
  );
}
