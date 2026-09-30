import React, { useState } from "react";
import {
  Zap,
  Ticket,
  BarChart3,
  Workflow,
  Sparkles
} from "lucide-react";

const StatCard = ({ title, value, icon: Icon }) => (
  <div className="group rounded-2xl bg-white/5 border border-white/10 p-6 
                  hover:bg-white/10 transition-all cursor-pointer">
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-widest text-slate-400">
        {title}
      </p>
      <Icon className="w-5 h-5 text-blue-500 group-hover:scale-110 transition" />
    </div>
    <h2 className="text-5xl font-extrabold mt-4">{value}</h2>
  </div>
);

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState("Dashboard");

  return (
    <div className="min-h-screen bg-[#020617] text-white flex">
      
      {/* SIDEBAR */}
      <aside className="hidden md:flex w-64 flex-col border-r border-white/10 p-6">
        <div className="flex items-center gap-2 mb-10">
          <Zap className="text-blue-500" />
          <span className="font-bold text-xl">SupportOps</span>
        </div>

        <nav className="space-y-2">
          {["Dashboard", "Tickets", "Analytics"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`w-full text-left px-4 py-3 rounded-xl transition
                ${activeTab === tab
                  ? "bg-blue-600 text-white"
                  : "hover:bg-white/5 text-slate-300"}`}
            >
              {tab}
            </button>
          ))}
        </nav>

        <button className="mt-auto bg-blue-600 hover:bg-blue-500 transition 
                           rounded-xl p-4 font-bold shadow-xl">
          Upgrade to Pro
        </button>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-6 md:p-10 space-y-10">

        {/* HEADER */}
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black tracking-tight">
              Operations Overview
            </h1>
            <p className="text-slate-400 mt-2">
              Real-time AI ticket orchestration
            </p>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Sparkles className="text-blue-500" />
            <span className="text-sm text-slate-400">
              AI Accuracy 98.2%
            </span>
          </div>
        </header>

        {/* STATS GRID */}
      {/* STATS GRID */}
<section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-6"> {/* Changed to grid-cols-5 */}
  <StatCard title="Active Workflows" value="12" icon={Workflow} />
  <StatCard title="Auto-Resolved" value="842" icon={Zap} />
  <StatCard title="Open Tickets" value="27" icon={Ticket} />
  <StatCard title="System Health" value="99.9%" icon={BarChart3} />
  
  {/* NEW: ROI CARD (Only visible in Demo Mode) */}
  {isDemoMode && (
    <div className="group rounded-2xl bg-blue-500/10 border border-blue-500/20 p-6 hover:bg-blue-500/20 transition-all cursor-pointer">
      <div className="flex items-center justify-between">
        <p className="text-xs uppercase tracking-widest text-blue-400 font-bold">Revenue Saved</p>
        <Sparkles className="w-5 h-5 text-blue-400 animate-pulse" />
      </div>
      <h2 className="text-5xl font-extrabold mt-4 text-white">$14.2k</h2>
      <p className="text-[10px] text-blue-400/60 mt-2 font-medium italic">Based on $16.80 avg/resolution</p>
    </div>
  )}
</section>

        {/* LIVE ACTIVITY */}
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8">
          <h2 className="text-xl font-bold mb-6">Live Ticket Stream</h2>

          <div className="flex flex-col items-center justify-center h-40 
                          text-slate-400 italic">
            Streaming soon…
          </div>
        </section>

      </main>
    </div>
  );
}
