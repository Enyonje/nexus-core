import React, { useState, useEffect, useMemo } from 'react';

const DocsPage = () => {
  const [activeSection, setActiveSection] = useState('getting-started');
  const [dbStatus, setDbStatus] = useState('checking');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    // Simulated Health Check
    setTimeout(() => setDbStatus('online'), 1000);
  }, []);

  const sections = {
    'getting-started': {
      title: 'Getting Started',
      keywords: ['install', 'setup', 'config', 'start', 'node'],
      content: (
        <div className="space-y-4">
          <p className="text-gray-400">Welcome to the Nexus Core documentation. Nexus is a decentralized AI execution mesh.</p>
          <h3 className="text-xl font-bold text-white">Environment Setup</h3>
          <pre className="bg-black p-4 rounded-lg text-sm text-green-400 border border-gray-800">
            {`DATABASE_URL="postgres://..."\nNODE_ENV="production"`}
          </pre>
        </div>
      )
    },
    'prisma-schema': {
      title: 'Prisma & Aiven',
      keywords: ['database', 'orm', 'sql', 'migrations', 'ssl', 'aiven'],
      content: (
        <div className="space-y-4">
          <p className="text-gray-400">We use Prisma ORM to maintain type-safe access to our Aiven cluster.</p>
          
          <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg">
             <p className="text-sm text-gray-300">Aiven certificate handling: set <code className="bg-black px-1">rejectUnauthorized: false</code>.</p>
          </div>
        </div>
      )
    },
    'agent-governance': {
      title: 'AI Agent Governance',
      keywords: ['roles', 'admin', 'tiers', 'limits', 'permissions', 'ai'],
      content: (
        <div className="space-y-6">
          <p className="text-gray-400">Nexus AI Agents operate under strict governance rules defined in the database.</p>
          
        </div>
      )
    },
    'deployment': {
      title: 'Deployment Guide',
      keywords: ['render', 'hosting', 'production', 'build', 'tls'],
      content: (
        <div className="space-y-4">
          <p className="text-gray-400">Nexus is optimized for <strong>Render</strong>.</p>
          <ul className="space-y-2 text-sm text-gray-400">
            <li><strong>Build:</strong> <code className="bg-gray-800 p-1">npm install && npx prisma generate</code></li>
            <li><strong>Env:</strong> <code className="bg-gray-800 p-1 text-yellow-500">NODE_TLS_REJECT_UNAUTHORIZED=0</code></li>
          </ul>
        </div>
      )
    }
  };

  // Search Logic
  const filteredSections = useMemo(() => {
    return Object.keys(sections).filter((key) => {
      const section = sections[key];
      const searchContent = (section.title + section.keywords.join(' ')).toLowerCase();
      return searchContent.includes(searchQuery.toLowerCase());
    });
  }, [searchQuery]);

  return (
    <div className="flex min-h-screen bg-[#020617] text-gray-300 font-sans">
      {/* Sidebar */}
      <aside className="w-72 bg-[#0f172a] border-r border-gray-800 p-6 hidden lg:block sticky top-0 h-screen">
        <div className="flex items-center gap-3 mb-8">
          <div className="h-8 w-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg shadow-lg shadow-blue-500/20"></div>
          <span className="text-xl font-bold text-white tracking-tight">Nexus Docs</span>
        </div>

        {/* Search Bar */}
        <div className="relative mb-6">
          <input
            type="text"
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#020617] border border-gray-700 rounded-lg py-2 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 transition-all text-white"
          />
          <svg className="w-4 h-4 absolute left-3 top-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        
        <nav className="space-y-1">
          {filteredSections.length > 0 ? (
            filteredSections.map((key) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                  activeSection === key 
                  ? 'bg-blue-600/10 text-blue-400 border border-blue-500/20' 
                  : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                {sections[key].title}
              </button>
            ))
          ) : (
            <p className="text-xs text-gray-600 px-4">No results found...</p>
          )}
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <header className="h-16 border-b border-gray-800 bg-[#020617]/80 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-gray-900 border border-gray-800">
                <span className={`h-2 w-2 rounded-full ${dbStatus === 'online' ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></span>
                <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
                  Mesh: {dbStatus}
                </span>
             </div>
          </div>
          <a href="/" className="text-sm font-semibold text-blue-500 hover:text-blue-400 transition">
            Exit to Landing →
          </a>
        </header>

        <div className="max-w-3xl mx-auto py-16 px-8">
          {sections[activeSection] ? (
            <>
              <h1 className="text-5xl font-extrabold text-white mb-6 tracking-tighter">
                {sections[activeSection].title}
              </h1>
              <div className="h-1 w-20 bg-blue-600 mb-10 rounded-full"></div>
              <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                {sections[activeSection].content}
              </div>
            </>
          ) : (
             <div className="text-center py-20">
                <h2 className="text-2xl font-bold text-white">Section not found</h2>
                <button onClick={() => {setSearchQuery(''); setActiveSection('getting-started');}} className="mt-4 text-blue-500 underline">Reset Search</button>
             </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default DocsPage;