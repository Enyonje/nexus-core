import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

export default function SalesAgentsPanel() {
  const [config,setConfig]=useState(null), [runs,setRuns]=useState([]), [selected,setSelected]=useState(null);
  const [events,setEvents]=useState([]), [followups,setFollowups]=useState([]), [drafts,setDrafts]=useState([]), [replies,setReplies]=useState([]), [busy,setBusy]=useState(false), [error,setError]=useState(""), [auto,setAuto]=useState({enabled:false,market:"",geography:"",ideal_customer:"",objective:"Find and qualify potential business customers for Nexus Core",max_leads:10,interval_hours:24}), [autoBusy,setAutoBusy]=useState(false);
  const [form,setForm]=useState({market:"",geography:"",ideal_customer:"",objective:"Find and qualify potential customers for Nexus Core",max_leads:10});
  async function refresh(){
    try {
      const [s,r,a,f,d,rep]=await Promise.all([apiFetch("/admin/sales-agents/status"),apiFetch("/admin/sales-agents/runs"),apiFetch("/admin/sales-agents/autopilot"),apiFetch("/admin/sales-agents/followups"),apiFetch("/admin/sales-agents/outreach"),apiFetch("/admin/sales-agents/replies")]);
      setConfig(s); setRuns(r.runs||[]); setFollowups(f.followups||[]); setDrafts(d.drafts||[]); setReplies(rep.replies||[]); if(a.config) setAuto(a.config);
      if(selected){const d=await apiFetch(`/admin/sales-agents/runs/${selected}`);setEvents(d.events||[]);}
    } catch(e){setError(e.message||"Could not load agent status.");}
  }
  useEffect(()=>{refresh();const t=setInterval(refresh,5000);return()=>clearInterval(t);},[selected]);
  async function saveAutopilot(e){
    e.preventDefault(); setAutoBusy(true); setError("");
    try { const r=await apiFetch("/admin/sales-agents/autopilot",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(auto)}); setAuto(r.config); await refresh(); }
    catch(err){setError(err.message||"Could not save autopilot settings.");} finally{setAutoBusy(false);}
  }
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
    <form onSubmit={saveAutopilot} className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-4 space-y-3">
      <div className="flex items-center justify-between"><div><h3 className="text-sm font-black text-white">Autopilot · persistent background research</h3><p className="text-[10px] text-slate-400">Save your target once. The server will launch scheduled runs without a manual click.</p></div><span className={`text-[10px] font-bold ${auto.enabled?"text-emerald-300":"text-amber-300"}`}>{auto.enabled?"AUTOPILOT ON":"AUTOPILOT OFF"}</span></div>
      <div className="grid md:grid-cols-2 gap-3">
        <label className="text-[10px] text-slate-400">Target market *<input required className="field" value={auto.market||""} onChange={e=>setAuto({...auto,market:e.target.value})} placeholder="e.g. SMEs needing customer support automation"/></label>
        <label className="text-[10px] text-slate-400">Geography<input className="field" value={auto.geography||""} onChange={e=>setAuto({...auto,geography:e.target.value})} placeholder="Kenya, East Africa, global"/></label>
        <label className="text-[10px] text-slate-400">Ideal customer profile<input className="field" value={auto.ideal_customer||""} onChange={e=>setAuto({...auto,ideal_customer:e.target.value})} placeholder="Company size, sector, buyer problems"/></label>
        <label className="text-[10px] text-slate-400">Run frequency<select className="field" value={auto.interval_hours||12} onChange={e=>setAuto({...auto,interval_hours:Number(e.target.value)})}>{[1,2,4,6,8,12,24,48,72,168].map(n=><option key={n} value={n}>{n<24?`${n} hour${n===1?"":"s"}`:n===168?"Weekly":`${n} hours`}</option>)}</select></label>
        <label className="text-[10px] text-slate-400">Maximum leads per run<select className="field" value={auto.max_leads||10} onChange={e=>setAuto({...auto,max_leads:Number(e.target.value)})}>{[5,10,20,30,50].map(n=><option key={n} value={n}>{n}</option>)}</select></label>
        <label className="text-[10px] text-slate-400">Workflow objective<input className="field" value={auto.objective||""} onChange={e=>setAuto({...auto,objective:e.target.value})}/></label>
      </div>
      <div className="flex flex-wrap gap-2"><button type="submit" disabled={autoBusy||!config?.ai_configured||!config?.search_configured} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-black text-white disabled:opacity-40">{autoBusy?"Saving…":"Save autopilot settings"}</button><button type="button" disabled={autoBusy||(!auto.enabled&&!String(auto.market||"").trim())||!config?.ai_configured||!config?.search_configured} onClick={async()=>{setAutoBusy(true);setError("");try{const next={...auto,enabled:!auto.enabled};const r=await apiFetch("/admin/sales-agents/autopilot",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(next)});setAuto(r.config);await refresh();}catch(err){setError(err.message||"Could not change autopilot state.");}finally{setAutoBusy(false);}}} className={`rounded-lg px-4 py-2 text-xs font-black ${auto.enabled?"bg-amber-600":"bg-emerald-700"} text-white`}>{auto.enabled?"Turn autopilot off":"Turn autopilot on"}</button><span className="self-center text-[10px] text-slate-500">Runs automatically on the server at the selected interval.</span></div>
    </form>
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
    <div className="grid lg:grid-cols-3 gap-3">
      <div className="rounded-xl border border-white/10 p-3"><h3 className="text-xs font-bold text-white mb-2">Follow-up queue</h3>{followups.slice(0,8).map(f=><div key={f.id} className="border-t border-white/5 py-2"><p className="text-[11px] text-slate-200">{f.company||f.title}</p><p className="text-[10px] text-slate-500">{f.title} · {new Date(f.due_at).toLocaleDateString()} · {f.status}</p>{f.status==='pending'&&<button onClick={async()=>{await apiFetch(`/admin/sales-agents/followups/${f.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'completed'})});refresh();}} className="text-[10px] text-emerald-300">Mark complete</button>}</div>)}{!followups.length&&<p className="text-[10px] text-slate-500">No scheduled follow-ups.</p>}</div>
      <div className="rounded-xl border border-white/10 p-3"><h3 className="text-xs font-bold text-white mb-2">Outreach approvals</h3>{drafts.slice(0,8).map(d=><div key={d.id} className="border-t border-white/5 py-2"><p className="text-[11px] text-slate-200">{d.company} · {d.status}</p><p className="text-[10px] text-slate-500">{d.subject}</p>{d.status==='pending'&&<div className="flex gap-3"><button onClick={async()=>{await apiFetch(`/admin/sales-agents/outreach/${d.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'approved'})});refresh();}} className="text-[10px] text-emerald-300">Approve</button><button onClick={async()=>{await apiFetch(`/admin/sales-agents/outreach/${d.id}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'rejected'})});refresh();}} className="text-[10px] text-red-300">Reject</button></div>}{d.status==='approved'&&<button onClick={async()=>{try{await apiFetch(`/admin/sales-agents/outreach/${d.id}/send`,{method:'POST'});refresh();}catch(e){setError(e.message);}}} className="text-[10px] text-amber-300">Send approved email</button>}</div>)}{!drafts.length&&<p className="text-[10px] text-slate-500">No outreach drafts.</p>}</div>
      <div className="rounded-xl border border-white/10 p-3"><h3 className="text-xs font-bold text-white mb-2">Inbound replies</h3>{replies.slice(0,8).map(r=><div key={r.id} className="border-t border-white/5 py-2"><p className="text-[11px] text-slate-200">{r.company||r.from_email} · {r.classification}</p><p className="text-[10px] text-slate-500">{r.subject||r.body.slice(0,100)}</p></div>)}{!replies.length&&<p className="text-[10px] text-slate-500">No inbound replies received.</p>}</div>
    </div>
    <p className="text-[10px] text-slate-500">Email sending requires an administrator to approve each draft. Reply ingestion requires an inbound-email provider webhook configured with SALES_INBOUND_WEBHOOK_SECRET.</p>
  </section>;
}
