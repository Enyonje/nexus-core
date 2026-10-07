// supportops/src/pages/TeamPage.jsx  Admin: invite people, manage members, see the go-live checklist.
import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { Copy, Trash2, CheckCircle2, XCircle, Mail } from "lucide-react";
import { SUPPORTOPS_API } from "../config/paths";
import { useApp } from "../../../context/AccessProvider";

const LABEL = { agent: "Agent", management: "Management", investor: "Investor", admin: "Admin" };

async function call(method, url, body) {
    const token = localStorage.getItem("authToken");
    const org = localStorage.getItem("activeOrgId");
    const res = await fetch(url, {
        method,
        headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(org ? { "X-Org-Id": org } : {}) },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    if (data === null) throw new Error("The server did not answer with JSON. Check that VITE_API_URL points at your API.");
    return data;
}
const list = (r) => (r.status === "fulfilled" && Array.isArray(r.value) ? r.value : []);

export default function TeamPage() {
    const app = useApp("supportops");
    const [members, setMembers] = useState([]);
    const [invites, setInvites] = useState([]);
    const [checks, setChecks] = useState([]);
    const [form, setForm] = useState({ email: "", role: "agent" });
    const [busy, setBusy] = useState(false);
    const [fresh, setFresh] = useState(null);

    const load = useCallback(async () => {
        const [m, i, c] = await Promise.allSettled([
            call("GET", SUPPORTOPS_API.invites("/members")),
            call("GET", SUPPORTOPS_API.invites("")),
            call("GET", SUPPORTOPS_API.readiness("")),
        ]);
        setMembers(list(m)); setInvites(list(i)); setChecks(list(c));
    }, []);
    useEffect(() => { load(); }, [load]);

    const copy = (text) => navigator.clipboard.writeText(text).then(() => toast.success("Link copied"));
    const seatLimit = app.limits.seats;

    async function invite(e) {
        e.preventDefault();
        setBusy(true);
        try {
            const r = await call("POST", SUPPORTOPS_API.invites(""), form);
            setFresh(r);
            setForm({ email: "", role: form.role });
            toast.success(r.emailed ? `Invitation emailed to ${r.email}` : "Invitation created. Copy the link below and send it.");
            load();
        } catch (err) { toast.error(err.message); } finally { setBusy(false); }
    }

    async function remove(url, text) {
        if (!window.confirm(text)) return;
        try { await call("DELETE", url); load(); } catch (err) { toast.error(err.message); }
    }

    const Card = ({ title, children }) => (
        <section className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-5">
            <h2 className="text-sm font-semibold text-white mb-4">{title}</h2>{children}
        </section>
    );

    return (
        <div className="min-h-screen bg-[#030712] text-slate-100 px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div>
                <h1 className="text-2xl font-extrabold tracking-tight">Team</h1>
                <p className="text-sm text-slate-400">Seats used: {members.length + invites.length} / {seatLimit ?? "unlimited"} (people plus pending invitations)</p>
            </div>

            <Card title="Invite someone">
                <form onSubmit={invite} className="flex flex-col sm:flex-row gap-3">
                    <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="teammate@company.com"
                        className="flex-1 px-3 py-2 rounded-lg border border-white/10 bg-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600" />
                    <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="px-3 py-2 rounded-lg border border-white/10 bg-slate-950 text-sm">
                        <option value="agent">Agent: ticket queues and chats</option>
                        <option value="management">Management: agent + admin views</option>
                        <option value="investor">Investor: business metrics</option>
                    </select>
                    <button type="submit" disabled={busy} className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-sm font-semibold disabled:opacity-50">{busy ? "Sending…" : "Send invite"}</button>
                </form>
                {fresh && (
                    <div className="mt-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs">
                        <p className="text-emerald-300 mb-1">Invitation for {fresh.email} ({LABEL[fresh.role]}). Valid for 7 days.</p>
                        <div className="flex items-center gap-2"><code className="flex-1 break-all text-cyan-300">{fresh.link}</code>
                            <button type="button" onClick={() => copy(fresh.link)} aria-label="Copy link" className="text-slate-400 hover:text-white"><Copy className="h-4 w-4" /></button></div>
                    </div>
                )}
            </Card>

            <div className="grid lg:grid-cols-2 gap-6">
                <Card title={`Members (${members.length})`}>
                    <ul className="divide-y divide-slate-800/80">
                        {members.map((m) => (
                            <li key={m.userId} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                                <div className="min-w-0"><p className="truncate">{m.name || m.email}{m.owner && <span className="ml-2 text-[10px] text-cyan-400">OWNER</span>}</p><p className="text-xs text-slate-500 truncate">{m.email} · {LABEL[m.role] ?? m.role}</p></div>
                                {!m.owner && <button type="button" aria-label="Remove member" onClick={() => remove(SUPPORTOPS_API.invites(`/members/${m.userId}`), `Remove ${m.email}? They will lose access immediately.`)} className="text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>}
                            </li>
                        ))}
                    </ul>
                </Card>
                <Card title={`Pending invitations (${invites.length})`}>
                    {invites.length === 0 ? <p className="text-xs text-slate-500">No pending invitations.</p> : (
                        <ul className="divide-y divide-slate-800/80">
                            {invites.map((i) => (
                                <li key={i.id} className="py-2.5 flex items-center justify-between gap-3 text-sm">
                                    <div className="min-w-0"><p className="truncate flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-slate-500" />{i.email}</p><p className="text-xs text-slate-500">{LABEL[i.role]} · expires {new Date(i.expiresAt).toLocaleDateString()}</p></div>
                                    <button type="button" aria-label="Cancel invitation" onClick={() => remove(SUPPORTOPS_API.invites(`/${i.id}`), `Cancel the invitation for ${i.email}?`)} className="text-slate-500 hover:text-red-400"><Trash2 className="h-4 w-4" /></button>
                                </li>
                            ))}
                        </ul>
                    )}
                </Card>
            </div>

            <Card title="Go-live checklist">
                <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-2">
                    {checks.map((c) => (
                        <li key={c.key} className="flex items-start gap-2 text-sm">
                            {c.ok ? <CheckCircle2 className="h-4 w-4 mt-0.5 text-emerald-400 shrink-0" /> : <XCircle className="h-4 w-4 mt-0.5 text-amber-400 shrink-0" />}
                            <span>{c.label}{c.hint && <span className="block text-xs text-slate-500">{c.hint}</span>}</span>
                        </li>
                    ))}
                </ul>
                <p className="mt-3 text-[11px] text-slate-500">A channel counts as working once it has received a real message.</p>
            </Card>
        </div>
    );
}