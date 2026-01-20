import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { addToast } = useToast();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });
      setSuccess(true);
      addToast("Password reset successful!", "success");
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      addToast(err.message || "Failed to reset password", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!token) return <div className="max-w-sm mx-auto mt-16 p-6">Missing or invalid reset token.</div>;

  return (
    <form onSubmit={handleSubmit} className="max-w-sm mx-auto mt-16 p-6 bg-white dark:bg-gray-900 rounded shadow space-y-4">
      <h2 className="text-xl font-bold mb-2">Reset Password</h2>
      <input
        type="password"
        placeholder="New Password"
        value={password}
        onChange={e => setPassword(e.target.value)}
        className="w-full p-2 border rounded"
        required
      />
      <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded" disabled={loading}>
        {loading ? "Resetting..." : "Reset Password"}
      </button>
      {success && <div className="text-green-600 mt-2">Password reset! Redirecting…</div>}
    </form>
  );
}
