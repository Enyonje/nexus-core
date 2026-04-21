import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { motion } from "framer-motion";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/utils";

export default function AuditPage() {
  const { executionId } = useParams();
  const [auditData, setAuditData] = useState(null);
  const [activeTab, setActiveTab] = useState("logic"); // logic | contracts | messages
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAudit() {
      try {
        const data = await apiFetch(`/audit/${executionId}`);
        setAuditData(data);
      } catch (err) {
        console.error("Audit fetch failed", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAudit();
  }, [executionId]);

  if (loading) return <AuditLoader />;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 font-sans p-6 md:p-12 relative">
      {/* Aesthetic Grid Overlay */}
      <div className="fixed inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 pointer-events-none" />
      
      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header Section */}
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <div className="px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[8px] font-black uppercase tracking-widest">
                Post-Execution Forensic
              </div>
              <span className="text-[10px] font-mono text-slate-600">ID: {executionId}</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">
              Swarm <span className="text-indigo-500 italic">Audit</span>
            </h1>
          </div>

          <div className="flex bg-slate-900/40 p-1 rounded-2xl border border-white/5 backdrop-blur-xl">
            {["logic", "contracts", "messages"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                  activeTab === tab 
                    ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40" 
                    : "text-slate-500 hover:text-slate-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </header>

        {/* Content Area */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="min-h-[60vh]"
        >
          {activeTab === "logic" && <LogicTimeline steps={auditData?.steps} />}
          {activeTab === "contracts" && <ContractGrid contracts={auditData?.contracts} />}
          {activeTab === "messages" && <MessageTrace messages={auditData?.messages} />}
        </motion.div>
      </div>
    </div>
  );
}

// --- Sub-Components ---

function LogicTimeline({ steps }) {
  return (
    <div className="space-y-6">
      {steps?.map((step, i) => (
        <div key={i} className="group relative pl-8 border-l border-slate-800 hover:border-indigo-500/50 transition-colors">
          <div className="absolute -left-1.5 top-0 w-3 h-3 rounded-full bg-slate-800 border border-slate-700 group-hover:bg-indigo-500 transition-colors" />
          <div className="bg-slate-900/20 border border-white/5 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex justify-between items-start mb-4">
              <div>
                <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{step.step_type}</span>
                <h4 className="text-white font-bold mt-1 uppercase text-sm">{step.status}</h4>
              </div>
              <span className="text-[10px] font-mono text-slate-600">{formatDate(step.created_at)}</span>
            </div>
            <div className="space-y-4">
              <div className="bg-black/40 rounded-xl p-4 border border-white/5">
                <p className="text-[9px] font-black text-slate-500 uppercase mb-2 tracking-widest">Reasoning Engine</p>
                <p className="text-xs text-slate-300 italic leading-relaxed">"{step.reasoning}"</p>
              </div>
              {step.output && (
                <div className="bg-indigo-500/5 rounded-xl p-4 border border-indigo-500/10">
                  <p className="text-[9px] font-black text-indigo-400 uppercase mb-2 tracking-widest">Output Data</p>
                  <pre className="text-[11px] font-mono text-indigo-200 overflow-x-auto">{JSON.stringify(step.output, null, 2)}</pre>
                </div>
              )}
              {step.error && (
                <div className="bg-red-500/5 rounded-xl p-4 border border-red-500/10">
                  <p className="text-[9px] font-black text-red-500 uppercase mb-2 tracking-widest">System Exception</p>
                  <p className="text-xs font-mono text-red-400">{step.error}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function ContractGrid({ contracts }) {
  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {contracts?.map((c, i) => (
        <div key={i} className="bg-slate-900/40 border border-white/5 p-6 rounded-[2rem] hover:border-indigo-500/30 transition-all">
          <div className="flex justify-between items-start mb-6">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              <span className="text-indigo-400 text-xs">§</span>
            </div>
            <span className={`text-[8px] font-black uppercase px-2 py-1 rounded ${c.status === 'fulfilled' ? 'bg-green-500/10 text-green-400' : 'bg-orange-500/10 text-orange-400'}`}>
              {c.status || 'Active'}
            </span>
          </div>
          <h3 className="text-white font-black text-sm uppercase tracking-tight mb-2">Agent Agreement</h3>
          <p className="text-[10px] text-slate-500 font-mono mb-4">UID: {c.id?.substring(0, 8)}</p>
          <div className="space-y-2 border-t border-white/5 pt-4">
            <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest">
              <span className="text-slate-600">Terms:</span>
              <span className="text-slate-400 italic">Self-Executing</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MessageTrace({ messages }) {
  return (
    <div className="bg-black/20 rounded-[2rem] border border-white/5 overflow-hidden font-mono">
      <table className="w-full text-left text-xs border-collapse">
        <thead>
          <tr className="bg-white/5 text-slate-500 uppercase text-[9px] font-black tracking-widest">
            <th className="p-4">Timestamp</th>
            <th className="p-4">Contract Link</th>
            <th className="p-4">Payload</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-white/5">
          {messages?.map((m, i) => (
            <tr key={i} className="hover:bg-indigo-500/5 transition-colors">
              <td className="p-4 text-slate-500">{formatDate(m.created_at)}</td>
              <td className="p-4 text-indigo-400">#CON-{m.contract_id?.substring(0,6)}</td>
              <td className="p-4 text-slate-300 max-w-md truncate">{m.content || JSON.stringify(m.payload)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AuditLoader() {
  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center">
      <div className="text-center space-y-4">
        <div className="w-12 h-12 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.4em]">Decrypting Ledger...</p>
      </div>
    </div>
  );
}