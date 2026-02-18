import { Link } from "react-router-dom";
import { motion } from "framer-motion"; // Install via: npm install framer-motion

export default function LandingPage() {
  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6 }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-white selection:bg-blue-500/30 overflow-x-hidden">
      {/* Background Glow */}
      <div className="fixed inset-0 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex justify-between items-center px-8 py-6 max-w-7xl mx-auto">
        <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
          NEXUS CORE
        </div>
        <div className="hidden md:flex gap-8 text-sm font-medium text-slate-400">
          <Link to="/docs" className="hover:text-white transition">Platform</Link>
          <Link to="/subscription" className="hover:text-white transition">Pricing</Link>
          <Link to="/blog" className="hover:text-white transition">Architecture</Link>
        </div>
        <Link to="/login" className="px-5 py-2 rounded-full border border-slate-700 hover:bg-slate-800 transition text-sm">
          Login
        </Link>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 pt-24 pb-20 text-center max-w-5xl mx-auto">
        <motion.div {...fadeInUp}>
          <span className="px-4 py-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-bold tracking-widest uppercase mb-6 inline-block">
            Beta v1.0 Live on Vercel
          </span>
          <h1 className="text-6xl md:text-7xl font-extrabold mb-6 tracking-tight leading-tight">
            From Workflows to <br />
            <span className="bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-400 bg-clip-text text-transparent">
              Digital Workforces
            </span>
          </h1>
          <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            The first AI-native SaaS that deploys autonomous agent swarms. 
            Define the goal. The Sentinel handles the rest.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link to="/register" className="px-8 py-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all hover:scale-105">
              Launch Your Swarm
            </Link>
            <Link to="/subscription" className="px-8 py-4 rounded-xl bg-slate-900 border border-slate-700 hover:border-purple-500 text-white font-bold transition-all">
              Watch Sentinel Self-Heal
            </Link>
          </div>
        </motion.div>
      </section>

      {/* Trust Bar (New: Added for Social Proof) */}
      <section className="relative z-10 py-10 border-y border-slate-800/50 bg-slate-900/20">
        <p className="text-center text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Built by Evans Nyonje & Optimized for</p>
        <div className="flex justify-center gap-12 opacity-50 grayscale hover:grayscale-0 transition duration-500">
           <span className="font-bold text-xl text-white">VERCEL</span>
           <span className="font-bold text-xl text-white">LARAVEL</span>
           <span className="font-bold text-xl text-white">DOCKER</span>
           <span className="font-bold text-xl text-white">GOOGLE CLOUD</span>
        </div>
      </section>

      {/* Architecture Section - Glassmorphism cards */}
      <section className="relative z-10 px-6 py-32 bg-slate-950/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl font-bold mb-4">The Nexus Engine</h2>
            <p className="text-slate-400">A multi-layered approach to autonomous governance.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { title: "The Architect", desc: "Complex goal decomposition using advanced reasoning models.", icon: "🧠" },
              { title: "Worker Swarm", desc: "Specialized agents executing API, DB, and UI tasks in parallel.", icon: "🐝" },
              { title: "The Sentinel", desc: "Self-healing audit agent that intercepts failures and auto-patches code.", icon: "🛡️" },
              { title: "Generative UI", desc: "Real-time, dynamic dashboards built on-the-fly for every task.", icon: "✨" }
            ].map((item, idx) => (
              <motion.div 
                key={idx}
                whileHover={{ y: -10 }}
                className="p-8 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-blue-500/50 transition-all backdrop-blur-sm"
              >
                <div className="text-3xl mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold mb-3 text-blue-400">{item.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to Action Footer */}
      <section className="relative z-10 px-6 py-24 text-center">
        <div className="max-w-3xl mx-auto p-12 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-700 shadow-2xl">
          <h2 className="text-4xl font-bold mb-6 text-white">Ready to hire your first <br/> digital workforce?</h2>
          <p className="text-blue-100 mb-8">Join 500+ early adopters currently testing Nexus Core.</p>
          <Link to="/register" className="px-10 py-4 rounded-xl bg-white text-blue-700 font-bold hover:bg-blue-50 transition">
            Start Free Trial
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 border-t border-slate-900 text-center text-slate-500 bg-slate-950">
        <div className="max-w-7xl mx-auto">
          <p className="mb-6">© {new Date().getFullYear()} Nexus Core by Evans Nyonje. Nairobi, Kenya.</p>
          <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
            <Link to="/docs" className="hover:text-blue-400 transition">Documentation</Link>
            <Link to="/blog" className="hover:text-blue-400 transition">System Architecture</Link>
            <Link to="/careers" className="hover:text-blue-400 transition">Careers</Link>
            <Link to="/contact" className="hover:text-blue-400 transition">Contact Engineering</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}