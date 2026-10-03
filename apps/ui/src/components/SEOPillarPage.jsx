import React from 'react';
import { Helmet } from 'react-helmet';

const SEOPillarPage = () => {
  // Structured Data for Google (JSON-LD)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": "Nexus Core Neural Mesh: Secure AI Governance Infrastructure",
    "description": "A comprehensive guide to autonomous AI agent governance using Prisma, Aiven, and Node.js in Nairobi.",
    "author": {
      "@type": "Person",
      "name": "Evans Nyonje"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Nexus Core",
      "location": {
        "@type": "Place",
        "address": {
          "@type": "PostalAddress",
          "addressLocality": "Nairobi",
          "addressCountry": "Kenya"
        }
      }
    },
    "mainEntityOfPage": {
      "@type": "WebPage",
      "@id": "https://yourdomain.com/neural-mesh"
    }
  };

  return (
    <div className="neural-bg min-h-screen text-gray-300 selection:bg-blue-500/30">
      <Helmet>
        {/* Browser Tab Title */}
        <title>Nexus Core | Secure AI Mesh & Neural Governance Infrastructure</title>
        
        {/* SEO Meta Tags */}
        <meta name="description" content="Explore the Nexus Core Neural Mesh. Engineered in Nairobi for secure AI agent governance, featuring Aiven PostgreSQL and Prisma ORM integration." />
        <meta name="keywords" content="AI Mesh, AI Governance, Prisma ORM, Aiven PostgreSQL, Nairobi Tech, Autonomous Agents, Secure AI Kenya" />
        
        {/* Open Graph / Social Media */}
        <meta property="og:title" content="Nexus Core: Engineering AI Autonomy" />
        <meta property="og:description" content="High-performance AI infrastructure with hardened database-level protocols." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://yourdomain.com/neural-mesh" />

        {/* JSON-LD Structured Data Injection */}
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      </Helmet>

      {/* --- HERO SECTION --- */}
      <section className="relative pt-32 pb-20 px-8 border-b border-gray-900 bg-[#020617]/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto">
          {/* Status Badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/5 mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span className="text-[10px] font-mono font-bold text-blue-400 uppercase tracking-widest text-shadow-glow">
              Nairobi Node Active
            </span>
          </div>

          <h1 className="text-7xl lg:text-9xl font-black text-white tracking-tighter leading-[0.85] mb-8">
            ENGINEERING <br/> 
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 via-purple-500 to-blue-400">
              AUTONOMY
            </span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-500 max-w-3xl leading-relaxed font-medium">
            Nexus Core is a high-performance neural mesh designed to govern autonomous agent behavior through hardened database-level protocols and decentralized execution.
          </p>
        </div>
      </section>

      {/* --- TECHNICAL AUTHORITY SECTION --- */}
      <section id="technical-stack" className="py-24 px-8 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          <div className="space-y-12">
            <div>
              <h2 className="text-4xl font-black text-white mb-6 tracking-tight uppercase">The Persistence Layer</h2>
              <p className="text-lg text-gray-400 leading-relaxed mb-6">
                By utilizing <strong className="text-white">Aiven PostgreSQL</strong>, we ensure that every AI state transition is immutable and globally available. Our integration with <strong className="text-white">Prisma</strong> allows for real-time data validation, preventing unauthorized agent escalations at the schema level.
              </p>
            </div>
            
            <div className="p-8 bg-gray-900/40 border border-gray-800 rounded-3xl backdrop-blur-md">
              <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
                <span className="h-2 w-2 bg-blue-500 rounded-full"></span>
                Security Protocol: Zero-Trust
              </h3>
              <ul className="space-y-4 text-sm font-mono">
                <li className="flex items-center gap-3 text-gray-400 italic">
                  <span className="text-blue-500 font-bold">01</span> SSL/TLS 1.3 Certificate Pinning (Aiven)
                </li>
                <li className="flex items-center gap-3 text-gray-400 italic">
                  <span className="text-blue-500 font-bold">02</span> Row-Level Security (RLS) Policies
                </li>
                <li className="flex items-center gap-3 text-gray-400 italic">
                  <span className="text-blue-500 font-bold">03</span> Neural Gateway JWT-Auth Guards
                </li>
              </ul>
            </div>
          </div>

          {/* Interactive Card/Visual */}
          <div className="relative group">
             <div className="absolute -inset-4 bg-blue-600/20 blur-[100px] rounded-full group-hover:bg-blue-600/30 transition-all duration-1000"></div>
             <div className="relative border border-gray-800 bg-[#0f172a]/80 backdrop-blur-2xl p-12 rounded-[2.5rem] overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10 font-black text-8xl">NBO</div>
                <h3 className="text-5xl font-black text-white mb-6 italic uppercase tracking-tighter">Nairobi // HQ</h3>
                <p className="text-gray-400 text-lg mb-8 font-medium leading-relaxed">
                  The heartbeat of the Nexus network. Strategically positioned in the Silicon Savannah to leverage the world's most adaptive tech ecosystem.
                </p>
                <div className="h-1.5 w-full bg-gray-800 rounded-full overflow-hidden">
                   <div className="h-full bg-blue-600 w-1/3 animate-pulse"></div>
                </div>
                <p className="mt-4 font-mono text-[10px] text-gray-600 uppercase tracking-[0.2em]">Regional Latency: 12ms</p>
             </div>
          </div>
        </div>
      </section>

      {/* --- FAQ SECTION (FOR SEO RICH RESULTS) --- */}
      <section className="py-32 px-8 border-y border-gray-900 bg-black/40">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-black text-white mb-4 uppercase tracking-tighter">Intelligence FAQ</h2>
            <p className="text-gray-500 font-mono text-sm uppercase">Structured Data // Protocol Clarification</p>
          </div>
          
          <div className="space-y-12">
            {[
              { 
                q: "How does the Neural Mesh scale?", 
                a: "We leverage horizontal scaling via Aiven's distributed PostgreSQL clusters and edge-execution nodes managed by Node.js. This architecture allows the mesh to expand elastically without manual shard management." 
              },
              { 
                q: "What is the benefit of Prisma in AI Governance?", 
                a: "Prisma acts as our type-safe gatekeeper. It prevents injection attacks and ensures that agent-generated queries strictly adhere to the defined RAAC (Role-Based AI Access Control) schema." 
              },
              { 
                q: "Is the Nairobi Node production-ready?", 
                a: "Yes. Our Nairobi HQ serves as a Tier-1 validator node, providing redundant failover for our sub-Saharan operations and serving as the primary hub for local neural engineering talent." 
              }
            ].map((faq, i) => (
              <div key={i} className="group border-l-2 border-gray-800 pl-8 hover:border-blue-500 transition-all duration-300">
                <h4 className="text-xl font-bold text-white mb-3 group-hover:text-blue-400 transition-colors">{faq.q}</h4>
                <p className="text-gray-500 leading-relaxed text-lg">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- FOOTER CTA --- */}
      <section className="py-32 px-8 text-center bg-white">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-5xl md:text-6xl font-black text-black tracking-tighter mb-8 uppercase leading-none">
            Join the <br/> Intelligence Era.
          </h2>
          <button 
            onClick={() => window.location.href='/contact'} 
            className="group relative inline-flex items-center justify-center px-10 py-5 font-black text-white bg-black hover:bg-blue-600 transition-all duration-300 uppercase tracking-[0.2em] text-sm overflow-hidden"
          >
            <span className="relative z-10">Transmit Signal</span>
            <div className="absolute inset-0 h-full w-full bg-blue-500 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
          </button>
        </div>
      </section>
    </div>
  );
};

export default SEOPillarPage;