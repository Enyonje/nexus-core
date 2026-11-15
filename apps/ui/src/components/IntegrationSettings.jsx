import React, { useCallback, useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import { Plug, Plus, Copy, Check, Trash2, ShieldCheck, KeyRound, RefreshCw, AlertCircle } from "lucide-react";

const prettyDate = (value) => value ? new Date(value).toLocaleString() : "Never";

export default function IntegrationSettings() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [newToken, setNewToken] = useState("");
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const result = await apiFetch("/integrations"); setItems(result.integrations || []); }
    catch (err) { setError(err.message || "Unable to load integrations."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const create = async (event) => {
    event.preventDefault();
    if (!name.trim()) return;
    setSaving(true); setError("");
    try {
      const result = await apiFetch("/integrations", { method: "POST", body: { name: name.trim() } });
      setItems((current) => [result.integration, ...current]);
      setNewToken(result.token || ""); setName(""); setCopied(false);
    } catch (err) { setError(err.message || "Could not create integration."); }
    finally { setSaving(false); }
  };

  const revoke = async (item) => {
    if (!window.confirm(`Revoke access for ${item.name}? Connected applications using this token will stop sending events.`)) return;
    try { await apiFetch(`/integrations/${item.id}`, { method: "DELETE" }); await load(); }
    catch (err) { setError(err.message || "Could not revoke integration."); }
  };

  const copyToken = async () => {
    await navigator.clipboard.writeText(newToken); setCopied(true);
  };

  return <div className="mx-auto max-w-5xl space-y-7 text-slate-100">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><div className="mb-2 inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-cyan-200"><Plug size={13}/> Connected ecosystem</div><h1 className="text-3xl font-black tracking-tight">Product integrations</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-400">Connect independent products to Business Insights using scoped integration credentials. Each integration can submit activity events only to this workspace.</p></div>
      <button onClick={load} className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs font-bold text-slate-300 hover:bg-white/5"><RefreshCw size={14}/> Refresh</button>
    </div>

    <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <form onSubmit={create} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-4 flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-cyan-400/10 text-cyan-300"><Plus size={19}/></span><div><h2 className="font-bold">Add an integration</h2><p className="text-xs text-slate-500">Create a dedicated credential for one app.</p></div></div>
        <label className="mb-2 block text-xs font-semibold text-slate-300" htmlFor="integration-name">Application name</label>
        <input id="integration-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} placeholder="e.g. SocialOps" className="w-full rounded-xl border border-white/10 bg-[#07111f] px-4 py-3 text-sm text-white outline-none focus:border-cyan-400/50" />
        <button disabled={saving || name.trim().length < 2} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-4 py-3 text-xs font-black text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40">{saving ? "Creating…" : "Generate integration key"}<KeyRound size={14}/></button>
        <div className="mt-4 flex gap-2 rounded-xl border border-emerald-400/15 bg-emerald-400/[0.05] p-3 text-[11px] leading-5 text-emerald-100/80"><ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-300"/><span>Keys are stored as hashes and shown only once. Revoke a key immediately if it is exposed.</span></div>
      </form>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="font-bold">What gets connected?</h2><p className="mt-1 text-xs text-slate-500">An integration can write activity records. It cannot read workspace data, run workflows, or access another product's database.</p>
        <div className="mt-5 space-y-3">{[{name:"SocialOps",dept:"grow",desc:"Campaigns, publishing and engagement"},{name:"Sales Assistant AI",dept:"sell",desc:"Lead qualification and sales pipeline activity"},{name:"SupportOps",dept:"serve",desc:"Support volume and resolution milestones"},{name:"Other applications",dept:"operate",desc:"Approved operational events"}].map((app) => <div key={app.name} className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.07] bg-black/10 p-3"><div><p className="text-sm font-semibold">{app.name}</p><p className="mt-0.5 text-[11px] text-slate-500">{app.desc}</p></div><span className="rounded-lg bg-white/[0.05] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">{app.dept}</span></div>)}</div>
      </div>
    </div>

    {error && <div role="alert" className="flex items-center gap-2 rounded-xl border border-rose-400/20 bg-rose-400/10 p-3 text-xs text-rose-200"><AlertCircle size={15}/>{error}</div>}
    {newToken && <section className="rounded-2xl border border-amber-300/25 bg-amber-300/[0.06] p-5"><h2 className="font-bold text-amber-100">Copy your integration key now</h2><p className="mt-1 text-xs text-amber-100/70">This secret will not be displayed again. Store it in the connected application's server-side environment variables, never in browser code.</p><div className="mt-4 flex flex-wrap gap-2"><code className="min-w-0 flex-1 break-all rounded-xl border border-white/10 bg-black/30 p-3 text-xs text-emerald-200">{newToken}</code><button onClick={copyToken} className="inline-flex items-center gap-2 rounded-xl bg-amber-300 px-4 py-3 text-xs font-black text-slate-950">{copied ? <Check size={14}/> : <Copy size={14}/>} {copied ? "Copied" : "Copy key"}</button></div><button onClick={() => setNewToken("")} className="mt-3 text-[11px] font-bold text-slate-400 underline">I've saved the key — dismiss</button></section>}

    <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.025]"><div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-4"><div><h2 className="font-bold">Workspace integrations</h2><p className="mt-1 text-xs text-slate-500">Credentials are isolated to the current workspace.</p></div><span className="rounded-lg bg-white/[0.06] px-2.5 py-1 text-xs font-bold text-slate-300">{items.filter((x) => !x.revokedAt).length} active</span></div>
      {loading ? <div className="p-8 text-center text-xs text-slate-500">Loading integrations…</div> : items.length === 0 ? <div className="p-10 text-center"><Plug className="mx-auto mb-3 text-slate-600" size={25}/><p className="text-sm font-semibold text-slate-300">No integrations yet</p><p className="mt-1 text-xs text-slate-500">Create a key to connect an approved application.</p></div> : <div className="divide-y divide-white/[0.06]">{items.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-4 px-5 py-4"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-bold">{item.name}</p><span className={`rounded-md px-2 py-0.5 text-[9px] font-bold uppercase ${item.revokedAt ? "bg-rose-400/10 text-rose-300" : "bg-emerald-400/10 text-emerald-300"}`}>{item.revokedAt ? "Revoked" : "Active"}</span></div><p className="mt-1 font-mono text-[10px] text-slate-500">{item.tokenPrefix}••••••••</p><p className="mt-1 text-[10px] text-slate-600">Created {prettyDate(item.createdAt)} · Last used {prettyDate(item.lastUsedAt)}</p></div>{!item.revokedAt && <button onClick={() => revoke(item)} className="inline-flex items-center gap-2 rounded-lg border border-rose-400/20 px-3 py-2 text-[10px] font-bold text-rose-300 hover:bg-rose-400/10"><Trash2 size={13}/> Revoke</button>}</div>)}</div>}
    </section>
  </div>;
}
