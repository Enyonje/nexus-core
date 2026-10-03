'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';

export default function CheckoutPage() {
  return (
    <div className="bg-[#020617] text-slate-100 min-h-screen font-sans antialiased flex flex-col justify-center items-center px-4 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-[0.05]">
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-2xl bg-slate-900/30 border border-white/10 rounded-[24px] p-8 backdrop-blur-xl shadow-2xl grid md:grid-cols-12 gap-8 relative"
      >
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-70" />

        {/* Column 1: Order Summary details */}
        <div className="md:col-span-7 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
              <span className="text-xs font-mono font-black tracking-widest text-slate-400 uppercase">Billing Specification Matrix</span>
            </div>
            
            <h1 className="text-2xl font-black text-white uppercase tracking-tight mb-2">Deploying Growth Infrastructure</h1>
            <p className="text-xs text-slate-400 leading-relaxed font-medium">
              You are provisioning a high-volume autonomous processing lane configured for dedicated intra-African trade pathways.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-white/5 rounded-xl p-4 font-mono text-xs space-y-2.5">
            <div className="flex justify-between">
              <span className="text-slate-500">Infrastructure Layer:</span>
              <span className="text-slate-200">Growth Plan Cluster</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Capacity Provision:</span>
              <span className="text-slate-200">1,000 Documents/mo</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Asynchronous Pipelines:</span>
              <span className="text-slate-200">Webhooks Enabled</span>
            </div>
            <div className="border-t border-white/5 pt-2 flex justify-between font-bold text-white">
              <span>Subscription Volume Rate:</span>
              <span className="text-blue-400">$299.00 / mo</span>
            </div>
          </div>

          <p className="text-[10px] text-slate-500 leading-snug">
            By initializing this protocol integration, you permit billing cycles to recur monthly. Subscriptions scale dynamically or can be dismantled instantly at any layer point.
          </p>
        </div>

        {/* Column 2: Simulated Settlement Frame */}
        <div className="md:col-span-5 border-t md:border-t-0 md:border-l border-white/10 pt-6 md:pt-0 md:pl-6 flex flex-col justify-center">
          <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Payment Network Router</label>
              <div className="bg-slate-950 border border-white/10 rounded-xl p-3 flex justify-between items-center text-xs font-mono text-slate-400 cursor-pointer hover:border-blue-500/30 transition-all">
                <span>Credit Architecture / Card</span>
                <span className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 rounded font-bold">SECURE</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Cardholder Manifest</label>
              <input 
                type="text" 
                placeholder="Chief Logistics Officer" 
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-700 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Network Account ID</label>
              <input 
                type="text" 
                placeholder="4000 1234 5678 9010" 
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-700 focus:outline-none focus:border-blue-500/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Expiry</label>
                <input type="text" placeholder="MM/YY" className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-700 focus:outline-none focus:border-blue-500/50 text-center" />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Verification Code</label>
                <input type="text" placeholder="CVC" className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2.5 text-xs font-mono text-slate-100 placeholder-slate-700 focus:outline-none focus:border-blue-500/50 text-center" />
              </div>
            </div>

            <Link href="/dashboard" className="block w-full pt-2">
              <button className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition duration-200 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-400/30 text-white shadow-lg shadow-blue-600/10">
                Authorize Gateway Spec
              </button>
            </Link>
          </form>

          <Link href="/" className="text-center text-[10px] font-mono font-bold text-slate-500 hover:text-slate-400 mt-4 uppercase tracking-widest">
            ← Abort Transaction Protocol
          </Link>
        </div>
      </motion.div>
    </div>
  );
}