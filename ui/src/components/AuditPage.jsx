import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/utils";

export default function AuditPage() {
  const { executionId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // ✅ Correct backend path
    apiFetch(`/api/executions/${executionId}/audit`)
      .then(setData)
      .catch((err) => {
        console.error("Audit fetch failed:", err);
        setData(null);
      })
      .finally(() => setLoading(false));
  }, [executionId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center font-mono text-blue-500 text-xs tracking-[0.5em]">
        DECRYPTING AUDIT LOGS...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center font-mono text-red-500 text-xs tracking-[0.5em]">
        AUDIT TRACE NOT FOUND
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header / Summary Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
          <div>
            <Link
              to="/dashboard"
              className="text-[10px] text-blue-400 hover:underline mb-4 block uppercase font-black"
            >
              ← Return to Command Center
            </Link>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
              Mission <span className="text-blue-500">Audit</span>
            </h1>
            <p className="text-xs text-slate-500 font-mono mt-2">
              UUID: {executionId}
            </p>
          </div>

          <div className="flex gap-4">
            <div className="bg-slate-900/50 p-4 border border-white/5 rounded-xl">
              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">
                Final Status
              </p>
              <p
                className={`text-sm font-black uppercase ${
                  data.summary.status === "completed"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {data.summary.status}
              </p>
            </div>
            <div className="bg-slate-900/50 p-4 border border-white/5 rounded-xl">
              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">
                Nodes Engaged
              </p>
              <p className="text-sm font-black text-white">
                {data.contracts.length} Agents
              </p>
            </div>
          </div>
        </header>

        {/* Execution Timeline and Sidebar */}
        {/* ... keep your existing JSX for steps, contracts, and messages ... */}
      </div>
    </div>
  );
}
