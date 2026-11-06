import React, { useState, useEffect, useMemo } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';

const SECTIONS_DATA = {
  'getting-started': {
    title: 'Getting Started with Nexus Core',
    description: 'Learn how to install, configure, and set up Nexus Core, a decentralized AI execution mesh designed for autonomous agent coordination.',
    keywords: ['install', 'setup', 'config', 'start', 'node'],
    content: (
      <div className="space-y-4">
        <p className="text-gray-400">Welcome to the Nexus Core documentation. Nexus is a decentralized AI execution mesh designed for autonomous agent coordination.</p>
        <h3 className="text-xl font-bold text-white">Environment Setup</h3>
        <pre className="bg-black p-4 rounded-lg text-sm text-green-400 border border-gray-800 font-mono">
          {`DATABASE_URL="postgres://..."\nNODE_ENV="production"`}
        </pre>
      </div>
    )
  },
  'neural-mesh': {
    title: 'The Neural Mesh Infrastructure',
    description: 'Explore the high-performance infrastructure layer powering Nexus Core for secure transmission of agent state across distributed nodes.',
    keywords: ['infrastructure', 'pillar', 'nairobi', 'seo', 'architecture'],
    content: (
      <div className="space-y-6">
        <p className="text-gray-400">The Neural Mesh is our high-performance infrastructure layer. It handles the secure transmission of agent state across distributed nodes.</p>
        <div className="bg-blue-600/10 border border-blue-500/30 p-6 rounded-2xl">
          <h4 className="text-white font-bold mb-2">Deep Dive Available</h4>
          <p className="text-sm text-gray-300 mb-4">For a complete breakdown of our infrastructure, governance, and the Nairobi Node, visit our technical pillar page.</p>
          <Link 
            to="/neural-mesh" 
            className="inline-flex items-center gap-2 text-blue-400 font-bold hover:text-white transition-colors"
          >
            Explore Neural Mesh Infrastructure <span>→</span>
          </Link>
        </div>
      </div>
    )
  },
  'prisma-schema': {
    title: 'Prisma ORM & Aiven Database Integration',
    description: 'Type-safe database access and secure SSL connection configurations using Prisma ORM with Aiven PostgreSQL clusters.',
    keywords: ['database', 'orm', 'sql', 'migrations', 'ssl', 'aiven'],
    content: (
      <div className="space-y-4">
        <p className="text-gray-400">We use Prisma ORM to maintain type-safe access to our Aiven cluster. This ensures that agent data remains consistent and validated.</p>
        <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
           <p className="text-sm text-gray-300 italic font-mono uppercase tracking-tighter">Security Alert: set <code className="bg-black px-1 text-pink-400">rejectUnauthorized: false</code> for Aiven SSL chains.</p>
        </div>
      </div>
    )
  },
  'agent-governance': {
    title: 'AI Agent Governance & Role-Based Access Control',
    description: 'Understand Role-Based AI Access Control (RAAC), tiered rate limits, and Prisma-backed audit logging for enterprise AI agents.',
    keywords: ['roles', 'admin', 'tiers', 'limits', 'permissions', 'ai'],
    content: (
      <div className="space-y-6">
        <p className="text-gray-400">Nexus AI Agents operate under strict Role-Based AI Access Control (RAAC). This prevents unauthorized data escalation.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <h5 className="text-white font-bold text-sm">Tiered Execution</h5>
            <p className="text-xs text-gray-500 mt-1">Rate limits are enforced at the database level via Prisma middleware.</p>
          </div>
          <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
            <h5 className="text-white font-bold text-sm">Audit Logging</h5>
            <p className="text-xs text-gray-500 mt-1">Every agent decision is logged in the UsageAI table for forensic review.</p>
          </div>
        </div>
      </div>
    )
  },
  'deployment': {
    title: 'Nexus Deployment & Production Guide on Render',
    description: 'Step-by-step production deployment instructions for hosting Nexus Core on Render with proper TLS and environment variables.',
    keywords: ['render', 'hosting', 'production', 'build', 'tls'],
    content: (
      <div className="space-y-4">
        <p className="text-gray-400">Nexus is optimized for <strong>Render</strong> production environments.</p>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex gap-2"><span>•</span> <strong className="text-white font-mono">Build:</strong> <code>npm install && npx prisma generate</code></li>
          <li className="flex gap-2"><span>•</span> <strong className="text-white font-mono">Env:</strong> <code className="text-yellow-500">NODE_TLS_REJECT_UNAUTHORIZED=0</code></li>
        </ul>
      </div>
    )
  }
};

const DocsPage = () => {
  const { sectionId } = useParams(); // Capture dynamic URL parameter e.g. /docs/:sectionId
  const navigate = useNavigate();
  const activeSection = SECTIONS_DATA[sectionId] ? sectionId : 'getting-started';

  const [dbStatus, setDbStatus] = useState('checking');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Simulated Health Check
    setTimeout(() => setDbStatus('online'), 1000);
  }, []);

  // Dynamically update document title and meta description for SEO when section changes
  useEffect(() => {
    const currentSectionData = SECTIONS_DATA[activeSection];
    if (currentSectionData) {
      document.title = `${currentSectionData.title} | Nexus Core Docs`;
      
      let metaDesc = document.querySelector("meta[name='description']");
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.head.appendChild(metaDesc);
      }
      metaDesc.content = currentSectionData.description;
    }
  }, [activeSection]);

  // Search Logic across sections
  const filteredSections = useMemo(() => {
    return Object.keys(SECTIONS_DATA).filter((key) => {
      const section = SECTIONS_DATA[key];
      const searchContent = (section.title + section.keywords.join(' ')).toLowerCase();
      return searchContent.includes(searchQuery.toLowerCase());
    });
  }, [searchQuery]);

  return (
    <div className="flex min-h-screen bg-[#020617] text-gray-300 font-sans selection:bg-blue-500/30">
      {/* Sidebar */}
      <aside className="w-72 bg-[#0f172a] border-r border-gray-800 p-6 hidden lg:block sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg"></div>
          <span className="text-xl font-bold text-white tracking-tight italic">Nexus Docs</span>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#020617] border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-all text-white placeholder:text-gray-600"
          />
          <svg className="w-4 h-4 absolute left-3 top-2.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <nav className="space-y-1">
          {filteredSections.length > 0 ? (
            filteredSections.map((key) => (
              <button
                key={key}
                onClick={() => navigate(`/docs/${key}`)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeSection === key 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                {SECTIONS_DATA[key].title}
              </button>
            ))
          ) : (
            <p className="text-xs text-gray-600 px-4 italic">No results found...</p>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-gray-800 bg-[#020617]/80 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900 border border-gray-800">
                <span className={`h-2 w-2 rounded-full ${dbStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-500">
                  Mesh Status: {dbStatus}
                </span>
             </div>
          </div>
          <Link to="/" className="text-sm font-semibold text-blue-500 hover:text-blue-400 transition">
            Exit to Landing →
          </Link>
        </header>

        <article className="max-w-3xl mx-auto py-16 px-8">
          {SECTIONS_DATA[activeSection] ? (
            <>
              <div className="mb-2">
                <span className="text-[10px] font-mono text-blue-500 uppercase tracking-widest">Protocol // {activeSection}</span>
              </div>
              <h1 className="text-5xl font-extrabold text-white mb-6 tracking-tighter">
                {SECTIONS_DATA[activeSection].title}
              </h1>
              <div className="h-1 w-12 bg-blue-600 mb-10 rounded-full shadow-[0_0_15px_rgba(37,99,235,0.5)]"></div>
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {SECTIONS_DATA[activeSection].content}
              </div>
            </>
          ) : (
             <div className="text-center py-20 border border-dashed border-gray-800 rounded-3xl">
                <h2 className="text-2xl font-bold text-white mb-4">Signal Lost</h2>
                <button 
                  onClick={() => {setSearchQuery(''); navigate('/docs/getting-started');}} 
                  className="bg-blue-600 text-white px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                >
                  Reset Search
                </button>
             </div>
          )}
        </article>
      </main>
    </div>
  );
};

export default DocsPage;