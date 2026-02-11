import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import { useAuth } from "../context/AuthProvider";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // ✅ toggle state
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

      localStorage.setItem("token", res.token);

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
        className="w-half max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 space-y-6"
      >
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold">Sign in to Nexus Core</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Continue building intelligent workflows
          </p>
        </div>

        {/* Centered input fields */}
        <div className="space-y-4">
          <input
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-500"
            required
          />

          <div className="relative">
            <input
              type={showPassword ? "text" : "password"} // ✅ toggle type
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 pr-12 border rounded-lg focus:outline-none focus:ring focus:ring-blue-500"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-sm text-blue-600 hover:underline focus:outline-none"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        <div className="text-center">
          <Link
            to="/forgot-password"
            className="text-sm text-blue-600 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        {/* Centered sign-in button */}
        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Signing in…" : "Sign In"}
        </button>

        <div className="flex items-center gap-3 text-gray-400 text-sm">
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
          or
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
        </div>

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