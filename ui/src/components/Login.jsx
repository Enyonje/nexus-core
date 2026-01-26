import { useState } from "react";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import { useAuth } from "../context/AuthProvider";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const { addToast } = useToast();
  const { login } = useAuth();

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!res?.token || !res?.user) {
        throw new Error("Invalid login response");
      }

      // ✅ CRITICAL: persist token immediately
      localStorage.setItem("token", res.token);

      // ✅ Let AuthProvider handle user + subscription logic
      login({
        user: res.user,
        token: res.token,
      });

      addToast("Login successful!", "success");
    } catch (err) {
      console.error("Login error:", err);
      addToast(err.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form
      onSubmit={handleLogin}
      className="max-w-sm mx-auto mt-16 p-6 bg-white dark:bg-gray-900 rounded shadow space-y-4"
    >
      <h2 className="text-xl font-bold mb-2">Sign In</h2>

      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-2 border rounded"
        required
      />

      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-2 border rounded"
        required
      />

      <button
        type="submit"
        className="w-full bg-blue-600 text-white py-2 rounded disabled:opacity-60"
        disabled={loading}
      >
        {loading ? "Signing in..." : "Sign In"}
      </button>
    </form>
  );
}
