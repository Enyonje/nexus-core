'use client';

import Link from 'next/link';

export default function Sidebar() {
  return (
    <aside className="w-64 bg-primary text-white min-h-screen hidden md:block">
      <div className="p-6 text-xl font-bold">Nexus Core</div>
      <nav className="flex flex-col gap-4 px-4">
        <Link href="/dashboard" className="hover:underline">Dashboard</Link>
        <Link href="/shipments" className="hover:underline">Shipments</Link>
        <Link href="/agents" className="hover:underline">Agents</Link>
      </nav>
    </aside>
  );
}