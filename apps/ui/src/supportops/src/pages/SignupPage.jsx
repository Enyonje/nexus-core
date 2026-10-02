import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { p } from "../config/paths";
import toast, { Toaster } from "react-hot-toast";

const inputClass =
  "w-full px-3 py-2 rounded-lg border border-white/10 bg-[#0B1220] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600";

function homeForRole(role) {
  switch (role) {
    case "admin":
    case "management":
      return p("/admin/executive");
    case "investor":
      return p("/investor");
    case "agent":
    default:
      return p("/agent/dashboard");
  }
}

export default function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("agent");
  const [accessCode, setAccessCode] = useState(""); // ✅ for admin/management
  const [loading, setLoading] = useState(false);

  async function handleSignup(e) {
    e.preventDefault();
    setLoading(true);

    try {
      // ✅ enforce access code for admin/management
      if ((role === "admin" || role === "management") && accessCode !== "SUPPORTOPS-STAFF-2026") {
        toast.error("Access code required for Admin/Management signup.");
        setLoading(false);
        return;
      }

      const user = await signup({ email, password, name, role });
      if (user) {
        toast.success("Signup successful! Redirecting...");
        setTimeout(() => {
          navigate(homeForRole(user?.role), { replace: true });
        }, 1200);
      }
    } catch (err) {
      console.error("Signup error:", err);
      toast.error(
        err?.response?.data?.detail ||
        err.message ||
        "Signup failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] px-6 relative">
      {loading && (
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        </div>
      )}

      <Toaster position="top-center" reverseOrder={false} />

      <form
        onSubmit={handleSignup}
        className="w-full max-w-sm space-y-6 bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl relative z-10"
      >
        <h1 className="text-2xl font-bold text-white text-center">Create Account</h1>

        <div className="space-y-4">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Full Name"
            required
            autoComplete="name"
            className={inputClass}
          />
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            autoComplete="email"
            className={inputClass}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete="new-password"
            className={inputClass}
          />

          {/* ✅ Role selector */}
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className={inputClass}
          >
            <option value="agent">Register as Agent</option>
            <option value="investor">Register as Investor</option>
            <option value="admin">Register as Admin (requires code)</option>
            <option value="management">Register as Management (requires code)</option>
          </select>

          {/* ✅ Access code field only shows for admin/management */}
          {(role === "admin" || role === "management") && (
            <input
              type="text"
              value={accessCode}
              onChange={(e) => setAccessCode(e.target.value)}
              placeholder="Staff Access Code"
              className={inputClass}
            />
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50"
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>

        <p className="text-center text-sm text-white/70">
          Already have an account?{" "}
          <Link to={p("/login")} className="text-blue-400 hover:underline font-medium">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
}
