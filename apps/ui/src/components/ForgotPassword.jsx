import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const { addToast } = useToast();

  async function handleForgotPassword(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      });

      if (!res?.message) {
        throw new Error("Unexpected response from server");
      }

      addToast(res.message || "Password reset email sent", "success");
    } catch (err) {
      console.error("Forgot password error:", err);
      addToast(err.message || "Failed to send reset email", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-4">
      <form
        onSubmit={handleForgotPassword}
        className="w-half max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 space-y-6"
      >
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold">Reset your password</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Enter your email to receive reset instructions
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
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Sending reset link…" : "Send Reset Link"}
        </button>

        <div className="flex items-center gap-3 text-gray-400 text-sm">
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
          or
          <div className="flex-1 h-px bg-gray-300 dark:bg-gray-700" />
        </div>

        <div className="text-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Remembered your password?
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