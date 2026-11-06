import React, { useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, Clock, Zap, ShieldCheck, Database, Server, CheckCircle2, ArrowLeft } from 'lucide-react';

const ARTICLES = {
  'autonomous-ai-agent-swarms-enterprise-automation': {
    slug: 'autonomous-ai-agent-swarms-enterprise-automation',
    title: 'Architecting Autonomous AI Agent Swarms for Enterprise Workflow Automation',
    metaTitle: 'AI Agent Swarms for Enterprise Automation | Nexus Core',
    metaDescription: 'Learn how self-healing AI agent swarms orchestrate complex business goals, handle runtime errors, and replace static workflow pipelines.',
    category: 'AI Architecture',
    readTime: '8 min read',
    author: 'Evans Nyonje',
    date: 'Nov 4, 2026',
    summary: 'Traditional workflow automation relies on rigid, deterministic conditional logic. Autonomous AI agent swarms introduce self-healing mesh architectures that adapt to dynamic execution states.',
    content: (
      <div className="space-y-6 text-slate-300 leading-relaxed">
        <p className="text-lg text-slate-200">
          As enterprise tech stacks grow more complex, rigid workflow automation (such as static Zapier triggers or brittle hardcoded scripts) breaks under non-deterministic data payloads. <strong>Nexus Core</strong> shifts this paradigm by introducing self-healing <em>AI Agent Swarms</em>.
        </p>

        <h2 className="text-2xl font-bold text-white mt-10 mb-4 border-b border-slate-800 pb-2">
          Why Deterministic Pipelines Fail at Scale
        </h2>
        <p>
          Traditional automation platforms execute strictly sequential code blocks ($A \rightarrow B \rightarrow C$). If Step B Encounters an unexpected JSON schema change, a third-party API rate limit, or network latency, the pipeline halts entirely, requiring human developer intervention.
        </p>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl my-6">
          <h4 className="text-indigo-400 font-bold mb-2 flex items-center gap-2">
            <Zap className="w-5 h-5" /> The Nexus Agent Mesh Solution
          </h4>
          <p className="text-sm text-slate-300">
            Agents operate within a continuous, non-blocking feedback loop. When an execution step encounters an anomaly, the agent inspects the stack trace, adjusts its parameters dynamically, and reroutes task fulfillment without failing the global process.
          </p>
        </div>

        <h2 className="text-2xl font-bold text-white mt-10 mb-4 border-b border-slate-800 pb-2">
          Role-Based AI Access Control (RAAC)
        </h2>
        <p>
          Deploying autonomous agents requires strict runtime guardrails. Through our database-enforced permissions layer, agents are restricted to explicit role matrices, preventing unauthorized privilege escalation or accidental data exposure.
        </p>

        <ul className="space-y-3 my-6">
          <li className="flex items-start gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">State Telemetry & Inspection:</strong>
              <span className="text-sm text-slate-400">Every agent decision is logged step-by-step with low-latency streaming telemetry for real-time auditability.</span>
            </div>
          </li>
          <li className="flex items-start gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-white block">Self-Healing Execution:</strong>
              <span className="text-sm text-slate-400">Failed database queries or webhooks automatically trigger fallback routing protocols before alerting engineers.</span>
            </div>
          </li>
        </ul>

        <div className="border-l-4 border-indigo-500 pl-5 py-3 my-8 bg-indigo-500/5 text-slate-200 italic font-medium">
          "Autonomous workforce orchestration is not just about raw LLM prompts—it requires state persistence, telemetry, and strict tenant data isolation."
        </div>
      </div>
    )
  },
  'ai-customer-support-automation-supportops': {
    slug: 'ai-customer-support-automation-supportops',
    title: 'How SupportOps Pro Reduces Support Ticket Resolution Times by 70%',
    metaTitle: 'AI Support Ticket Automation & Triage | SupportOps Pro',
    metaDescription: 'Discover how automated AI ticket triage, predictive SLA engines, and real-time agent telemetry stream visualization scale SaaS customer support.',
    category: 'SupportOps',
    readTime: '6 min read',
    author: 'Nexus Engineering',
    date: 'Oct 28, 2026',
    summary: 'Scaling B2B SaaS support without inflating headcount requires AI agents that do more than output canned responses—they must take direct action within your helpdesk.',
    content: (
      <div className="space-y-6 text-slate-300 leading-relaxed">
        <p className="text-lg text-slate-200">
          Modern B2B SaaS customers demand instant resolutions, yet helpdesk teams spend over 40% of their day on manual ticket tagging, initial triage, and repetitive tier-1 routing.
        </p>

        <h2 className="text-2xl font-bold text-white mt-10 mb-4 border-b border-slate-800 pb-2">
          Autonomous Ticket Triage vs. Legacy Chatbots
        </h2>
        <p>
          Legacy support bots fail because they act as superficial search interfaces over static documentation. <strong>SupportOps Pro</strong> operates at the application layer—connecting inbound customer inquiries directly to live database states and third-party APIs.
        </p>

        <div className="grid md:grid-cols-2 gap-4 my-8">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <ShieldCheck className="w-6 h-6 text-indigo-400 mb-2" />
            <h4 className="text-white font-bold mb-1">Predictive SLA Engine</h4>
            <p className="text-xs text-slate-400">Automatically evaluates account tier and deadline parameters to prioritize high-value enterprise tickets before breaches occur.</p>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <Server className="w-6 h-6 text-indigo-400 mb-2" />
            <h4 className="text-white font-bold mb-1">Bidirectional Webhooks</h4>
            <p className="text-xs text-slate-400">Syncs resolution status effortlessly with Intercom, Zendesk, Jira, and GitHub without manual data re-entry.</p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mt-10 mb-4 border-b border-slate-800 pb-2">
          Real-Time Telemetry & Agent Control
        </h2>
        <p>
          Human support managers retain full oversight. Through continuous Server-Sent Events (SSE), supervisors watch AI reasoning in real time and can override agent responses with a single click.
        </p>
      </div>
    )
  },
  'aws-finops-cost-optimization-auditing-guide': {
    slug: 'aws-finops-cost-optimization-auditing-guide',
    title: 'AWS FinOps & Cloud Cost Optimization: Audit Secrets Every DevOps Engineer Needs',
    metaTitle: 'AWS FinOps & Cloud Cost Optimization Guide | Nexus Core',
    metaDescription: 'Learn how to audit cloud resource utilization using secure read-only IAM templates, eliminate idle database instances, and cut AWS bills.',
    category: 'DevOps & FinOps',
    readTime: '7 min read',
    author: 'Evans Nyonje',
    date: 'Oct 15, 2026',
    summary: 'Unused cloud resources and misconfigured database provisioning cost enterprises millions annually. Here is a practical FinOps playbook for cloud auditing.',
    content: (
      <div className="space-y-6 text-slate-300 leading-relaxed">
        <p className="text-lg text-slate-200">
          Cloud sprawl is a major operational drain for expanding technology platforms. Unattached EBS volumes, over-provisioned RDS databases, and forgotten staging environments silently erode SaaS margins.
        </p>

        <h2 className="text-2xl font-bold text-white mt-10 mb-4 border-b border-slate-800 pb-2">
          Zero-Trust Infrastructure Auditing
        </h2>
        <p>
          Security must remain uncompromised during cost analysis. Always mandate read-only CloudFormation IAM templates so optimization auditing engines can analyze metric trends without write access.
        </p>

        <h2 className="text-2xl font-bold text-white mt-10 mb-4 border-b border-slate-800 pb-2">
          Top 3 Instant Cost Reduction Targets
        </h2>
        <ol className="space-y-4 my-6">
          <li className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <strong className="text-white block mb-1">1. Staging Database Auto-Scaling:</strong>
            <span className="text-sm text-slate-400">Scale down non-production relational database instances automatically during off-peak hours to reduce uptime overhead.</span>
          </li>
          <li className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <strong className="text-white block mb-1">2. Automated Container Lifecycle Policies:</strong>
            <span className="text-sm text-slate-400">Enforce ECR retention rules to purge untagged build artifacts older than 14 days automatically.</span>
          </li>
          <li className="bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <strong className="text-white block mb-1">3. Orphaned Volume Snapshots:</strong>
            <span className="text-sm text-slate-400">Identify and prune volume backups associated with long-terminated instances.</span>
          </li>
        </ol>
      </div>
    )
  }
};

export default function BlogPage() {
  const { slug } = useParams();
  const navigate = useNavigate();

  // Selected article resolution (works with URL parameter or direct click)
  const activeArticle = ARTICLES[slug];

  useEffect(() => {
    if (activeArticle) {
      document.title = `${activeArticle.metaTitle} | Nexus Core Blog`;
    } else {
      document.title = "Engineering & AI Insights | Nexus Core Blog";
    }
  }, [activeArticle]);

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans px-4 sm:px-6 lg:px-8 py-12">
      <div className="max-w-6xl mx-auto">
        {/* Header Breadcrumb */}
        <header className="mb-10 flex items-center justify-between border-b border-slate-800 pb-6">
          <Link to="/" className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-indigo-500 animate-pulse"></span>
            Nexus Core <span className="text-slate-500 text-sm font-normal">/ Blog</span>
          </Link>
          <Link to="/pricing" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
            Start Free Trial <ArrowRight className="w-4 h-4" />
          </Link>
        </header>

        {activeArticle ? (
          /* Single Article View */
          <article className="max-w-3xl mx-auto animate-in fade-in duration-300">
            <button 
              onClick={() => navigate('/blog')}
              className="text-xs font-semibold text-indigo-400 hover:text-white mb-6 transition-colors flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" /> Back to all articles
            </button>
            <div className="flex items-center gap-3 mb-4 text-xs">
              <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-semibold uppercase tracking-wider">
                {activeArticle.category}
              </span>
              <span className="text-slate-500 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {activeArticle.readTime}</span>
              <span className="text-slate-500">• {activeArticle.date}</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-6">
              {activeArticle.title}
            </h1>
            <div className="flex items-center gap-3 pb-8 border-b border-slate-800 mb-8 text-sm text-slate-400">
              <div className="h-9 w-9 rounded-full bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400">
                EN
              </div>
              <div>
                <p className="text-white font-medium">{activeArticle.author}</p>
                <p className="text-xs text-slate-500">Software Engineer & DevOps Specialist</p>
              </div>
            </div>

            {activeArticle.content}

            {/* Conversion Banner */}
            <div className="mt-14 p-8 rounded-3xl bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-950 border border-indigo-500/30 shadow-2xl text-center">
              <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
              <h3 className="text-2xl font-bold text-white mb-2">Ready to Automate Your SaaS Workflows?</h3>
              <p className="text-slate-400 text-sm max-w-lg mx-auto mb-6">
                Deploy autonomous self-healing AI agent swarms and SupportOps ticket triage for your enterprise today.
              </p>
              <Link 
                to="/pricing" 
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all"
              >
                Explore Workspace Plans <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </article>
        ) : (
          /* Main Blog Listing */
          <div>
            <div className="text-center max-w-2xl mx-auto mb-16">
              <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                Engineering & AI Insights
              </h1>
              <p className="text-slate-400 mt-4 text-base">
                Technical guides on AI workforce orchestration, autonomous customer support, and cloud infrastructure optimization.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {Object.values(ARTICLES).map((art) => (
                <div 
                  key={art.slug}
                  onClick={() => navigate(`/blog/${art.slug}`)}
                  className="rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/50 p-6 flex flex-col justify-between cursor-pointer transition-all hover:scale-[1.02] group"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs mb-3">
                      <span className="text-indigo-400 font-semibold uppercase tracking-wider">{art.category}</span>
                      <span className="text-slate-500">{art.readTime}</span>
                    </div>
                    <h2 className="text-xl font-bold text-white group-hover:text-indigo-300 transition-colors mb-3 leading-snug">
                      {art.title}
                    </h2>
                    <p className="text-slate-400 text-sm line-clamp-3 mb-6">
                      {art.summary}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-300 pt-4 border-t border-slate-800/60">
                    <span>Read Article</span>
                    <ArrowRight className="w-4 h-4 text-indigo-400 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}