import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch("/admin/usage")
      .then(setData)
      .catch(() => alert("Admin access only"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div>Loading admin dashboard…</div>;

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">
        Admin Usage – {data.month}
      </h1>

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
          {data.users.map((u) => (
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
    </div>
  );
}
