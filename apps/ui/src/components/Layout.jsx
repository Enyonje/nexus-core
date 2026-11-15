import React, { useEffect, useMemo, useState } from "react";
import { Outlet, Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import {
  LayoutDashboard, TrendingUp, Users, Headset, Workflow, Bot, Store,
  Settings, CreditCard, Menu, X, ChevronRight, LogOut, Building2, Plug,
  Target, Sparkles, ShieldCheck, BarChart3
} from "lucide-react";

const groups = [
  { label: "Workspace", items: [{ name: "Overview", path: "/dashboard", icon: LayoutDashboard }, { name: "Business insights", path: "/insights", icon: BarChart3 }] },
  { label: "Grow", items: [
    { name: "Social media", path: "/agents", icon: TrendingUp, hint: "SocialOps" },
    { name: "Marketing & growth", path: "/agents", icon: Target },
  ]},
  { label: "Sell", items: [
    { name: "Leads & sales", path: "/agents", icon: Users, hint: "Sales Assistant AI" },
    { name: "Sales workflows", path: "/goals", icon: Workflow },
  ]},
  { label: "Serve", items: [
    { name: "Customer support", path: "/supportops", icon: Headset, hint: "SupportOps" },
  ]},
  { label: "Operate", items: [
    { name: "Automations", path: "/goals", icon: Workflow },
    { name: "Execution history", path: "/executions", icon: BarChart3, paid: true },
  ]},
  { label: "AI workforce", items: [
    { name: "My AI employees", path: "/agents", icon: Bot },
    { name: "Agent marketplace", path: "/agents", icon: Store },
  ]},
  { label: "Management", items: [
    { name: "Business settings", path: "/dashboard?setup=1", icon: Settings },
    { name: "Product integrations", path: "/integrations", icon: Plug },
    { name: "Billing & plans", path: "/billing", icon: CreditCard },
  ]},
];

export default function Layout({ theme }) {
  const { user, subscription, role, logout, loading } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [workspaceName, setWorkspaceName] = useState(() => {
    try { return JSON.parse(localStorage.getItem("nexus_business_profile") || "{}").businessName || "My business"; }
    catch { return "My business"; }
  });
  useEffect(() => {
    const syncProfile = () => {
      try { setWorkspaceName(JSON.parse(localStorage.getItem("nexus_business_profile") || "{}").businessName || "My business"); }
      catch { setWorkspaceName("My business"); }
    };
    window.addEventListener("nexus:business-profile-updated", syncProfile);
    window.addEventListener("storage", syncProfile);
    return () => { window.removeEventListener("nexus:business-profile-updated", syncProfile); window.removeEventListener("storage", syncProfile); };
  }, []);
  const currentTier = useMemo(() => {
    if (!subscription) return "starter";
    if (typeof subscription === "string") return subscription.toLowerCase();
    return (subscription.tier || subscription.plan_id || "starter").toLowerCase();
  }, [subscription]);
  const currentRole = role || user?.role || "user";
  const isActive = (path) => location.pathname === path || (path !== "/dashboard" && location.pathname.startsWith(path));

  if (loading) return <div className="min-h-screen grid place-items-center bg-[#07111f]"><div className="h-8 w-8 animate-spin rounded-full border-2 border-cyan-400 border-t-transparent" /></div>;

  return <div className="min-h-screen bg-[#07111f] text-slate-100">
    {sidebarOpen && <button aria-label="Close navigation" onClick={() => setSidebarOpen(false)} className="fixed inset-0 z-40 bg-black/70 md:hidden" />}
    <aside className={`fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col border-r border-white/[0.07] bg-[#091525] transition-transform md:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
      <div className="flex h-[76px] items-center justify-between border-b border-white/[0.07] px-5">
        <Link to="/dashboard" className="flex items-center gap-3" onClick={() => setSidebarOpen(false)}>
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-400 to-blue-600 text-lg font-black text-white shadow-lg shadow-cyan-950/50">N</span>
          <span className="text-lg font-black tracking-tight">Nexus<span className="text-cyan-400">Core</span><span className="mt-0.5 block text-[9px] font-bold uppercase tracking-[.2em] text-slate-500">Business ecosystem</span></span>
        </Link>
        <button onClick={() => setSidebarOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-white/5 md:hidden"><X size={18}/></button>
      </div>
      <div className="mx-4 mt-4 rounded-xl border border-white/[0.07] bg-white/[0.025] p-3">
        <div className="flex items-center gap-2"><Building2 size={15} className="text-cyan-400"/><span className="text-[10px] font-bold uppercase tracking-[.16em] text-slate-500">Current workspace</span></div>
        <p className="mt-2 truncate text-sm font-semibold text-white">{workspaceName}</p>
        <p className="mt-1 truncate text-[10px] text-slate-500">{user?.email || "Your business workspace"}</p>
      </div>
      <nav className="nexus-scrollbar flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {groups.map(group => <section key={group.label}>
          <p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[.22em] text-slate-600">{group.label}</p>
          <div className="space-y-1">{group.items.map(item => {
            const Icon = item.icon; const active = isActive(item.path) && (item.path !== "/agents" || location.pathname === "/agents");
            return <Link key={`${group.label}-${item.name}`} to={item.path} onClick={() => setSidebarOpen(false)} className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold transition ${active ? "border border-cyan-400/15 bg-cyan-400/10 text-cyan-200" : "text-slate-400 hover:bg-white/[0.04] hover:text-white"}`}>
              <Icon size={16} className={active ? "text-cyan-300" : "text-slate-500 group-hover:text-slate-300"}/><span className="min-w-0 flex-1 truncate">{item.name}</span>{item.hint && <span className="max-w-[86px] truncate rounded-md bg-white/[0.05] px-1.5 py-1 text-[8px] font-bold text-slate-500">{item.hint}</span>}{active && <ChevronRight size={13}/>}
            </Link>;
          })}</div>
        </section>)}
        <section><p className="mb-2 px-3 text-[9px] font-black uppercase tracking-[.22em] text-slate-600">Specialised solutions</p><Link to="/compliance" onClick={() => setSidebarOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-[12px] font-semibold text-slate-400 hover:bg-white/[0.04] hover:text-white"><ShieldCheck size={16} className="text-slate-500"/>Compliance workspace</Link></section>
      </nav>
      <div className="border-t border-white/[0.07] p-4">
        <div className="mb-3 flex items-center gap-2 rounded-lg bg-white/[0.03] p-2.5"><span className="grid h-7 w-7 place-items-center rounded-full bg-cyan-400/10 text-[10px] font-black text-cyan-300">{(user?.email || "U").slice(0,1).toUpperCase()}</span><span className="min-w-0 flex-1 truncate text-[10px] text-slate-400">{user?.email || "Workspace member"}</span><span className="rounded-md bg-cyan-400/10 px-2 py-1 text-[8px] font-black uppercase text-cyan-300">{currentTier}</span></div>
        <button onClick={() => logout(true)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[11px] font-semibold text-slate-500 hover:bg-rose-500/10 hover:text-rose-300"><LogOut size={14}/> Sign out</button>
        {currentRole === "admin" && <Link to="/admin" className="mt-2 block px-3 text-[10px] font-bold text-amber-300">Administration →</Link>}
      </div>
    </aside>
    <div className="min-h-screen md:pl-[268px]">
      <header className="sticky top-0 z-30 flex h-[76px] items-center justify-between border-b border-white/[0.07] bg-[#07111f]/90 px-4 backdrop-blur-xl md:px-8">
        <div className="flex items-center gap-3"><button onClick={() => setSidebarOpen(true)} className="rounded-lg border border-white/10 p-2 text-slate-300 md:hidden"><Menu size={18}/></button><div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-slate-600">Business workspace</p><p className="text-sm font-bold text-white">{groups.flatMap(g=>g.items).find(i=>i.path===location.pathname)?.name || "Your business"}</p></div></div>
        <div className="flex items-center gap-2"><Link to="/agents" className="hidden items-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.06] px-3 py-2 text-[10px] font-bold text-cyan-200 hover:bg-cyan-400/10 sm:flex"><Sparkles size={13}/> Explore AI employees</Link><Link to="/billing" className="rounded-xl bg-cyan-500 px-3 py-2 text-[10px] font-black text-slate-950 hover:bg-cyan-400">Upgrade plan</Link></div>
      </header>
      <main className="min-h-[calc(100vh-76px)] min-w-0 p-4 md:p-8"><Outlet/></main>
    </div>
  </div>;
}
