import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/utils";

export default function Audit() {
  const { executionId } = useParams();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/api/executions/${executionId}/audit`)
      .then((data) => setLogs(data.logs || []))
      .catch((err) => {
        console.error("Audit fetch failed:", err);
        setLogs([]);
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

  if (!logs || logs.length === 0) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center font-mono text-red-500 text-xs tracking-[0.5em]">
        AUDIT TRACE NOT FOUND
      </div>
    );
  }

  // Try to extract a summary from the logs
  const first = logs[0];
  const last = logs[logs.length - 1];
  const finalStatus = last?.status || "unknown";

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
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
                  finalStatus === "completed"
                    ? "text-green-400"
                    : finalStatus === "failed"
                    ? "text-red-400"
                    : "text-yellow-400"
                }`}
              >
                {finalStatus}
              </p>
            </div>
            <div className="bg-slate-900/50 p-4 border border-white/5 rounded-xl">
              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">
                Audit Events
              </p>
              <p className="text-sm font-black text-white">
                {logs.length}
              </p>
            </div>
          </div>
        </header>

        {/* Audit Timeline */}
        <section>
          <h2 className="text-lg font-bold mb-2">Audit Timeline</h2>
          <ul className="bg-slate-900/40 rounded p-4 space-y-2">
            {logs.map((log) => (
              <li key={log.id} className="text-xs">
                <span className="font-bold">{log.status}</span>
                {" – "}
                {formatDate(log.created_at)}
                {log.meta && (
                  <>
                    {" | "}
                    <span className="text-slate-400">{typeof log.meta === "string" ? log.meta : JSON.stringify(log.meta)}</span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}