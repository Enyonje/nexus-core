import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/utils";
import { useAuth } from "../context/AuthProvider";

export default function Dashboard() {
  // 1. Pull initializing from AuthProvider to prevent premature fetches
  const { subscription, initializing } = useAuth();
  const [executions, setExecutions] = useState([]);
  const [goals, setGoals] = useState([]);
  const [health, setHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 🛡️ THE GUARD: If auth isn't resolved yet, do NOT trigger API calls
    if (initializing) return;

    const synchronizeNeuralCore = async () => {
      try {
        const [healthRes, goalsRes, execs] = await Promise.all([
          apiFetch("/health"),
          apiFetch("/goals").catch(() => []),
          subscription !== "free" ? apiFetch("/executions").catch(() => []) : [],
        ]);
        
        setHealth(healthRes);
        setGoals(goalsRes || []);
        setExecutions(execs || []);
      } catch (err) {
        console.error("Dashboard Sync Failed:", err.message);
      } finally {
        setLoading(false);
      }
    };

    synchronizeNeuralCore();
  }, [subscription, initializing]); // Re-run when initializing flips to false

  // 2. Show a clean loading state while auth or data is fetching
  if (initializing || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#020617]">
        <div className="animate-pulse text-blue-500 font-mono tracking-widest uppercase text-sm">
          {initializing ? "Authenticating Session..." : "Synchronizing Neural Workspace..."}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 py-12 px-6 relative overflow-hidden">
      {/* ... (Your UI code remains the same) ... */}
    </div>
  );
}