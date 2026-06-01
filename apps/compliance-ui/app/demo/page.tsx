'use client';

import Link from 'next/link';

export default function DemoPage() {
  return (
    <main className="min-h-screen bg-[#07111F] text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full bg-white/5 border border-white/10 rounded-3xl p-10 shadow-lg text-center">
        <h1 className="text-3xl font-bold mb-4">Nexus Core Demo</h1>
        <p className="text-slate-300 mb-8">
          Welcome to the Nexus Core demo! Here you can explore how autonomous AI agents manage compliance workflows, shipments, and more.
        </p>
        <div className="flex flex-col gap-4 items-center">
          <Link
            href="/agents"
            className="w-full md:w-auto bg-blue-600 hover:bg-blue-700 transition text-white font-semibold py-3 px-6 rounded-xl"
          >
            View Agents Demo
          </Link>
          <Link
            href="/shipments"
            className="w-full md:w-auto bg-cyan-600 hover:bg-cyan-700 transition text-white font-semibold py-3 px-6 rounded-xl"
          >
            View Shipments Demo
          </Link>
        </div>
        <div className="mt-10 text-slate-400 text-sm">
          <Link href="/" className="underline hover:text-blue-400">
            Back to Landing Page
          </Link>
        </div>
      </div>
    </main>
  );
}