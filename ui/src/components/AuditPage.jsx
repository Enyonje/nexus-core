import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { formatDate } from "../lib/utils";

export default function AuditPage() {
  const { executionId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch(`/audit/${executionId}`)
      .then(setData)
      .finally(() => setLoading(false));
  }, [executionId]);

  if (loading) return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center font-mono text-blue-500 text-xs tracking-[0.5em]">
      DECRYPTING AUDIT LOGS...
    </div>
  );

  return (
    <div className="min-h-screen bg-[#020617] text-slate-300 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header / Summary Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-white/5 pb-8">
          <div>
            <Link to="/dashboard" className="text-[10px] text-blue-400 hover:underline mb-4 block uppercase font-black">← Return to Command Center</Link>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase">Mission <span className="text-blue-500">Audit</span></h1>
            <p className="text-xs text-slate-500 font-mono mt-2">UUID: {executionId}</p>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-slate-900/50 p-4 border border-white/5 rounded-xl">
              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Final Status</p>
              <p className={`text-sm font-black uppercase ${data.summary.status === 'completed' ? 'text-green-400' : 'text-red-400'}`}>
                {data.summary.status}
              </p>
            </div>
            <div className="bg-slate-900/50 p-4 border border-white/5 rounded-xl">
              <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-1">Nodes Engaged</p>
              <p className="text-sm font-black text-white">{data.contracts.length} Agents</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Main Execution Timeline */}
          <section className="lg:col-span-8 space-y-6">
            <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">Execution Sequence</h3>
            {data.steps.map((step, idx) => (
              <div key={step.id} className="relative pl-8 border-l border-white/10 group">
                {/* Timeline Dot */}
                <div className={`absolute -left-[5px] top-0 w-2.5 h-2.5 rounded-full border-2 border-[#020617] 
                  ${step.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`} />
                
                <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-6 hover:border-blue-500/20 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-[10px] font-mono text-blue-400 font-bold uppercase">{step.step_type}</span>
                    <span className="text-[10px] font-mono text-slate-600">{formatDate(step.created_at)}</span>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <p className="text-[9px] text-slate-500 uppercase font-black mb-1">Reasoning Engine</p>
                      <p className="text-sm text-slate-300 leading-relaxed italic">"{step.reasoning}"</p>
                    </div>
                    
                    {step.output && (
                      <div className="bg-black/40 p-4 rounded-lg font-mono text-xs overflow-x-auto border border-white/5">
                        <p className="text-blue-500/50 mb-2">// Output Trace</p>
                        <pre className="text-slate-400">{JSON.stringify(step.output, null, 2)}</pre>
                      </div>
                    )}

                    {step.error && (
                      <div className="bg-red-500/10 p-4 rounded-lg font-mono text-xs border border-red-500/20">
                        <p className="text-red-400 font-bold mb-1 uppercase">Exception Detected</p>
                        <p className="text-red-300/80">{step.error}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </section>

          {/* Sidebar: Agent Contracts & Inter-Agent Messages */}
          <aside className="lg:col-span-4 space-y-8">
            <div>
              <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4">Agent Contracts</h3>
              <div className="space-y-3">
                {data.contracts.map(contract => (
                  <div key={contract.id} className="bg-slate-900/60 border border-white/5 p-4 rounded-xl">
                    <p className="text-[10px] font-bold text-white uppercase">{contract.role}</p>
                    <p className="text-[9px] text-slate-500 mt-1">{contract.task_description}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full ${contract.status === 'fulfilled' ? 'bg-green-500' : 'bg-amber-500'}`} />
                      <span className="text-[8px] font-black uppercase text-slate-400">{contract.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4">Neural Comms</h3>
              <div className="bg-black/40 rounded-xl p-4 border border-white/5 max-h-[400px] overflow-y-auto space-y-4 custom-scrollbar">
                {data.messages.length === 0 && <p className="text-center py-8 text-[9px] text-slate-700 uppercase">No inter-agent chatter recorded.</p>}
                {data.messages.map(msg => (
                  <div key={msg.id} className="space-y-1">
                    <p className="text-[8px] font-black text-blue-500 uppercase tracking-tighter">{msg.sender_role}</p>
                    <p className="text-[11px] text-slate-400 bg-white/5 p-2 rounded-lg border-l-2 border-blue-500/30">
                      {msg.content}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}