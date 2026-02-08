import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function AdminDashboard() {
  const [usage, setUsage] = useState(null);
  const [goals, setGoals] = useState([]);
  const [executions, setExecutions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadAdminData() {
      try {
        const [usageRes, goalsRes, execRes] = await Promise.all([
          apiFetch("/admin/usage"),
          apiFetch("/admin/goals"),
          apiFetch("/admin/executions"),
        ]);

        setUsage(usageRes);
        setGoals(goalsRes.goals || []);
        setExecutions(execRes.executions || []);
      } catch (err) {
        alert("Admin access only");
      } finally {
        setLoading(false);
      }
    }
    loadAdminData();
  }, []);

  async function deleteGoal(id) {
    if (!window.confirm("Delete this goal?")) return;
    await apiFetch(`/admin/goals/${id}`, { method: "DELETE" });
    setGoals((prev) => prev.filter((g) => g.id !== id));
  }

  async function rerunExecution(id) {
    await apiFetch(`/admin/executions/${id}/rerun`, { method: "POST" });
    alert(`Execution ${id} rerun started`);
  }

  async function changeSubscription(userId, tier) {
    await apiFetch(`/admin/users/${userId}/subscription`, {
      method: "POST",
      body: JSON.stringify({ tier }),
    });
    alert(`User ${userId} subscription updated to ${tier}`);
  }

  async function changeRole(userId, role) {
    await apiFetch(`/admin/users/${userId}/role`, {
      method: "POST",
      body: JSON.stringify({ role }),
    });
    alert(`User ${userId} role updated to ${role}`);
  }

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
                <th className="p-2 border">Actions</th>
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
                  <td className="p-2 border space-x-2">
                    <button
                      onClick={() => changeSubscription(u.id, "pro")}
                      className="px-2 py-1 bg-blue-600 text-white rounded"
                    >
                      Set Pro
                    </button>
                    <button
                      onClick={() => changeRole(u.id, "admin")}
                      className="px-2 py-1 bg-green-600 text-white rounded"
                    >
                      Make Admin
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Goals Overview */}
      <section>
        <h2 className="text-xl font-semibold mb-4">All Goals</h2>
        {goals.length === 0 ? (
          <p className="text-gray-500">No goals found</p>
        ) : (
          <table className="w-full border text-sm">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="p-2 border">ID</th>
                <th className="p-2 border">Title</th>
                <th className="p-2 border">Created</th>
                <th className="p-2 border">User</th>
                <th className="p-2 border">Actions</th>
              </tr>
            </thead>
            <tbody>
              {goals.map((g) => (
                <tr key={g.id}>
                  <td className="p-2 border">{g.id.slice(0, 8)}…</td>
                  <td className="p-2 border">
                    {g.goal_payload?.title || g.goal_payload?.message || "Untitled"}
                  </td>
                  <td className="p-2 border">
                    {new Date(g.created_at).toLocaleString()}
                  </td>
                  <td className="p-2 border">{g.user_email || g.user_id}</td>
                  <td className="p-2 border">
                    <button
                      onClick={() => deleteGoal(g.id)}
                      className="px-2 py-1 bg-red-600 text-white rounded"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

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
                  <td className="p-2 border">
                    <button
                      onClick={() => rerunExecution(e.id)}
                      className="px-2 py-1 bg-yellow-600 text-white rounded"
                    >
                      Rerun
                    </button>
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