import React from 'react';

const ArchitecturePage = () => {
  const layers = [
    { title: "Neural Mesh Frontend", tech: "React, Tailwind, Framer Motion", desc: "Edge-optimized UI with real-time state synchronization." },
    { title: "API Gateway", tech: "Node.js, Express, JWT", desc: "Secure entry point with automated rate-limiting and governance." },
    { title: "Data Persistence", tech: "Prisma ORM, Aiven PostgreSQL", desc: "Highly available relational cluster with automated failover." }
  ];

  return (
    <div className="min-h-screen bg-[#020617] text-white p-8 lg:p-24">
      <h1 className="text-6xl font-black mb-4 tracking-tighter">ARCHITECTURE</h1>
      <p className="text-gray-500 mb-16 max-w-2xl">The technical backbone of Nexus Core. Built for 99.99% uptime and sub-100ms latency.</p>
      
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mt-20">
        {layers.map((layer, i) => (
          <div key={i} className="border-l border-gray-800 pl-6 py-4">
            <span className="text-blue-500 font-mono text-sm">0{i+1}</span>
            <h3 className="text-xl font-bold mt-2">{layer.title}</h3>
            <p className="text-xs text-blue-400 font-mono mb-4">{layer.tech}</p>
            <p className="text-gray-400 text-sm leading-relaxed">{layer.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ArchitecturePage;