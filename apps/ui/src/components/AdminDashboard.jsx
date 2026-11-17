import { useCallback, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { apiFetch } from "../lib/api";
import { useAuth } from "../hooks/useAuth";
import { formatDate } from "../lib/utils";

const STAGES = ["new", "qualified", "demo", "proposal", "negotiation", "won", "lost"];
const TARGETS = [
  ["paying_customers", "Paying customers", 5],
  ["qualified_leads", "Qualified leads", 60],
  ["demos", "Demos completed", 15],
  ["proposals", "Proposals sent", 10],
  ["enterprise_opportunities", "Enterprise opportunities", 3],
];

const money = (cents, currency = "usd") => new Intl.NumberFormat("en-US", {
  style: "currency", currency: String(currency || "usd").toUpperCase(),
  maximumFractionDigits: 0
}).format(Number(cents || 0) / 100);

export default function AdminDashboard() {
  const { role, initializing } = useAuth();
  const [usage, setUsage] = useState(null);
  const [executions, setExecutions] = useState([]);
  const [summary, setSummary] = useState(null);
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "", company: "", email: "", phone: "", source: "",
    stage: "new", estimated_value: "", currency: "usd",
    is_enterprise: false, notes: ""
  });

  const load = useCallback(async () => {
    setError("");
    try {
      const [usageRes, execRes, summaryRes, leadsRes] = await Promise.all([
        apiFetch("/admin/usage"),
        apiFetch("/admin/executions"),
        apiFetch("/admin/sales/summary"),
        apiFetch("/admin/sales/leads")
      ]);
      setUsage(usageRes);
      setExecutions(execRes.executions || []);
      setSummary(summaryRes);
      setLeads(leadsRes.leads || []);
    } catch (err) {
      setError(err.message || "Unable to load administrator data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initializing || role !== "admin") return;
    load();
  }, [role, initializing, load]);

  async function createLead(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      await apiFetch("/admin/sales/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          estimated_value_cents: Math.round(Number(form.estimated_value || 0) * 100)
        })
      });
      setForm({
        name: "", company: "", email: "", phone: "", source: "",
        stage: "new", estimated_value: "", currency: "usd",
        is_enterprise: false, notes: ""
      });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err.message || "Could not save lead.");
    } finally {
      setSaving(false);
    }
  }

  async function updateStage(id, stage) {
    try {
      await apiFetch(`/admin/sales/leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stage })
      });
      await load();
    } catch (err) {
      setError(err.message || "Could not update lead stage.");
    }
  }

  if (initializing) return <LoadingState message="Verifying administrator credentials..." />;
  if (role !== "admin") return <Navigate to="/dashboard" replace />;
  if (loading) return <LoadingState message="Loading command centre..." />;

  const actual = summary?.actual || {};
  const revenue = summary?.collected_revenue || [];
  const usdRevenue = revenue.find((r) => r.currency.toLowerCase() === "usd");
  const visibleLeads = stageFilter === "all" ? leads : leads.filter((l) => l.stage === stageFilter);

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-10">
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-5 border-b border-white/10 pb-7">
          <div>
            <p className="text-red-400 text-[10px] font-black uppercase tracking-[0.3em]">Nexus Core · Administration</p>
            <h1 className="text-4xl md:text-5xl font-black tracking-tight text-white mt-2">Sales <span className="text-red-500">Command Centre</span></h1>
            <p className="text-slate-500 text-xs mt-2">30-day acquisition targets · Persistent sales pipeline</p>
          </div>
          <button onClick={load} className="rounded-xl border border-white/10 px-5 py-3 text-xs font-bold hover:bg-white/5">Refresh data</button>
        </header>

        {error && <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">{error}</div>}

        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">30-day sales targets</h2>
            <span className="text-[10px] text-slate-500">Targets are fixed; actuals use the latest 30 days.</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-3">
            {TARGETS.map(([key, label, target]) => {
              const value = Number(actual[key] || 0);
              const pct = Math.min(100, Math.round(value / target * 100));
              return <div key={key} className="rounded-2xl border border-white/10 bg-slate-900/70 p-5">
                <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
                <div className="flex items-end gap-2 mt-3"><strong className="text-3xl text-white">{value}</strong><span className="text-xs text-slate-500 mb-1">/ {target}</span></div>
                <div className="h-1.5 bg-white/10 rounded-full mt-4 overflow-hidden"><div className="h-full bg-red-500 rounded-full" style={{ width: `${pct}%` }} /></div>
                <p className="text-[10px] text-slate-500 mt-2">{pct}% achieved</p>
              </div>;
            })}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Metric label="Collected revenue · USD" value={money(usdRevenue?.amount_cents || 0)} hint="Verified paid invoices only" />
            <Metric label="Total leads created" value={actual.leads || 0} hint="Last 30 days" />
            <Metric label="Won opportunities" value={actual.won || 0} hint="All-time pipeline wins" />
          </div>
          {revenue.some((r) => r.currency.toLowerCase() !== "usd") && (
            <div className="text-xs text-slate-400">Other currencies collected: {revenue.filter((r) => r.currency.toLowerCase() !== "usd").map((r) => `${money(r.amount_cents, r.currency)} (${r.currency.toUpperCase()})`).join(" · ")}</div>
          )}
          <p className="text-[10px] text-slate-600">{summary?.revenue_note}</p>
        </section>

        <section className="rounded-2xl border border-white/10 bg-slate-900/50 p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
            <div><h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-300">Lead pipeline</h2><p className="text-[10px] text-slate-500 mt-1">{leads.length} saved leads · PostgreSQL</p></div>
            <button onClick={() => setShowForm(!showForm)} className="rounded-xl bg-red-600 px-4 py-2.5 text-xs font-black text-white hover:bg-red-500">{showForm ? "Close form" : "+ Add lead"}</button>
          </div>
          {showForm && <form onSubmit={createLead} className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6 rounded-xl border border-white/10 bg-black/20 p-4">
            <Input label="Contact name *" value={form.name} onChange={(v) => setForm({ ...form, name: v })} required />
            <Input label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} />
            <Input label="Email" type="email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
            <Input label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
            <Input label="Lead source" value={form.source} onChange={(v) => setForm({ ...form, source: v })} />
            <Input label="Opportunity value" type="number" value={form.estimated_value} onChange={(v) => setForm({ ...form, estimated_value: v })} />
            <label className="text-[10px] text-slate-400">Stage<select className="field" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })}>{STAGES.map((s) => <option key={s}>{s}</option>)}</select></label>
            <label className="text-[10px] text-slate-400">Currency<select className="field" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })}><option value="usd">USD</option><option value="kes">KES</option><option value="eur">EUR</option><option value="gbp">GBP</option></select></label>
            <label className="flex items-center gap-2 text-xs text-slate-300 mt-5"><input type="checkbox" checked={form.is_enterprise} onChange={(e) => setForm({ ...form, is_enterprise: e.target.checked })} /> Enterprise opportunity</label>
            <div className="md:col-span-3"><label className="text-[10px] text-slate-400">Notes<textarea className="field min-h-20" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label></div>
            <div className="md:col-span-3"><button disabled={saving} className="rounded-xl bg-white px-5 py-3 text-xs font-black text-slate-950 disabled:opacity-50">{saving ? "Saving..." : "Save lead"}</button></div>
          </form>}

          <div className="flex flex-wrap gap-2 mb-4">{["all", ...STAGES].map((s) => <button key={s} onClick={() => setStageFilter(s)} className={`rounded-lg px-3 py-2 text-[10px] uppercase ${stageFilter === s ? "bg-red-500 text-white" : "bg-white/5 text-slate-400"}`}>{s}</button>)}</div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead><tr className="border-b border-white/10 text-[9px] uppercase tracking-widest text-slate-500"><th className="p-3">Contact</th><th className="p-3">Company</th><th className="p-3">Value</th><th className="p-3">Stage</th><th className="p-3">Created</th></tr></thead>
              <tbody className="divide-y divide-white/5">
                {visibleLeads.map((lead) => <tr key={lead.id} className="text-xs hover:bg-white/[0.02]">
                  <td className="p-3"><div className="font-bold text-white">{lead.name}</div><div className="text-[10px] text-slate-500">{lead.email || lead.phone || "No contact details"}</div>{lead.is_enterprise && <span className="text-[9px] text-purple-300">ENTERPRISE</span>}</td>
                  <td className="p-3 text-slate-400">{lead.company || "—"}</td>
                  <td className="p-3 text-slate-300">{money(lead.estimated_value_cents, lead.currency)}</td>
                  <td className="p-3"><select aria-label={`Stage for ${lead.name}`} className="rounded-lg border border-white/10 bg-slate-950 px-2 py-2 text-[10px] capitalize" value={lead.stage} onChange={(e) => updateStage(lead.id, e.target.value)}>{STAGES.map((s) => <option key={s} value={s}>{s}</option>)}</select></td>
                  <td className="p-3 text-[10px] text-slate-500">{formatDate(lead.created_at)}</td>
                </tr>)}
                {!visibleLeads.length && <tr><td colSpan="5" className="p-8 text-center text-xs text-slate-600">No leads in this stage yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Global usage monitor</h2>
          {usage?.users?.length ? <div className="overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/50"><table className="w-full min-w-[650px] text-left"><thead className="text-[9px] uppercase tracking-widest text-slate-500"><tr><th className="p-4">Account</th><th className="p-4">Plan</th><th className="p-4">AI usage</th><th className="p-4 text-right">Executions</th></tr></thead><tbody className="divide-y divide-white/5">{usage.users.map((u) => <tr key={String(u.id)}><td className="p-4"><div className="text-xs font-bold">{u.email}</div><div className="text-[9px] text-slate-600">{String(u.id).slice(0, 8)}</div></td><td className="p-4 text-xs">{u.subscription}</td><td className="p-4 text-xs text-blue-300">{u.ai_used}</td><td className="p-4 text-right text-xs">{u.executions}</td></tr>)}</tbody></table></div> : <p className="text-xs text-slate-600">No usage records returned.</p>}
        </section>

        <section className="space-y-4">
          <h2 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Global execution monitor</h2>
          {executions.length ? executions.map((e) => <div key={String(e.id)} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-white/10 bg-slate-900/50 p-4"><div><div className="text-xs font-black text-white">NODE_{String(e.id).slice(0, 8)}</div><div className="text-[10px] text-slate-500 mt-1">INIT: {formatDate(e.started_at)} {e.finished_at && `// TERM: ${formatDate(e.finished_at)}`}</div></div><div className="flex items-center gap-3"><StatusBadge status={e.status} /><Link to={`/executions/${e.id}`} className="rounded-lg bg-white px-4 py-2 text-[10px] font-black uppercase text-slate-950">Audit</Link></div></div>) : <div className="rounded-xl border border-dashed border-white/10 p-10 text-center text-xs text-slate-600">No execution records found.</div>}
        </section>
      </div>
      <style>{`.field{display:block;width:100%;margin-top:6px;border:1px solid rgba(255,255,255,.12);border-radius:9px;background:#020617;padding:10px;color:#e2e8f0;font-size:12px}`}</style>
    </div>
  );
}

function Metric({ label, value, hint }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"><p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p><p className="text-2xl font-black text-white mt-2">{value}</p><p className="text-[10px] text-slate-600 mt-1">{hint}</p></div>;
}
function Input({ label, value, onChange, type = "text", required = false }) {
  return <label className="text-[10px] text-slate-400">{label}<input className="field" type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)} /></label>;
}
function LoadingState({ message }) {
  return <div className="min-h-screen flex items-center justify-center bg-[#020617]"><p className="animate-pulse text-red-500 font-mono text-xs uppercase tracking-widest">{message}</p></div>;
}
function StatusBadge({ status }) {
  const s = String(status || "").toUpperCase();
  const cls = s === "RUNNING" ? "text-blue-300 bg-blue-400/10" : s === "COMPLETED" ? "text-green-300 bg-green-400/10" : s === "FAILED" ? "text-red-300 bg-red-400/10" : "text-slate-400 bg-white/5";
  return <span className={`rounded-lg px-3 py-1 text-[9px] font-black ${cls}`}>{s}</span>;
}
