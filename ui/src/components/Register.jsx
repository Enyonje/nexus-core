import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import { useAuth } from "../context/AuthProvider";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const { addToast } = useToast();
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      if (!res?.token || !res?.user) {
        throw new Error("Invalid register response");
      }

      // ✅ Store token consistently
      localStorage.setItem("authToken", res.token);
      localStorage.setItem("user", JSON.stringify(res.user));

      // Update auth context
      login({
        user: res.user,
        token: res.token,
      });

      addToast("Account created 🎉", "success");
      navigate("/"); // redirect to home/dashboard
    } catch (err) {
      console.error("Register error:", err);
      addToast(err.message || "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-4">
      <form
        onSubmit={handleRegister}
        className="w-half max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 space-y-6"
      >
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold">Create your Nexus Core account</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Start building intelligent workflows
          </p>
        </div>

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
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 pr-10 border rounded-lg focus:outline-none focus:ring focus:ring-blue-500"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-3 flex items-center text-gray-500 hover:text-blue-600 focus:outline-none"
            >
              {showPassword ? (
                // Eye open icon
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              ) : (
                // Eye closed icon
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13.875 18.825A10.05 10.05 0 0112 19c-5.523 0-10-4.477-10-10
                       0-1.05.162-2.06.462-3.002m3.05-3.05A9.956 9.956 0 0112 3
                       c5.523 0 10 4.477 10 10 0 1.05-.162 2.06-.462 3.002m-3.05
                       3.05A9.956 9.956 0 0112 21c-5.523 0-10-4.477-10-10"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 3l18 18"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Creating account…" : "Register"}
        </button>

        <div className="flex items-center gap-3 text-gray-400 text-sm">
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
          or
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
        </div>

        <div className="text-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Already have an account?
          </span>{" "}
          <Link
            to="/login"
            className="font-medium text-blue-600 hover:underline"
          >
            Sign in →
          </Link>
        </div>
      </form>
    </div>
  );
}