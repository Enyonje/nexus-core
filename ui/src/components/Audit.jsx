import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/utils";

export default function Audit() {
  const { executionId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
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

  if (!data || !data.summary) {
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
                {data.contracts?.length || 0} Agents
              </p>
            </div>
          </div>
        </header>

        {/* Audit Import Button */}
        <div className="flex justify-end">
          <Link
            to={`/audit/import/${executionId}`}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded transition"
            aria-label="Import Audit"
          >
            Import Audit
          </Link>
        </div>

        {/* Execution Timeline */}
        <section>
          <h2 className="text-lg font-bold mb-2">Execution Steps</h2>
          <ul className="bg-slate-900/40 rounded p-4 space-y-2">
            {data.steps?.map((s) => (
              <li key={s.id} className="text-xs">
                <span className="font-bold">{s.name}</span> – {s.status} at{" "}
                {formatDate(s.created_at || s.started_at)}
              </li>
            ))}
          </ul>
        </section>

        {/* Contracts */}
        <section>
          <h2 className="text-lg font-bold mb-2">Agent Contracts</h2>
          <ul className="bg-slate-900/40 rounded p-4 space-y-2">
            {data.contracts?.map((c) => (
              <li key={c.id} className="text-xs">
                Agent {c.agent_id} ({c.role}) – {c.status}
              </li>
            ))}
          </ul>
        </section>

        {/* Messages */}
        <section>
          <h2 className="text-lg font-bold mb-2">Inter-Agent Messages</h2>
          <ul className="bg-slate-900/40 rounded p-4 space-y-2">
            {data.messages?.map((m) => (
              <li key={m.id} className="text-xs">
                [{formatDate(m.created_at)}] {m.sender_role}: {m.content}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
