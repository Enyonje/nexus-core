import React, { useCallback, useEffect, useState } from "react";
import toast from "react-hot-toast";
import { MessageCircle, Phone, Mail, Smartphone, Globe, Share2, Copy, X, CheckCircle2, ShieldCheck } from "lucide-react";
import { SUPPORTOPS_API } from "../config/paths";

const CATALOG = {
    whatsapp: {
        label: "WhatsApp Business", icon: MessageCircle, blurb: "Meta WhatsApp Cloud API",
        fields: [
            { name: "phoneNumberId", label: "Phone number ID" },
            { name: "businessAccountId", label: "Business account ID" },
            { name: "accessToken", label: "Permanent access token", secret: true },
            { name: "appSecret", label: "App secret", secret: true },
        ],
        setup: "In Meta for Developers, open WhatsApp > Configuration. Paste the callback URL and verify token below, then subscribe to “messages”.",
    },
    voice: {
        label: "Phone calls", icon: Phone, blurb: "Twilio Voice",
        fields: [
            { name: "accountSid", label: "Account SID" },
            { name: "authToken", label: "Auth token", secret: true },
            { name: "phoneNumber", label: "Phone number", placeholder: "+254700000000" },
        ],
        setup: "In Twilio, set your number's voice webhook (HTTP POST) to the URL below.",
    },
    sms: {
        label: "SMS", icon: Smartphone, blurb: "Africa's Talking",
        fields: [
            { name: "username", label: "Username" },
            { name: "apiKey", label: "API key", secret: true },
            { name: "shortcode", label: "Shortcode or sender ID" },
        ],
        setup: "In Africa's Talking, open SMS > Callback URLs and paste the URL below.",
    },
    email: {
        label: "Email", icon: Mail, blurb: "Forward your support inbox",
        fields: [
            { name: "supportAddress", label: "Support address (verified sender)", placeholder: "support@yourcompany.com" },
            { name: "postmarkToken", label: "Postmark server token (for replies)", secret: true },
        ],
        setup: "Forward your support mailbox, or your email provider's inbound webhook, to the URL below.",
    },
    web: {
        label: "Web chat", icon: Globe, blurb: "Chat widget on your site",
        fields: [{ name: "allowedDomain", label: "Allowed domain", placeholder: "yourcompany.com" }],
        setup: "Paste the snippet below into your website or app. Chats from visitors appear under Live Chat in real time.",
    },
    social: {
        label: "Social inbox", icon: Share2, blurb: "Messenger and Instagram",
        fields: [
            { name: "pageId", label: "Page ID" },
            { name: "pageAccessToken", label: "Page access token", secret: true },
            { name: "appSecret", label: "App secret", secret: true },
        ],
        setup: "In Meta for Developers, add the callback URL below under Messenger or Instagram webhooks.",
    },
};

async function call(method, url, body) {
    const token = localStorage.getItem("authToken");
    const org = localStorage.getItem("activeOrgId");
    const res = await fetch(url, {
        method,
        headers: {
            ...(body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...(org ? { "X-Org-Id": org } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) throw new Error(data?.message || `Request failed (${res.status})`);
    if (data === null) throw new Error("The server did not answer with JSON. Check that VITE_API_URL points at your API.");
    return data;
}

const copy = (text) => navigator.clipboard.writeText(text).then(() => toast.success("Copied"));

function CopyRow({ label, value }) {
    return (
        <div>
            <p className="text-[11px] text-slate-400 mb-1">{label}</p>
            <div className="flex items-center gap-2 rounded-lg bg-slate-950 border border-slate-800 px-3 py-2">
                <code className="flex-1 text-xs text-cyan-300 break-all">{value}</code>
                <button type="button" onClick={() => copy(value)} aria-label={`Copy ${label}`} className="text-slate-400 hover:text-white"><Copy className="h-4 w-4" /></button>
            </div>
        </div>
    );
}

export default function ChannelsPage() {
    const [rows, setRows] = useState({});
    const [loading, setLoading] = useState(true);
    const [active, setActive] = useState(null);   // channel key being edited
    const [form, setForm] = useState({});
    const [busy, setBusy] = useState(false);
    const [result, setResult] = useState(null);   // webhook details after saving

    const load = useCallback(async () => {
        try {
            const list = await call("GET", SUPPORTOPS_API.tickets("/channels"));
            setRows(Object.fromEntries((Array.isArray(list) ? list : []).map((r) => [r.key, r])));
        } catch (err) {
            toast.error(err.message);
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { load(); }, [load]);

    const open = (key) => { setActive(key); setForm({ ...(rows[key]?.publicConfig ?? {}) }); setResult(rows[key] ?? null); };
    const close = () => { setActive(null); setResult(null); };
    const spec = active && CATALOG[active];
    const connected = Boolean(active && rows[active]?.connected);

    async function save(e) {
        e.preventDefault();
        setBusy(true);
        try {
            const row = await call("PUT", SUPPORTOPS_API.tickets(`/channels/${active}`), { config: form });
            setRows((r) => ({ ...r, [active]: row }));
            setResult(row);
            toast.success(`${spec.label} saved`);
        } catch (err) { toast.error(err.message); } finally { setBusy(false); }
    }

    async function test() {
        setBusy(true);
        try {
            const r = await call("POST", SUPPORTOPS_API.tickets(`/channels/${active}/test`));
            r.ok ? toast.success(r.message || "Connection works") : toast.error(r.message || "Test failed");
        } catch (err) { toast.error(err.message); } finally { setBusy(false); }
    }

    async function disconnect() {
        if (!window.confirm(`Disconnect ${spec.label}? New messages will stop arriving.`)) return;
        setBusy(true);
        try {
            await call("DELETE", SUPPORTOPS_API.tickets(`/channels/${active}`));
            setRows((r) => { const n = { ...r }; delete n[active]; return n; });
            close();
        } catch (err) { toast.error(err.message); } finally { setBusy(false); }
    }

    return (
        <div className="min-h-screen bg-[#030712] text-slate-100 px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Channels</h1>
            <p className="text-sm text-slate-400 mt-1 mb-8">Connect where your customers reach you. Every message becomes a ticket in one inbox.</p>

            {loading ? <p className="text-slate-400 text-sm">Loading channels…</p> : (
                <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {Object.entries(CATALOG).map(([key, c]) => {
                        const row = rows[key];
                        return (
                            <div key={key} className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-5 flex flex-col justify-between">
                                <div className="flex items-start gap-3 mb-4">
                                    <span className="p-2.5 rounded-xl bg-white/5 border border-white/10"><c.icon className="h-5 w-5 text-cyan-400" /></span>
                                    <div>
                                        <p className="font-semibold">{c.label}</p>
                                        <p className="text-xs text-slate-500">{c.blurb}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs ${row?.connected ? "text-emerald-400" : "text-slate-500"}`}>
                                        {row?.connected ? (row.lastEventAt ? `Last message ${new Date(row.lastEventAt).toLocaleString()}` : "Connected, waiting for first message") : "Not connected"}
                                    </span>
                                    <button type="button" onClick={() => open(key)} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-500 text-white">
                                        {row?.connected ? "Manage" : "Connect"}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {spec && (
                <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={close}>
                    <aside className="w-full max-w-md h-full overflow-y-auto bg-[#0B1220] border-l border-white/10 p-6" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="flex items-center gap-2 text-lg font-bold"><spec.icon className="h-5 w-5 text-cyan-400" />{spec.label}</h2>
                            <button type="button" onClick={close} aria-label="Close" className="text-slate-400 hover:text-white"><X className="h-5 w-5" /></button>
                        </div>

                        <form onSubmit={save} className="space-y-4">
                            {spec.fields.map((f) => (
                                <label key={f.name} className="block">
                                    <span className="text-xs text-slate-400">{f.label}</span>
                                    <input
                                        type={f.secret ? "password" : "text"}
                                        value={form[f.name] ?? ""}
                                        onChange={(e) => setForm({ ...form, [f.name]: e.target.value })}
                                        placeholder={f.secret && connected ? "•••••• saved (leave blank to keep)" : f.placeholder}
                                        required={!f.secret || !connected}
                                        autoComplete="off"
                                        className="mt-1 w-full px-3 py-2 rounded-lg border border-white/10 bg-slate-950 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                    />
                                </label>
                            ))}
                            <p className="flex items-center gap-2 text-[11px] text-slate-500"><ShieldCheck className="h-3.5 w-3.5" />Credentials are encrypted and never shown again.</p>
                            <button type="submit" disabled={busy} className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold disabled:opacity-50">
                                {busy ? "Saving…" : connected ? "Save changes" : "Connect"}
                            </button>
                        </form>

                        {result?.webhookUrl && (
                            <div className="mt-8 space-y-4">
                                <p className="flex items-center gap-2 text-sm font-semibold text-emerald-400"><CheckCircle2 className="h-4 w-4" />Finish setup with your provider</p>
                                <p className="text-xs text-slate-400">{spec.setup}</p>
                                <CopyRow label="Callback URL" value={result.webhookUrl} />
                                {result.verifyToken && <CopyRow label="Verify token" value={result.verifyToken} />}
                                {active === "web" && (
                                    <CopyRow
                                        label="Embed snippet (paste before </body>)"
                                        value={`<script src="${window.location.origin}/chat-widget.js" data-key="${result.webhookUrl.split("/").pop()}" data-api="${result.webhookUrl.split("/api/")[0]}" defer></script>`}
                                    />
                                )}
                                <div className="flex gap-3 pt-2">
                                    <button type="button" onClick={test} disabled={busy} className="flex-1 py-2 rounded-lg border border-slate-700 text-sm text-slate-200 hover:bg-white/5">Test connection</button>
                                    <button type="button" onClick={disconnect} disabled={busy} className="flex-1 py-2 rounded-lg border border-red-500/40 text-sm text-red-300 hover:bg-red-500/10">Disconnect</button>
                                </div>
                            </div>
                        )}
                    </aside>
                </div>
            )}
        </div>
    );
}