import { useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useToast } from "./ToastContext.jsx";
import { useAuth } from "../context/AuthProvider";

export default function Register() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState(""); // ✅ new field for organization name
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const { login } = useAuth();

  async function handleRegister(e) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiFetch("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email,
          password,
          orgName, // ✅ send org name so backend can generate org_id
        }),
      });

      if (!res.token || !res.user) {
        throw new Error("Invalid registration response");
      }

      addToast("Registration successful!", "success");
      login({ ...res.user, token: res.token });
    } catch (err) {
      addToast(err.message || "Registration failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-4">
      <form
        onSubmit={handleRegister}
        className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-lg p-8 space-y-6"
      >
        <div className="text-center space-y-1">
          <h2 className="text-2xl font-bold">Create your account</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Start building with Nexus Core
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
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-500"
            required
          />
          <input
            type="text"
            placeholder="Organization name"
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring focus:ring-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-medium transition disabled:opacity-60"
          disabled={loading}
        >
          {loading ? "Signing up…" : "Sign Up"}
        </button>

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