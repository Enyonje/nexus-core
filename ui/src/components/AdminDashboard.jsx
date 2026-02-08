import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { Link } from "react-router-dom";

export default function AdminDashboard() {
  const [usage, setUsage] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdminData() {
      try {
        const [usageRes, execRes] = await Promise.all([
          apiFetch("/admin/usage"),
          apiFetch("/admin/executions"),
        ]);

        setUsage(usageRes);
        setExecutions(execRes.executions || []);
      } catch (err) {
        alert("Admin access only");
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, []);

  if (loading) return <div className="p-6">Loading admin dashboard…</div>;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-10">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      {/* Usage Overview */}
      {usage && (
        <section>
          <h2 className="text-xl font-semibold mb-4">
            Usage Overview – {usage.month}
          </h2>
          <table className="w-full border text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="p-2 border">Email</th>
                <th className="p-2 border">Tier</th>
                <th className="p-2 border">Role</th>
                <th className="p-2 border">AI Used</th>
                <th className="p-2 border">Executions</th>
              </tr>
            </thead>
            <tbody>
              {usage.users.map((u) => (
                <tr key={u.id}>
                  <td className="p-2 border">{u.email}</td>
                  <td className="p-2 border capitalize">{u.subscription}</td>
                  <td className="p-2 border">{u.role}</td>
                  <td className="p-2 border">{u.ai_used}</td>
                  <td className="p-2 border">{u.executions}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Executions Overview */}
      <section>
        <h2 className="text-xl font-semibold mb-4">All Executions</h2>
        {executions.length === 0 ? (
          <p className="text-gray-500">No executions found</p>
        ) : (
          <table className="w-full border text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="p-2 border">ID</th>
                <th className="p-2 border">Status</th>
                <th className="p-2 border">Started</th>
                <th className="p-2 border">Finished</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {executions.map((e) => (
                <tr key={e.id}>
                  <td className="p-2 border">{e.id.slice(0, 8)}…</td>
                  <td className="p-2 border capitalize">{e.status}</td>
                  <td className="p-2 border">
                    {e.started_at ? new Date(e.started_at).toLocaleString() : "—"}
                  </td>
                  <td className="p-2 border">
                    {e.finished_at ? new Date(e.finished_at).toLocaleString() : "—"}
                  </td>
                  <td className="p-2 border space-x-2">
                    {/* ✅ Link to ExecutionDetail */}
                    <Link
                      to={`/executions/${e.id}`}
                      className="px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}