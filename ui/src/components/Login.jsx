import { useState } from "react";
import { Link } from "react-router-dom";
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

      // Persist token immediately
      localStorage.setItem("token", res.token);

      // Let AuthProvider handle session + redirects
      login({
        user: res.user,
        token: res.token,
      });

      addToast("Welcome back 👋", "success");
    } catch (err) {
      console.error("Login error:", err);
      addToast(err.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-4">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 space-y-5"
      >
        {/* Header */}
        <div className="text-center">
          <h2 className="text-2xl font-bold">Sign in to Nexus Core</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Continue building intelligent workflows
          </p>
        </div>

        {/* Email */}
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-500"
          required
        />

        {/* Password */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 border rounded-lg focus:outline-none focus:ring focus:ring-blue-500"
          required
        />

        {/* Forgot password */}
        <div className="text-right">
          <Link
            to="/forgot-password"
            className="text-sm text-blue-600 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-medium transition disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 text-gray-400 text-sm">
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
          or
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
        </div>

        {/* Signup CTA */}
        <div className="text-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Don’t have an account?
          </span>{" "}
          <Link
            to="/register"
            className="font-medium text-blue-600 hover:underline"
          >
            Create one →
          </Link>
        </div>
      </form>
    </div>
  );
}
