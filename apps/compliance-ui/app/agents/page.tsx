'use client';

import { useEffect, useState } from 'react';
import {
  Bot,
  ShieldCheck,
  FileText,
  Globe,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Cpu,
  Search,
  Sparkles,
  ArrowRight,
} from 'lucide-react';

const iconMap = {
  FileText,
  Cpu,
  ShieldCheck,
  Globe,
  Bot,
  CheckCircle2,
  AlertTriangle,
  Activity,
};

type IconKey = keyof typeof iconMap;

type Agent = {
  id: string | number;
  name: string;
  icon: IconKey;
  status: string;
  color: string;
  description: string;
  metrics: {
    processed: string;
    accuracy: string;
    latency: string;
  };
};

function AgentCard({
  agent,
  selected,
  onSelect,
}: {
  agent: Agent;
  selected: boolean;
  onSelect: () => void;
}) {
  const Icon = iconMap[agent.icon] || Bot;

  return (
    <div
      onClick={onSelect}
      className={`cursor-pointer group relative overflow-hidden border rounded-3xl p-7 transition-all duration-300 ${
        selected ? 'border-blue-500/40 bg-blue-500/10' : 'border-white/10 bg-white/5'
      }`}
    >
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-center gap-6 justify-between">
        <div className="flex items-start gap-5">
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center ${agent.color}`}
          >
            <Icon className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-2xl font-semibold">{agent.name}</h3>
              <div
                className={`px-3 py-1 rounded-full text-xs font-medium ${agent.color}`}
              >
                {agent.status}
              </div>
            </div>
            <p className="text-slate-400 max-w-xl leading-relaxed">
              {agent.description}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-8">
          <div>
            <div className="text-sm text-slate-500 mb-1">Accuracy</div>
            <div className="text-xl font-bold text-green-400">
              {agent.metrics.accuracy}
            </div>
          </div>
          <div>
            <div className="text-sm text-slate-500 mb-1">Latency</div>
            <div className="text-xl font-bold">{agent.metrics.latency}</div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-white transition" />
        </div>
      </div>
    </div>
  );
}

function AgentSkeleton() {
  return (
    <div className="border border-white/10 bg-white/5 rounded-3xl p-7 animate-pulse">
      <div className="flex items-start gap-5">
        <div className="w-16 h-16 rounded-2xl bg-slate-700" />
        <div className="flex-1 space-y-3">
          <div className="h-5 w-32 bg-slate-700 rounded" />
          <div className="h-4 w-48 bg-slate-700 rounded" />
        </div>
      </div>
      <div className="flex gap-8 mt-6">
        <div className="h-4 w-20 bg-slate-700 rounded" />
        <div className="h-4 w-20 bg-slate-700 rounded" />
      </div>
    </div>
  );
}

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search state with debounce
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300); // debounce delay

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  useEffect(() => {
    async function fetchAgents() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/agents`);
        if (!res.ok) throw new Error('Failed to fetch agents');
        const data = await res.json();
        setAgents(data);
        setSelectedAgent(data[0] || null);
      } catch (err: any) {
        setError(err.message || 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    fetchAgents();
  }, []);

  const filteredAgents = agents.filter((agent) =>
    agent.name.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  return (
    <main className="min-h-screen bg-[#07111F] text-white overflow-hidden">
      <header className="sticky top-0 z-50 backdrop-blur-2xl bg-[#07111F]/70 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 lg:px-10 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nexus Core Agents</h1>
            <p className="text-slate-400 text-sm mt-1">
              Autonomous AI Workforce Management
            </p>
          </div>
          <div className="hidden md:flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 outline-none w-[260px] focus:border-blue-500/40"
              />
            </div>
            <button className="bg-[#2F80ED] hover:bg-blue-600 transition px-5 py-3 rounded-xl font-medium flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Deploy Agent
            </button>
          </div>
        </div>
      </header>

      <section className="relative z-10 max-w-7xl mx-auto px-6 lg:px-10 py-12">
        {loading ? (
          <div className="space-y-6">
            {[...Array(3)].map((_, i) => (
              <AgentSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="text-red-500 text-center mt-8">
            Failed to load agents. {error}
          </div>
        ) : !filteredAgents.length ? (
          <div className="text-center text-gray-400 mt-8">No agents found.</div>
        ) : (
          <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-8">
            <div className="space-y-6">
              {filteredAgents.map((agent) => (
                <AgentCard
                  key={agent.id}
                  agent={agent}
                  selected={selectedAgent?.id === agent.id}
                  onSelect={() => setSelectedAgent(agent)}
                />
              ))}
            </div>
            <div className="space-y-8">
              {selectedAgent && (
                <div className="bg-white/5 border border-white/10 rounded-[32px] p-8">
                  <h3 className="text-2xl font-bold mb-4">Agent Overview</h3>
                  <p className="text-slate-400 mb-6">Real-time monitoring and analytics.</p>
                  <button className="w-full bg-[#2F80ED] hover:bg-blue-600 transition py-4 rounded-2xl font-semibold">
                    Open Agent Console
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
