import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/utils";

export default function Dashboard() {
  const [executions, setExecutions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch("/executions"),
      apiFetch("/goals"),
      apiFetch("/health"),
    ])
      .then(([execs, goalsRes, healthRes]) => {
        setExecutions(execs);
        setGoals(goalsRes);
        setHealth(healthRes);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-6 text-gray-500 animate-pulse">Loading dashboard…</div>;

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-4 flex items-center gap-2">
        <span className="inline-block bg-gradient-to-r from-blue-500 to-purple-600 text-transparent bg-clip-text">Dashboard</span>
        <span className="ml-2 text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200 animate-bounce">LIVE</span>
      </h1>

      {/* System Health */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <InfoCard label="System Health" value={health?.status === "ok" ? "✅ Healthy" : "⚠️ Issues"} accent="from-green-400 to-green-600" />
        <InfoCard label="Database" value={health?.db ? "Connected" : "Disconnected"} accent="from-blue-400 to-blue-600" />
        <InfoCard label="Goals Submitted" value={goals.length} accent="from-purple-400 to-purple-600" />
      </div>

      {/* Recent Executions */}
      <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 transition-all duration-300 hover:shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Recent Executions</h2>
          <Link to="/executions" className="text-blue-600 dark:text-blue-400 font-medium hover:underline transition-colors">View all →</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800 text-left text-sm text-gray-600 dark:text-gray-300">
                <th className="p-3 rounded-l-lg">ID</th>
                <th className="p-3">Goal Type</th>
                <th className="p-3">Status</th>
                <th className="p-3">Started</th>
                <th className="p-3 rounded-r-lg">Finished</th>
              </tr>
            </thead>
            <tbody>
              {executions.slice(0, 5).map((exec, idx) => (
                <tr key={exec.id} className="group bg-white dark:bg-gray-800 hover:bg-blue-50 dark:hover:bg-blue-900 transition-colors rounded-lg shadow-sm">
                  <td className="p-3 font-mono text-blue-700 dark:text-blue-300 flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 text-white font-bold text-xs shadow-md">
                      {idx + 1}
                    </span>
                    <Link to={`/executions/${exec.id}`} className="hover:underline">
                      {exec.id.slice(0, 8)}…
                    </Link>
                  </td>
                  <td className="p-3 capitalize text-gray-700 dark:text-gray-200">{exec.goal_type}</td>
                  <td className="p-3"><StatusBadge status={exec.status} /></td>
                  <td className="p-3 text-gray-500 dark:text-gray-400">{formatDate(exec.started_at)}</td>
                  <td className="p-3 text-gray-500 dark:text-gray-400">{formatDate(exec.finished_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function InfoCard({ label, value, accent = "from-gray-200 to-gray-400" }) {
  return (
    <div className={`relative bg-white dark:bg-gray-800 p-6 rounded-xl shadow group overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-xl`}> 
      <div className={`absolute inset-0 opacity-10 bg-gradient-to-br ${accent} pointer-events-none transition-all duration-300 group-hover:opacity-20`} />
      <div className="text-sm text-gray-500 dark:text-gray-400 font-medium mb-1 z-10 relative">{label}</div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white z-10 relative flex items-center gap-2">
        {value}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const base = "px-3 py-1 rounded-full text-xs font-semibold shadow-sm transition-colors duration-200";
  const styles = {
    RUNNING: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700 animate-pulse",
    COMPLETED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 border border-green-300 dark:border-green-700",
    FAILED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 border border-red-300 dark:border-red-700",
  };
  return <span className={`${base} ${styles[status] || "bg-gray-200 text-gray-800 border border-gray-300"}`}>{status}</span>;
}