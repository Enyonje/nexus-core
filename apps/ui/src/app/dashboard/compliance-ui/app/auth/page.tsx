'use client';

import { motion } from 'framer-motion';
import { useState } from 'react';
import Link from 'next/link';

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [company, setCompany] = useState('');

  return (
    <div className="bg-[#020617] text-slate-100 min-h-screen flex flex-col justify-center items-center px-4 font-sans antialiased relative overflow-hidden">
      {/* Background Matrix lines matching landing page */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.08]">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md bg-slate-900/40 border border-white/10 rounded-[24px] p-8 backdrop-blur-xl shadow-2xl relative"
      >
        <div className="absolute top-0 left-1/4 right-1/4 h-[1px] bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-70" />
        
        {/* Brand Anchor */}
        <div className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-3 h-3 rounded-sm bg-blue-500" />
          <span className="text-md font-black tracking-widest text-white uppercase">
            Nexus <span className="text-blue-500">Core</span>
          </span>
        </div>

        <div className="text-center mb-6">
          <h1 className="text-xl font-black text-white uppercase tracking-wider">
            {isSignUp ? 'Initialize Operator Profile' : 'Authenticate Credentials'}
          </h1>
          <p className="text-xs text-slate-400 mt-1.5 font-medium">
            {isSignUp ? 'Establish a secure node on the autonomous clearing lane.' : 'Access secure cross-border routing nodes.'}
          </p>
        </div>

        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          {isSignUp && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="space-y-1.5"
            >
              <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Logistics Entity / Company Name</label>
              <input 
                type="text" 
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="e.g. Continental Forwarding Ltd" 
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-100 font-medium placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all font-mono"
              />
            </motion.div>
          )}

          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Operator Identity (Email Address)</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="operator@nexuscore.network" 
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-100 font-medium placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all font-mono"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">Secure Access Token (Password)</label>
            <input 
              type="password" 
              placeholder="••••••••••••" 
              className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-3 text-xs text-slate-100 font-medium placeholder-slate-600 focus:outline-none focus:border-blue-500/50 transition-all font-mono"
            />
          </div>

          <Link href="/dashboard" className="block w-full pt-2">
            <button className="w-full bg-blue-600 hover:bg-blue-500 active:scale-[0.98] transition duration-200 py-3.5 rounded-xl text-xs font-black uppercase tracking-widest border border-blue-400/30 text-white shadow-lg shadow-blue-600/10">
              {isSignUp ? 'Generate Node Credentials' : 'Mount Operational Command'}
            </button>
          </Link>
        </form>

        <div className="mt-6 pt-6 border-t border-white/5 text-center text-[11px] text-slate-500">
          <span>{isSignUp ? 'Already registered inside network layers?' : 'New instance request?'} </span>
          <button 
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-blue-400 hover:underline font-bold uppercase tracking-wider text-[10px]"
          >
            {isSignUp ? 'Establish Authentication' : 'Request Access Node'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}