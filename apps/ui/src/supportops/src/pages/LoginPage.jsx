import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function handleLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const user = await login({ email, password });

      const role = user?.role || "agent";
      switch (role) {
        case "agent":
          navigate("/agent/dashboard");
          break;
        case "admin":
        case "management":
          navigate("/admin/executive");
          break;
        case "investor":
          navigate("/investor");
          break;
        default:
          navigate("/agent/dashboard");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(err?.response?.data?.detail || err.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#020617] px-6">
      <form
        onSubmit={handleLogin}
        className="w-full max-w-sm space-y-6 bg-white/5 border border-white/10 rounded-2xl p-8 backdrop-blur-xl"
      >
        <h1 className="text-2xl font-bold text-white text-center">Login</h1>

        <div className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            required
            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-[#0B1220] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            className="w-full px-3 py-2 rounded-lg border border-white/10 bg-[#0B1220] text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-600"
          />
        </div>

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Login"}
        </button>

        {/* ✅ Signup link */}
        <p className="text-center text-sm text-white/70">
          Don’t have an account?{" "}
          <Link to="/signup" className="text-blue-400 hover:underline font-medium">
            Sign up
          </Link>
        </p>
      </form>
    </div>
  );
}