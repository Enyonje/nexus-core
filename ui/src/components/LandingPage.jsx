import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function LandingPage() {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 overflow-x-hidden font-sans">
      {/* 1. FIXED BACKGROUND GLOWS (Ensures depth) */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-purple-600/10 blur-[120px] rounded-full" />
      </div>

      {/* 2. REFINED NAVIGATION */}
      <nav className="relative z-50 flex justify-between items-center px-6 py-8 max-w-7xl mx-auto">
        <div className="text-xl font-black tracking-tighter bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          NEXUS CORE
        </div>
        <div className="hidden md:flex items-center gap-10 text-[11px] font-black uppercase tracking-widest text-slate-500">
          <Link to="/docs" className="hover:text-blue-400 transition-colors">Platform</Link>
          <Link to="/subscription" className="hover:text-blue-400 transition-colors">Pricing</Link>
          <Link to="/blog" className="hover:text-blue-400 transition-colors">Architecture</Link>
        </div>
        <Link to="/login" className="px-6 py-2.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-[11px] font-black uppercase tracking-widest backdrop-blur-md">
          Client Login
        </Link>
      </nav>

      {/* 3. HERO SECTION */}
      <section className="relative z-10 px-6 pt-32 pb-24 text-center max-w-6xl mx-auto">
        <motion.div {...fadeInUp}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/20 bg-blue-500/5 text-blue-400 text-[10px] font-black tracking-[0.2em] uppercase mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            Beta v1.0 Live on Vercel
          </div>
          
          <h1 className="text-6xl md:text-8xl font-black mb-8 tracking-tighter leading-[0.9] text-white">
            From Workflows to <br />
            <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-500 bg-clip-text text-transparent">
              Digital Workforces
            </span>
          </h1>
          
          <p className="text-lg md:text-xl text-slate-400 mb-12 max-w-2xl mx-auto leading-relaxed font-medium">
            The world's first AI-native SaaS that deploys autonomous agent swarms. 
            Define the objective. The Sentinel handles the execution.
          </p>

          <div className="flex flex-col sm:flex-row justify-center items-center gap-4">
            <Link to="/register" className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-widest shadow-[0_0_40px_rgba(37,99,235,0.2)] transition-all hover:scale-[1.02] active:scale-95">
              Launch Your Swarm
            </Link>
            <Link to="/subscription" className="w-full sm:w-auto px-10 py-5 rounded-2xl bg-slate-900/50 border border-white/10 hover:border-blue-500/50 text-white text-xs font-black uppercase tracking-widest transition-all backdrop-blur-md">
              View Architecture
            </Link>
          </div>
        </motion.div>
      </section>

      {/* 4. TECH STACK TRUST BAR */}
      <section className="relative z-10 py-16 border-y border-white/[0.03] bg-white/[0.01]">
        <p className="text-center text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] mb-10">System Infrastructure</p>
        <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 px-6 opacity-30 grayscale hover:grayscale-0 transition-all duration-700">
           {['Vercel', 'Laravel', 'Docker', 'Google Cloud', 'OpenAI'].map((tech) => (
             <span key={tech} className="font-black text-lg md:text-2xl tracking-tighter text-white">{tech.toUpperCase()}</span>
           ))}
        </div>
      </section>

      {/* 5. FEATURE GRID */}
      <section className="relative z-10 px-6 py-32">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-20 gap-6">
            <div className="space-y-4">
              <h2 className="text-4xl md:text-5xl font-black tracking-tighter">The Nexus Engine</h2>
              <p className="text-slate-500 font-medium max-w-md uppercase text-[11px] tracking-widest">Autonomous Governance Layers</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: "The Architect", desc: "Goal decomposition via advanced reasoning models.", icon: "01" },
              { title: "Worker Swarm", desc: "Specialized agents executing API and UI tasks in parallel.", icon: "02" },
              { title: "The Sentinel", desc: "Self-healing audit agent that intercepts failures.", icon: "03" },
              { title: "Generative UI", desc: "Dynamic dashboards built on-the-fly for every task.", icon: "04" }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -5 }}
                className="group p-8 rounded-3xl bg-slate-900/20 border border-white/5 hover:border-blue-500/30 transition-all backdrop-blur-sm"
              >
                <div className="text-[40px] font-black text-white/5 group-hover:text-blue-500/10 transition-colors mb-4 font-mono">{item.icon}</div>
                <h3 className="text-sm font-black mb-3 text-white uppercase tracking-tight">{item.title}</h3>
                <p className="text-slate-500 text-xs leading-relaxed font-medium">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. CALL TO ACTION */}
      <section className="relative z-10 px-6 py-24">
        <div className="max-w-5xl mx-auto rounded-[40px] bg-gradient-to-br from-blue-600 to-indigo-700 p-1 md:p-1.5 shadow-2xl shadow-blue-900/20">
          <div className="bg-[#020617] rounded-[36px] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-blue-600/[0.03] pointer-events-none" />
            <h2 className="text-4xl md:text-6xl font-black mb-8 text-white tracking-tighter leading-tight">Ready to hire your first <br/> digital workforce?</h2>
            <Link to="/register" className="inline-block px-12 py-5 rounded-2xl bg-white text-slate-950 text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all shadow-xl">
              Initiate Free Trial
            </Link>
          </div>
        </div>
      </section>

      {/* 7. FOOTER */}
      <footer className="relative z-10 px-6 py-20 border-t border-white/[0.03] bg-[#020617]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="text-center md:text-left">
            <div className="text-lg font-black tracking-tighter text-white mb-2">NEXUS CORE</div>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">© {new Date().getFullYear()} Evans Nyonje // Nairobi, Kenya</p>
          </div>
          <nav className="flex flex-wrap justify-center gap-10 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
            <Link to="/docs" className="hover:text-white transition">Docs</Link>
            <Link to="/blog" className="hover:text-white transition">Architecture</Link>
            <Link to="/careers" className="hover:text-white transition">Careers</Link>
            <Link to="/contact" className="hover:text-white transition">Contact</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}