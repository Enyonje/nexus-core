import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/utils";
import { useAuth } from "../context/AuthProvider";

export default function Dashboard() {
  const { subscription } = useAuth(); // "free" | "pro" | "enterprise"
  const [executions, setExecutions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiFetch("/health"),
      apiFetch("/goals").catch(() => []),
      subscription !== "free" ? apiFetch("/executions").catch(() => []) : [],
    ])
      .then(([healthRes, goalsRes, execs]) => {
        setHealth(healthRes);
        setGoals(goalsRes || []);
        setExecutions(execs || []);
      })
      .finally(() => setLoading(false));
  }, [subscription]);

  if (loading) {
    return (
      <div className="p-10 text-gray-500 dark:text-gray-400 animate-pulse">
        Preparing your workspace…
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-10">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            Welcome back
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            You’re on the <b className="capitalize">{subscription}</b> plan
          </p>
        </div>

        {subscription === "free" && (
          <Link
            to="/subscription"
            className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-5 py-2 rounded-lg shadow hover:opacity-90 transition"
          >
            Upgrade → Unlock Power
          </Link>
        )}
      </header>

      {/* System Overview */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <StatCard label="System Status" value={health?.status === "ok" ? "Healthy" : "Issues"} />
        <StatCard label="Goals Created" value={goals.length} />
        <StatCard
          label="Executions"
          value={subscription === "free" ? "Locked" : executions.length}
          locked={subscription === "free"}
        />
      </section>

      {/* Primary Actions */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <ActionCard
          title="Submit a Goal"
          description="Define what you want Nexus to accomplish."
          to="/goals"
          primary
        />

        <ActionCard
          title="Run Execution"
          description="Execute autonomous workflows."
          to={subscription === "free" ? "/subscription" : "/executions"}
          locked={subscription === "free"}
        />

        <ActionCard
          title="Live Streams"
          description="Real-time agent orchestration."
          to={subscription === "enterprise" ? "/streams" : "/subscription"}
          locked={subscription !== "enterprise"}
        />
      </section>

      {/* Recent Executions */}
      {subscription !== "free" && (
        <section className="bg-white dark:bg-gray-900 rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Recent Executions</h3>
            <Link to="/executions" className="text-blue-600 hover:underline">
              View all →
            </Link>
          </div>

          {executions.length === 0 ? (
            <p className="text-sm text-gray-500">No executions yet.</p>
          ) : (
            <ul className="divide-y dark:divide-gray-800">
              {executions.slice(0, 5).map((e) => (
                <li key={e.id} className="py-3 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{e.goal_type || "Execution"}</p>
                    <p className="text-xs text-gray-500">
                      Started {formatDate(e.started_at)}
                    </p>
                  </div>
                  <StatusBadge status={e.status} />
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {/* Growth CTA */}
      {subscription !== "enterprise" && (
        <section className="bg-gradient-to-r from-purple-500 to-blue-600 text-white rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h4 className="text-lg font-semibold">Ready to scale?</h4>
            <p className="text-sm opacity-90">
              Unlock advanced orchestration, streams, and audit logs.
            </p>
          </div>
          <Link
            to="/subscription"
            className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium shadow hover:bg-gray-100 transition"
          >
            Upgrade Plan →
          </Link>
        </section>
      )}
    </div>
  );
}

/* =======================
   UI Components
======================= */

function StatCard({ label, value, locked }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow relative overflow-hidden">
      {locked && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-sm font-semibold">
          Upgrade Required
        </div>
      )}
      <p className="text-sm text-gray-500">{label}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  );
}

function ActionCard({ title, description, to, locked, primary }) {
  return (
    <Link
      to={to}
      className={`rounded-xl p-6 shadow transition relative overflow-hidden
        ${primary ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-800"}
        ${locked ? "opacity-70" : "hover:shadow-xl"}
      `}
    >
      {locked && (
        <div className="absolute top-3 right-3 text-xs bg-yellow-400 text-black px-2 py-1 rounded">
          Locked
        </div>
      )}
      <h3 className="font-semibold text-lg">{title}</h3>
      <p className={`text-sm mt-1 ${primary ? "opacity-90" : "text-gray-500"}`}>
        {description}
      </p>
    </Link>
  );
}

function StatusBadge({ status }) {
  const map = {
    RUNNING: "bg-yellow-100 text-yellow-800",
    COMPLETED: "bg-green-100 text-green-800",
    FAILED: "bg-red-100 text-red-800",
  };

  return (
    <span className={`text-xs px-3 py-1 rounded-full ${map[status] || "bg-gray-200"}`}>
      {status}
    </span>
  );
}
