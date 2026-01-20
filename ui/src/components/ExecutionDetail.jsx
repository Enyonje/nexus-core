import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/utils";

export default function ExecutionDetail() {
  const { id } = useParams();
  const [execution, setExecution] = useState(null);
  const [steps, setSteps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    apiFetch(`/executions/${id}`)
      .then((res) => {
        setExecution(res.execution);
        setSteps(res.steps);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="p-6 text-gray-500">Loading execution…</div>;
  if (error) return <div className="p-6 text-red-500">Error: {error}</div>;
  if (!execution) return <div className="p-6 text-gray-500">Execution not found.</div>;

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Execution {execution.id}</h1>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <InfoCard label="Goal Type" value={execution.goal_type} />
        <InfoCard label="Status" value={<StatusBadge status={execution.status} />} />
        <InfoCard label="Started" value={formatDate(execution.started_at)} />
        <InfoCard label="Finished" value={formatDate(execution.finished_at)} />
      </div>

      <h2 className="text-xl font-semibold mb-2">Steps</h2>
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100 dark:bg-gray-800 text-left text-sm text-gray-600 dark:text-gray-300">
            <th className="p-2">Step Type</th>
            <th className="p-2">Status</th>
            <th className="p-2">Input</th>
            <th className="p-2">Output</th>
            <th className="p-2">Error</th>
            <th className="p-2">Created</th>
          </tr>
        </thead>
        <tbody>
          {steps.map((step) => (
            <tr key={step.id} className="border-b hover:bg-gray-50 dark:hover:bg-gray-900">
              <td className="p-2">{step.step_type}</td>
              <td className="p-2"><StatusBadge status={step.status} /></td>
              <td className="p-2 text-xs text-gray-600 dark:text-gray-400">{JSON.stringify(step.input)}</td>
              <td className="p-2 text-xs text-gray-600 dark:text-gray-400">{JSON.stringify(step.output)}</td>
              <td className="p-2 text-xs text-red-500">{step.error || "—"}</td>
              <td className="p-2">{formatDate(step.created_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="bg-white dark:bg-gray-800 p-4 rounded shadow">
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      <div className="text-lg font-medium">{value}</div>
    </div>
  );
}

function StatusBadge({ status }) {
  const base = "px-2 py-1 rounded text-xs font-medium";
  const styles = {
    RUNNING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  return <span className={`${base} ${styles[status] || "bg-gray-200 text-gray-800"}`}>{status}</span>;
}