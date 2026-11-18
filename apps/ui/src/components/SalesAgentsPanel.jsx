import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function SalesAgentsPanel() {
  const [config,setConfig]=useState(null), [runs,setRuns]=useState([]), [selected,setSelected]=useState(null);
  const [events,setEvents]=useState([]), [busy,setBusy]=useState(false), [error,setError]=useState("");
  const [form,setForm]=useState({market:"",geography:"",ideal_customer:"",objective:"Find and qualify potential customers for Nexus Core",max_leads:10});
  async function refresh(){
    try {
      const [s,r]=await Promise.all([apiFetch("/admin/sales-agents/status"),apiFetch("/admin/sales-agents/runs")]);
      setConfig(s); setRuns(r.runs||[]);
      if(selected){const d=await apiFetch(`/admin/sales-agents/runs/${selected}`);setEvents(d.events||[]);}
    } catch(e){setError(e.message||"Could not load agent status.");}
  }
  useEffect(()=>{refresh();const t=setInterval(refresh,5000);return()=>clearInterval(t);},[selected]);
  async function start(e){
    e.preventDefault();setBusy(true);setError("");
    try {const r=await apiFetch("/admin/sales-agents/runs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});
      setSelected(r.run_id);await refresh();
    } catch(err){setError(err.message||"Could not start workflow.");} finally{setBusy(false);}
  }
  return <section className="rounded-2xl border border-red-500/20 bg-slate-900/60 p-5 space-y-5">
    <div><p className="text-[10px] uppercase tracking-[.25em] text-red-400 font-black">Autonomous agent workflow</p>
      <h2 className="text-2xl font-black text-white mt-1">AI Sales Research & Acquisition</h2>
      <p className="text-xs text-slate-400 mt-1">Researches markets, discovers real companies, enriches and scores leads, then prepares evidence-based sales actions.</p></div>
    {error&&<p className="text-xs text-red-300">{error}</p>}
    <div className="flex flex-wrap gap-2 text-[10px]">
      <span className={`rounded-lg px-3 py-2 ${config?.ai_configured?"bg-green-500/10 text-green-300":"bg-amber-500/10 text-amber-300"}`}>AI {config?.ai_configured?"configured":"API key required"}</span>
      <span className={`rounded-lg px-3 py-2 ${config?.search_configured?"bg-green-500/10 text-green-300":"bg-amber-500/10 text-amber-300"}`}>Web research {config?.search_configured?"configured":"search key required"}</span>
    </div>
    <form onSubmit={start} className="grid md:grid-cols-2 gap-3">
      <label className="text-[10px] text-slate-400">Target market / industry *<input required className="field" value={form.market} onChange={e=>setForm({...form,market:e.target.value})} placeholder="e.g. customer support software buyers"/></label>
      <label className="text-[10px] text-slate-400">Geography<input className="field" value={form.geography} onChange={e=>setForm({...form,geography:e.target.value})} placeholder="e.g. Kenya, East Africa, United States"/></label>
      <label className="text-[10px] text-slate-400">Ideal customer profile<input className="field" value={form.ideal_customer} onChange={e=>setForm({...form,ideal_customer:e.target.value})} placeholder="Company size, sector, buyer needs"/></label>
      <label className="text-[10px] text-slate-400">Maximum prospects<select className="field" value={form.max_leads} onChange={e=>setForm({...form,max_leads:Number(e.target.value)})}>{[5,10,20,30,50].map(n=><option key={n}>{n}</option>)}</select></label>
      <label className="text-[10px] text-slate-400 md:col-span-2">Product / research objective<textarea className="field min-h-16" value={form.objective} onChange={e=>setForm({...form,objective:e.target.value})}/></label>
      <div className="md:col-span-2"><button disabled={busy||!config?.ai_configured||!config?.search_configured} className="rounded-xl bg-red-600 px-5 py-3 text-xs font-black text-white disabled:opacity-40">{busy?"Starting…":"Run autonomous sales workflow"}</button></div>
    </form>
    <div className="grid md:grid-cols-2 gap-4">
      <div><h3 className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Workflow runs</h3>
        {runs.length?runs.map(r=><button key={r.id} onClick={()=>setSelected(r.id)} className={`w-full text-left rounded-xl border p-3 mb-2 ${selected===r.id?"border-red-500/50 bg-red-500/5":"border-white/10 bg-black/10"}`}><span className="text-xs text-white font-bold">{r.market}</span><span className="float-right text-[9px] uppercase text-slate-400">{r.status}</span><p className="text-[10px] text-slate-500 mt-1">{new Date(r.created_at).toLocaleString()}</p>{r.error&&<p className="text-[10px] text-red-300 mt-1">{r.error}</p>}</button>):<p className="text-xs text-slate-600">No agent runs yet.</p>}
      </div>
      <div><h3 className="text-[10px] uppercase tracking-widest text-slate-400 mb-2">Agent activity</h3>
        <div className="max-h-72 overflow-auto space-y-2">{events.length?events.map((ev,i)=><div key={i} className="rounded-lg bg-black/20 p-3"><p className="text-[10px] text-red-300 font-bold">{ev.agent} · {ev.event_type}</p><p className="text-xs text-slate-300 mt-1">{ev.message}</p></div>):<p className="text-xs text-slate-600">Select a run to inspect agent activity.</p>}</div>
      </div>
    </div>
    <p className="text-[10px] text-slate-500">Outreach is draft-only. No email, message, or external communication is sent without a separately authorized sending workflow.</p>
  </section>;
}
