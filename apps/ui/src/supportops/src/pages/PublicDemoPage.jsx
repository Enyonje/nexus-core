import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Activity, ArrowLeft, ArrowRight, BarChart3, Bot, CheckCircle2,
  Clock3, Headphones, Inbox, MessageCircle, MoreHorizontal,
  Search, ShieldCheck, Sparkles, TrendingUp, Users, Zap,
} from "lucide-react";

const tickets = [
  { id: "#4821", name: "Amara Wanjiku", subject: "Payment was deducted twice", channel: "WhatsApp", priority: "High", status: "Needs attention", age: "4 min ago", initials: "AW" },
  { id: "#4820", name: "Daniel Kimani", subject: "How do I update my delivery address?", channel: "Web chat", priority: "Normal", status: "AI handling", age: "8 min ago", initials: "DK" },
  { id: "#4819", name: "Miriam Otieno", subject: "Request for an invoice copy", channel: "Email", priority: "Low", status: "Resolved", age: "16 min ago", initials: "MO" },
  { id: "#4818", name: "Peter Mwangi", subject: "My account is locked", channel: "Messenger", priority: "High", status: "Assigned", age: "21 min ago", initials: "PM" },
];

const navItems = [
  { id: "overview", label: "Overview", icon: BarChart3 },
  { id: "inbox", label: "Unified inbox", icon: Inbox },
  { id: "automation", label: "AI automation", icon: Bot },
  { id: "team", label: "Team performance", icon: Users },
];

function Metric({ label, value, change, icon: Icon, note }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-5">
    <div className="flex items-center justify-between text-slate-400"><span className="text-sm">{label}</span><Icon className="h-4 w-4" /></div>
    <div className="mt-3 flex items-end justify-between"><strong className="text-3xl font-semibold tracking-tight text-white">{value}</strong><span className="rounded-full bg-emerald-400/10 px-2 py-1 text-xs font-medium text-emerald-300">{change}</span></div>
    <p className="mt-2 text-xs text-slate-500">{note}</p>
  </div>;
}

export default function PublicDemoPage() {
  const [active, setActive] = useState("overview");
  const [query, setQuery] = useState("");
  const [showResolved, setShowResolved] = useState(false);
  const visibleTickets = useMemo(() => tickets.filter((ticket) =>
    (showResolved || ticket.status !== "Resolved") &&
    `${ticket.id} ${ticket.name} ${ticket.subject} ${ticket.channel}`.toLowerCase().includes(query.toLowerCase())
  ), [query, showResolved]);

  return <div className="min-h-screen bg-[#070b16] text-slate-100">
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#070b16]/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center justify-between px-4 py-3 sm:px-6">
        <Link to="/supportops" className="flex items-center gap-2 font-bold tracking-tight"><span className="rounded-xl bg-indigo-500/15 p-2 text-indigo-300"><Bot className="h-5 w-5" /></span>SupportOps<span className="text-indigo-400">.ai</span><span className="ml-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-amber-200">Live demo</span></Link>
        <div className="flex items-center gap-2"><Link to="/supportops" className="hidden items-center gap-2 rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/5 sm:flex"><ArrowLeft className="h-4 w-4" /> Back to site</Link><Link to="/supportops/pricing" className="rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-400">Choose a plan <ArrowRight className="ml-1 inline h-4 w-4" /></Link></div>
      </div>
    </header>

    <div className="mx-auto max-w-[1440px] px-4 py-5 sm:px-6">
      <div className="mb-5 flex flex-col justify-between gap-3 rounded-2xl border border-indigo-400/20 bg-indigo-500/10 p-4 sm:flex-row sm:items-center">
        <div className="flex items-start gap-3"><Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-indigo-300" /><div><p className="font-semibold text-white">Explore the SupportOps workspace</p><p className="mt-1 text-sm text-slate-300">This is a safe, interactive preview using fictional sample data. No customer records or live systems are connected.</p></div></div>
        <span className="whitespace-nowrap rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">Read-only · Sample workspace</span>
      </div>

      <div className="grid gap-5 lg:grid-cols-[230px_minmax(0,1fr)]">
        <aside className="h-fit rounded-2xl border border-white/10 bg-slate-900/70 p-3">
          <div className="px-3 pb-4 pt-2"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Workspace</p><p className="mt-1 font-semibold text-white">Acme Support Team</p><p className="mt-1 text-xs text-slate-500">Demo organization</p></div>
          <nav className="space-y-1" aria-label="Demo sections">{navItems.map(({ id, label, icon: Icon }) => <button key={id} onClick={() => setActive(id)} className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition ${active === id ? "bg-indigo-500/15 font-semibold text-indigo-200" : "text-slate-400 hover:bg-white/5 hover:text-white"}`}><Icon className="h-4 w-4" />{label}</button>)}</nav>
          <div className="mt-6 rounded-xl border border-emerald-400/15 bg-emerald-400/5 p-3"><div className="flex items-center gap-2 text-xs font-semibold text-emerald-300"><ShieldCheck className="h-4 w-4" /> Demo environment</div><p className="mt-2 text-xs leading-relaxed text-slate-400">Actions here do not send messages, change settings, or modify real data.</p></div>
        </aside>

        <main className="min-w-0 space-y-5">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end"><div><p className="text-sm text-slate-500">Monday, 9 November 2026 · Sample reporting period</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">{navItems.find((item) => item.id === active)?.label}</h1><p className="mt-1 text-sm text-slate-400">A preview of how your customer operations come together.</p></div><div className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-xs text-slate-400"><span className="h-2 w-2 rounded-full bg-emerald-400" /> Sample data loaded</div></div>

          {active === "overview" && <>
            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <Metric label="Open conversations" value="128" change="↓ 8.2%" icon={MessageCircle} note="Compared with the previous 7 days" />
              <Metric label="AI resolution rate" value="67.4%" change="↑ 5.1%" icon={Bot} note="Resolved without agent intervention" />
              <Metric label="Average first reply" value="2m 18s" change="↓ 14%" icon={Clock3} note="Across connected demo channels" />
              <Metric label="Customer satisfaction" value="94.8%" change="↑ 2.4%" icon={TrendingUp} note="Based on sample survey responses" />
            </section>
            <section className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"><div className="flex items-center justify-between"><div><h2 className="font-semibold text-white">Conversation volume</h2><p className="mt-1 text-xs text-slate-500">Illustrative activity over the last 7 days</p></div><span className="text-xs text-indigo-300">This week</span></div><div className="mt-7 flex h-44 items-end gap-3">{[{d:"Mon",v:42},{d:"Tue",v:62},{d:"Wed",v:51},{d:"Thu",v:78},{d:"Fri",v:66},{d:"Sat",v:48},{d:"Sun",v:86}].map((x) => <div key={x.d} className="flex h-full flex-1 flex-col items-center justify-end gap-2"><div className="flex w-full flex-1 items-end"><div className="w-full rounded-t-lg bg-gradient-to-t from-indigo-600 to-violet-400" style={{height:`${x.v}%`}} /></div><span className="text-[11px] text-slate-500">{x.d}</span></div>)}</div></div>
              <div className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"><h2 className="font-semibold text-white">Resolution breakdown</h2><p className="mt-1 text-xs text-slate-500">Illustrative conversation outcomes</p><div className="my-6 flex items-center justify-center"><div className="flex h-36 w-36 items-center justify-center rounded-full" style={{background:"conic-gradient(#818cf8 0 67%, #34d399 67% 88%, #fbbf24 88% 100%)"}}><div className="flex h-24 w-24 flex-col items-center justify-center rounded-full bg-slate-900"><strong className="text-2xl text-white">88%</strong><span className="text-[10px] text-slate-500">Resolved</span></div></div></div><div className="space-y-3 text-sm">{[["AI resolved","67%","bg-indigo-400"],["Agent resolved","21%","bg-emerald-400"],["Open / escalated","12%","bg-amber-400"]].map(([label,value,color])=><div key={label} className="flex items-center justify-between"><span className="flex items-center gap-2 text-slate-400"><i className={`h-2 w-2 rounded-full ${color}`} />{label}</span><span className="font-medium text-white">{value}</span></div>)}</div></div>
            </section>
            <TicketTable tickets={tickets.slice(0,3)} compact />
          </>}

          {active === "inbox" && <section className="space-y-4"><div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-slate-900/70 p-4 sm:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search sample conversations..." className="w-full rounded-xl border border-white/10 bg-slate-950 py-2.5 pl-9 pr-3 text-sm text-white outline-none placeholder:text-slate-600 focus:border-indigo-400" /></label><label className="flex items-center gap-2 text-sm text-slate-400"><input type="checkbox" checked={showResolved} onChange={(event) => setShowResolved(event.target.checked)} className="accent-indigo-500" /> Include resolved</label></div><TicketTable tickets={visibleTickets} /></section>}

          {active === "automation" && <section className="grid gap-4 md:grid-cols-2"><AutomationCard title="Incoming message triage" detail="Classifies intent, detects urgency, and routes conversations to the right queue." status="Active in demo" icon={Zap} steps={["Detect topic and customer intent","Check urgency and sentiment","Route to team or AI assistant"]} /><AutomationCard title="Knowledge-assisted replies" detail="Suggests a response grounded in approved help-center content." status="Active in demo" icon={Bot} steps={["Retrieve relevant help articles","Draft a contextual response","Request agent approval when needed"]} /><AutomationCard title="SLA risk monitoring" detail="Highlights conversations that may miss their response target." status="Preview" icon={Activity} steps={["Monitor response timers","Prioritize at-risk conversations","Notify the responsible team"]} /><AutomationCard title="Customer follow-up" detail="Prepares follow-up tasks after a conversation is resolved." status="Preview" icon={Headphones} steps={["Confirm resolution outcome","Prepare follow-up message","Queue for team review"]} /></section>}

          {active === "team" && <section className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"><div className="mb-5"><h2 className="font-semibold text-white">Team snapshot</h2><p className="mt-1 text-xs text-slate-500">Fictional agents and sample performance indicators</p></div><div className="space-y-3">{[{name:"Amina N.",role:"Customer success",resolved:42,score:"98%",initials:"AN"},{name:"Brian K.",role:"Technical support",resolved:37,score:"96%",initials:"BK"},{name:"Grace M.",role:"Billing support",resolved:31,score:"94%",initials:"GM"}].map((person)=><div key={person.name} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-slate-950/60 p-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-bold text-indigo-200">{person.initials}</div><div><p className="font-medium text-white">{person.name}</p><p className="text-xs text-slate-500">{person.role}</p></div></div><div className="flex gap-8 text-right"><div><p className="font-semibold text-white">{person.resolved}</p><p className="text-xs text-slate-500">Resolved</p></div><div><p className="font-semibold text-emerald-300">{person.score}</p><p className="text-xs text-slate-500">QA score</p></div></div></div>)}</div></section>}

          <div className="flex flex-col items-start justify-between gap-3 rounded-2xl border border-indigo-400/20 bg-gradient-to-r from-indigo-500/10 to-violet-500/5 p-5 sm:flex-row sm:items-center"><div><p className="font-semibold text-white">Ready to run your own workspace?</p><p className="mt-1 text-sm text-slate-400">Choose a plan to configure channels, invite your team, and connect your workflows.</p></div><Link to="/supportops/pricing" className="shrink-0 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400">Explore plans <ArrowRight className="ml-1 inline h-4 w-4" /></Link></div>
        </main>
      </div>
    </div>
  </div>;
}

function TicketTable({ tickets: rows, compact = false }) {
  return <section className="overflow-hidden rounded-2xl border border-white/10 bg-slate-900/70"><div className="flex items-center justify-between border-b border-white/10 p-5"><div><h2 className="font-semibold text-white">{compact ? "Recent conversations" : "Conversation inbox"}</h2><p className="mt-1 text-xs text-slate-500">Fictional sample records · No live customer data</p></div><MoreHorizontal className="h-5 w-5 text-slate-500" /></div><div className="divide-y divide-white/5">{rows.length ? rows.map((ticket)=><div key={ticket.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-slate-300">{ticket.initials}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="text-xs text-slate-500">{ticket.id}</span><span className="font-medium text-white">{ticket.name}</span></div><p className="mt-1 truncate text-sm text-slate-400">{ticket.subject}</p><p className="mt-1 text-xs text-slate-600">{ticket.channel} · {ticket.age}</p></div></div><div className="flex items-center gap-3"><span className={`rounded-full px-2.5 py-1 text-[11px] ${ticket.priority === "High" ? "bg-rose-400/10 text-rose-300" : "bg-slate-800 text-slate-400"}`}>{ticket.priority}</span><span className={`hidden rounded-full px-2.5 py-1 text-[11px] sm:inline-flex ${ticket.status === "Resolved" ? "bg-emerald-400/10 text-emerald-300" : ticket.status === "Needs attention" ? "bg-amber-400/10 text-amber-300" : "bg-indigo-400/10 text-indigo-300"}`}>{ticket.status}</span></div></div>) : <p className="p-8 text-center text-sm text-slate-500">No sample conversations match that search.</p>}</div><div className="border-t border-white/10 px-5 py-3 text-xs text-slate-600">{rows.length} sample {rows.length === 1 ? "conversation" : "conversations"}</div></section>;
}

function AutomationCard({ title, detail, status, icon: Icon, steps }) {
  return <article className="rounded-2xl border border-white/10 bg-slate-900/70 p-5"><div className="flex items-start justify-between"><span className="rounded-xl bg-indigo-500/15 p-3 text-indigo-300"><Icon className="h-5 w-5" /></span><span className="rounded-full border border-white/10 px-2.5 py-1 text-[11px] text-slate-400">{status}</span></div><h2 className="mt-4 font-semibold text-white">{title}</h2><p className="mt-2 min-h-10 text-sm leading-relaxed text-slate-400">{detail}</p><ol className="mt-4 space-y-2">{steps.map((step,index)=><li key={step} className="flex items-center gap-2 text-xs text-slate-400"><span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-800 text-[10px] text-slate-300">{index+1}</span>{step}</li>)}</ol><div className="mt-5 flex items-center gap-2 border-t border-white/5 pt-4 text-xs text-emerald-300"><CheckCircle2 className="h-4 w-4" /> Preview only — no workflow is running</div></article>;
}
