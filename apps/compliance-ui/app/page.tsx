'use client';

import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import { useRef, useEffect, useState } from 'react';
import Lenis from 'lenis';

// Modern, comprehensive step definition for a cross-border user journey
const workflowSteps = [
  {
    id: '01',
    title: 'Invoice Parsing Agent',
    agent: 'OCR & Semantic NLP Swarm',
    desc: 'Extracts line items, buyer/seller credentials, currencies, and multi-layered incoterms directly from raw PDFs with zero template preparation.',
    badge: 'Extraction Live',
    metrics: '99.4% Field Identification Accuracy'
  },
  {
    id: '02',
    title: 'HS Classification Agent',
    agent: 'WCO Harmonized System LLM',
    desc: 'Deep-analyzes item descriptions to dynamically assign accurate 6-to-10 digit Harmonized System tariffs across African jurisdictions.',
    badge: 'Tariff Mapping',
    metrics: 'Real-time 2026 WCO Regulation Match'
  },
  {
    id: '03',
    title: 'Regulation Validation Agent',
    agent: 'Cross-Border Compliance Rule Engine',
    desc: 'Cross-references goods against active intra-African regulatory databases (e.g., AfCFTA guidelines, phytosanitary requirements, prohibited goods list).',
    badge: 'Legal Clearance',
    metrics: 'Zero Non-Compliance Escapes'
  },
  {
    id: '04',
    title: 'Certificate Generation Agent',
    agent: 'Document Compilation Node',
    desc: 'Compiles, digitally signs, and formats custom declarations, certificates of origin, and compliance files ready for customs submission.',
    badge: 'Artifact Dispatch',
    metrics: 'Instant PDF / EDI/ API Delivery'
  },
];

const metrics = [
  { value: '90s', label: 'Average Processing Time', subtext: 'Down from 48-hour manual filing loops' },
  { value: '98%', label: 'Classification Accuracy', subtext: 'Audited against global customs challenges' },
  { value: '70%', label: 'Operational Cost Reduction', subtext: 'Eliminates demurrage & standard agency broker surcharges' },
];

const pricing = [
  {
    name: 'Starter',
    price: '$49',
    period: '/mo',
    description: 'Perfect for local trading hubs scaling regional logistics lanes.',
    features: [
      '100 compliance documents / mo',
      'Basic multi-country tariff mapping',
      'Standard email SLA support',
      'AfCFTA base compliance rule sets'
    ],
    cta: 'Initialize Protocol',
    popular: false
  },
  {
    name: 'Growth',
    price: '$299',
    period: '/mo',
    description: 'Designed for active continental freight forwarders and distribution centers.',
    features: [
      '1,000 compliance documents / mo',
      'Advanced autonomous agent swarms',
      'Full API & Webhook streaming pipeline',
      'Customs clearing document signatures',
      'Priority 1-hour engineering SLA support'
    ],
    cta: 'Deploy Growth Infrastructure',
    popular: true
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    period: '',
    description: 'Custom compliance networks for global logistics enterprises and state agencies.',
    features: [
      'Unlimited volume scaling architecture',
      'Isolated dedicated secure cloud tenant',
      'Proprietary compliance rule injections',
      'Dedicated integration architect support',
      'Custom liability compliance indemnification'
    ],
    cta: 'Contact Architecture Command',
    popular: false
  },
];

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activePlaygroundTab, setActivePlaygroundTab] = useState(0);

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.1,
      smoothWheel: true,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Custom cinematic ease
    });

    function raf(time: number) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    return () => lenis.destroy();
  }, []);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end start'],
  });

  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, 80]);
  const heroOpacity = useTransform(scrollYProgress, [0, 0.25], [1, 0]);

  return (
    <div ref={containerRef} className="bg-[#020617] text-slate-100 selection:bg-blue-500/30 font-sans antialiased">
      
      {/* HUD HEADER NAVBAR */}
      <header className="fixed top-4 inset-x-4 z-50 max-w-7xl mx-auto">
        <nav className="backdrop-blur-md bg-slate-950/60 border border-white/10 rounded-2xl px-6 py-4 flex justify-between items-center transition-all duration-300 shadow-[0_4px_30px_rgba(0,0,0,0.4)]">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-blue-500 animate-pulse" />
            <span className="text-lg font-black tracking-widest text-white uppercase">
              Nexus <span className="text-blue-500">Core</span>
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#workflow" className="hover:text-white transition-colors">Workflow Matrix</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing Ecosystem</a>
          </div>

          <button className="bg-blue-600 hover:bg-blue-500 active:scale-95 transition text-[11px] font-black uppercase tracking-widest px-5 py-2.5 rounded-xl border border-blue-400/30 shadow-[0_0_20px_rgba(37,99,235,0.2)]">
            Book Live Interface Demo
          </button>
        </nav>
      </header>

      {/* METAMODERN HERO SECTION */}
      <section className="relative min-h-screen flex items-center pt-24 justify-center px-4 overflow-hidden border-b border-white/5">
        
        {/* Subtle, highly technical matrix blueprint background */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.12]">
          <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_20%,#020617_80%)]" />
        </div>

        <motion.div 
          style={{ y: heroY, opacity: heroOpacity }}
          className="relative z-10 max-w-7xl mx-auto grid lg:grid-cols-12 gap-16 items-center w-full"
        >
          {/* Hero Left Content Column */}
          <div className="lg:col-span-6 flex flex-col justify-center text-left">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-blue-500/20 bg-blue-500/5 text-[10px] font-black uppercase tracking-[0.2em] text-blue-400 mb-6 w-fit shadow-[inset_0_1px_12px_rgba(59,130,246,0.1)]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-ping" />
              Autonomous Cross-Border Compliance Infrastructure
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.7 }}
              className="text-4xl sm:text-5xl lg:text-[64px] font-black leading-[1.05] tracking-tight text-white mb-6"
            >
              Automate Trade Logistics Operations with{' '}
              <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                AI Swarms
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="text-base sm:text-lg text-slate-400 leading-relaxed mb-8 max-w-lg font-medium"
            >
              Decimate multi-day customs logjams down to under 90 seconds. 
              Deploy dedicated neural nodes optimized to parse, classify, and validate 
              complex cross-border paperwork instantly.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4"
            >
              <button className="bg-blue-600 hover:bg-blue-500 active:scale-98 transition duration-200 px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-blue-600/20 border border-blue-500/40">
                Initialize System Demo
              </button>
              <button className="border border-white/10 hover:border-white/20 hover:bg-white/5 active:scale-98 transition duration-200 px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest text-slate-300">
                View Agent Schema
              </button>
            </motion.div>

            {/* Strategic proof markers over generic placeholder text */}
            <div className="mt-12 pt-8 border-t border-white/5 grid grid-cols-3 gap-4 text-left">
              <div>
                <p className="text-white font-mono font-black text-lg">AfCFTA</p>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-0.5">Compliant Engine</p>
              </div>
              <div>
                <p className="text-white font-mono font-black text-lg">WCO 2026</p>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-0.5">HS Tariff Base</p>
              </div>
              <div>
                <p className="text-white font-mono font-black text-lg">SOC2 Type II</p>
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mt-0.5">Enterprise Shield</p>
              </div>
            </div>
          </div>

          {/* Hero Right Interactive Component (High Conversion Utility) */}
          <div className="lg:col-span-6 w-full">
            <div className="relative bg-slate-900/40 border border-white/10 rounded-[24px] p-6 backdrop-blur-xl shadow-2xl overflow-hidden group">
              <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-70" />
              
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <span className="flex space-x-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500/40 block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/40 block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-green-500/40 block" />
                  </span>
                  <span className="text-[10px] font-mono font-bold uppercase text-slate-500 tracking-wider">nexus_engine_runtime.sh</span>
                </div>
                <div className="px-2.5 py-1 rounded-md bg-green-500/10 border border-green-500/20 text-green-400 font-mono text-[9px] uppercase tracking-widest font-bold">
                  Active Swarm Node
                </div>
              </div>

              {/* Dynamic Playground Window Tabs */}
              <div className="grid grid-cols-4 gap-2 mb-6">
                {workflowSteps.map((s, idx) => (
                  <button
                    key={s.id}
                    onClick={() => setActivePlaygroundTab(idx)}
                    className={`p-2.5 rounded-lg border text-left transition-all duration-200 ${
                      activePlaygroundTab === idx
                        ? 'bg-blue-600/10 border-blue-500/40 text-blue-400 shadow-[inset_0_1px_6px_rgba(59,130,246,0.2)]'
                        : 'bg-slate-950/40 border-white/5 text-slate-500 hover:border-white/10 hover:text-slate-400'
                    }`}
                  >
                    <p className="text-[10px] font-mono font-black">{s.id}</p>
                    <p className="text-[9px] font-bold uppercase tracking-wider truncate mt-0.5">{s.title.split(' ')[0]}</p>
                  </button>
                ))}
              </div>

              {/* Dynamic Window Display Area */}
              <div className="bg-slate-950/70 border border-white/5 rounded-xl p-5 font-mono text-xs min-h-[220px] flex flex-col justify-between relative">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activePlaygroundTab}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-blue-400 text-[11px] uppercase tracking-widest font-bold">[{workflowSteps[activePlaygroundTab].agent}]</p>
                        <h4 className="text-white text-sm font-bold tracking-tight mt-1">{workflowSteps[activePlaygroundTab].title}</h4>
                      </div>
                      <span className="text-[10px] text-slate-500 bg-white/5 px-2 py-0.5 rounded border border-white/5">
                        {workflowSteps[activePlaygroundTab].badge}
                      </span>
                    </div>
                    
                    <p className="text-slate-400 font-sans text-xs leading-relaxed">
                      {workflowSteps[activePlaygroundTab].desc}
                    </p>
                  </motion.div>
                </AnimatePresence>

                <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row justify-between gap-2 items-start sm:items-center text-[10px] text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span>Telemetric Output: <strong className="text-emerald-400 font-medium">{workflowSteps[activePlaygroundTab].metrics}</strong></span>
                  </div>
                  <span className="text-blue-500 font-bold hover:underline cursor-pointer tracking-wider uppercase text-[9px]">Inspect Logs →</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* COMPACT SCIENTIFIC METRICS SECTION */}
      <section id="features" className="py-24 px-4 bg-[#040b19] border-b border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {metrics.map((metric, index) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ delay: index * 0.1, duration: 0.5 }}
                className="group relative bg-slate-900/20 border border-white/5 rounded-2xl p-8 hover:border-blue-500/20 transition-all duration-300"
              >
                <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <h3 className="text-5xl font-black tracking-tight text-white font-mono bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent mb-2">
                  {metric.value}
                </h3>
                <h4 className="text-sm font-bold text-slate-200 mb-1 uppercase tracking-wider">
                  {metric.label}
                </h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  {metric.subtext}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* LINEAR-STYLE TIMELINE COMPLIANCE MATRIX */}
      <section id="workflow" className="py-32 px-4 max-w-7xl mx-auto">
        <div className="text-center max-w-xl mx-auto mb-20">
          <p className="text-[10px] uppercase font-black tracking-[0.25em] text-blue-500 mb-2">Deep-Dive Chronology</p>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            The Autonomous Compliance Network
          </h2>
          <p className="text-sm text-slate-400 mt-3 leading-relaxed">
            Four hyper-specialized orchestration layers engineered to communicate asynchronously, creating definitive legal customs clearances.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 relative">
          {workflowSteps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ delay: index * 0.05, duration: 0.6 }}
              className="bg-slate-900/30 border border-white/5 hover:border-white/10 rounded-2xl p-8 relative flex flex-col justify-between transition-all group"
            >
              <div>
                <div className="flex justify-between items-center mb-6">
                  <span className="font-mono text-3xl font-black text-slate-800 group-hover:text-blue-500/20 transition-colors">
                    {step.id}
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-widest bg-blue-500/10 border border-blue-500/20 text-blue-400 px-2.5 py-1 rounded-md font-bold">
                    {step.agent}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  {step.title}
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed font-medium">
                  {step.desc}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] font-mono text-slate-500">
                <span>Status: <strong className="text-slate-400 font-medium">Production Node Ready</strong></span>
                <span className="text-blue-400/80 font-bold">{step.metrics.split(' ')[0]} Verified</span>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* METAMODERN STRUCTURAL PRICING GRID */}
      <section id="pricing" className="py-32 px-4 bg-[#040b19] border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-24">
            <p className="text-[10px] uppercase font-black tracking-[0.25em] text-blue-500 mb-2">Predictable Unit Economics</p>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Scale Transactions, Not Overhead
            </h2>
            <p className="text-sm text-slate-400 mt-3 leading-relaxed">
              Transparent volume tiers built explicitly to support cross-border logistics lanes from starter agencies up to sovereign networks.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6 items-start">
            {pricing.map((tier) => (
              <div
                key={tier.name}
                className={`relative bg-slate-900/40 border rounded-2xl p-8 flex flex-col justify-between min-h-[520px] transition-all ${
                  tier.popular 
                    ? 'border-blue-500/50 shadow-[0_0_40px_rgba(37,99,235,0.15)] bg-slate-900/80 lg:-translate-y-4' 
                    : 'border-white/5'
                }`}
              >
                {tier.popular && (
                  <span className="absolute -top-3 right-6 bg-blue-600 text-[9px] font-black uppercase tracking-widest text-white px-3 py-1 rounded-full border border-blue-400/30 shadow-md">
                    Recommended Spec
                  </span>
                )}

                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-white mb-2">
                    {tier.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-medium leading-relaxed mb-6">
                    {tier.description}
                  </p>
                  
                  <div className="flex items-baseline gap-1 text-white mb-8 pb-6 border-b border-white/5">
                    <span className="text-4xl font-black font-mono tracking-tight">{tier.price}</span>
                    <span className="text-xs font-bold font-mono text-slate-500">{tier.period}</span>
                  </div>

                  <ul className="space-y-3.5">
                    {tier.features.map((feature) => (
                      <li key={feature} className="text-xs text-slate-300 flex items-start gap-2.5 leading-tight">
                        <span className="text-blue-500 font-black font-mono select-none mt-0.5">✓</span>
                        <span className="font-medium">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button 
                  className={`w-full mt-10 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest transition duration-150 ${
                    tier.popular
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/10'
                      : 'bg-slate-950 hover:bg-slate-900 border border-white/10 text-slate-300'
                  }`}
                >
                  {tier.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* METAMODERN HIGH-CONVERSION FINAL CTA */}
      <section className="py-32 px-4 max-w-7xl mx-auto">
        <div className="bg-gradient-to-b from-slate-900/60 to-slate-950/40 border border-white/10 rounded-3xl p-12 sm:p-20 text-center relative overflow-hidden shadow-2xl">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[150px] bg-blue-500/10 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="relative z-10 max-w-2xl mx-auto">
            <p className="text-[10px] uppercase font-black tracking-[0.25em] text-blue-500 mb-4">Immediate Deployment Pipeline</p>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white mb-6">
              Establish Definitive Trade Autonomy
            </h2>
            <p className="text-sm sm:text-base text-slate-400 mb-10 leading-relaxed font-medium">
              Join leading freight networks routing thousands of monthly operations automatically through autonomous agentic protocols. No upfront engineering changes required.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <button className="bg-blue-600 hover:bg-blue-500 active:scale-98 transition duration-150 px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest text-white w-full sm:w-auto shadow-xl shadow-blue-600/10">
                Book Infrastructure Audit
              </button>
              <span className="text-slate-600 font-mono text-[10px] uppercase tracking-widest font-black hidden sm:inline">OR</span>
              <button className="border border-white/10 hover:border-white/20 bg-slate-950/40 hover:bg-slate-950 transition duration-150 px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest text-slate-400 w-full sm:w-auto">
                Review Documentation API
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* MINIMALIST DESIGNER FOOTER */}
      <footer className="border-t border-white/5 py-12 px-6 text-xs text-slate-500 font-medium">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <span className="text-slate-400 font-mono font-black uppercase tracking-widest">Nexus Core</span>
            <span className="text-slate-700">|</span>
            <p>© 2026 Continental Compliance Protocol Architecture.</p>
          </div>

          <div className="flex gap-8 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <a href="#" className="hover:text-blue-500 transition-colors">Privacy Shield</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Operator Terms</a>
            <a href="#" className="hover:text-blue-500 transition-colors">Security Manifest</a>
          </div>
        </div>
      </footer>
    </div>
  );
}