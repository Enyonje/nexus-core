import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import {
  Sparkles,
  ArrowRight,
  Clock,
  CheckCircle2,
  Workflow,
  ShieldCheck,
  Inbox,
  MessageSquare,
  ArrowLeft,
  Activity,
} from "lucide-react";

const ORIGIN = "https://nexusthecore.com";

const ARTICLES = {
  "autonomous-ai-agent-swarms-enterprise-automation": {
    slug: "autonomous-ai-agent-swarms-enterprise-automation",
    title: "How AI Agents Coordinate Multi-Step Business Workflows",
    metaTitle: "AI Agent Orchestration and Workflow Automation",
    metaDescription:
      "Understand how AI agent orchestration, execution workers, retries and audit records support multi-step business workflow automation.",
    category: "AI Architecture",
    readTime: "7 min read",
    date: "Nov 17, 2026",
    summary:
      "Explore how AI agent orchestration connects business goals, execution steps, background processing and operational oversight.",
    content: (
      <div className="space-y-6 text-slate-300 leading-relaxed">
        <p className="text-lg text-slate-200">
          Business processes often involve multiple systems, decisions and
          operational steps. Traditional automation handles predictable
          sequences well, but more complex tasks can require coordination,
          progress tracking and exception handling.
          <strong> Nexus Core</strong> brings AI agent execution and business
          workflow coordination into one platform.
        </p>

        <h2 className="text-2xl font-bold text-white mt-10 mb-4">
          From business goals to execution steps
        </h2>
        <p>
          A multi-step workflow needs more than an initial instruction. Work
          must be represented as executable steps, processed in the correct
          order and tracked until completion or failure.
        </p>
        <p>
          An orchestration architecture can connect a business goal to an
          execution record, break the work into steps and pass those steps to
          background workers. This creates a visible structure for following
          progress instead of treating the entire task as one opaque request.
        </p>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <Workflow className="w-6 h-6 text-indigo-400 mb-3" />
          <h3 className="text-white font-bold mb-2">
            A structured execution lifecycle
          </h3>
          <ol className="list-decimal pl-5 space-y-2 text-sm">
            <li>Capture a business goal.</li>
            <li>Create the associated execution and task steps.</li>
            <li>Process eligible steps through background workers.</li>
            <li>Publish progress and execution events.</li>
            <li>Record completion, failure or blocked execution states.</li>
          </ol>
        </div>

        <h2 className="text-2xl font-bold text-white mt-10 mb-4">
          Handling failures and retries
        </h2>
        <p>
          External services can fail temporarily. Network problems, rate
          limits and unavailable dependencies can interrupt individual
          operations.
        </p>
        <p>
          Retry scheduling helps distinguish work that can be attempted again
          from failures that should stop processing. A retry should be
          controlled and observable rather than silently repeating an
          operation indefinitely.
        </p>

        <h2 className="text-2xl font-bold text-white mt-10 mb-4">
          Operational visibility and audit records
        </h2>
        <p>
          Teams need to understand what happened during an execution.
          Progress events, execution states and audit records provide useful
          operational context when investigating completed, failed or blocked
          work.
        </p>

        <div className="space-y-3">
          {[
            ["Execution progress", "Follow the state of individual workflow steps."],
            ["Failure handling", "Distinguish retryable errors from failures that require intervention."],
            ["Execution audit", "Maintain records of processing outcomes and relevant event metadata."],
          ].map(([title, description]) => (
            <div key={title} className="flex gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
              <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">{title}</strong>
                <span className="text-sm text-slate-400">{description}</span>
              </div>
            </div>
          ))}
        </div>

        <h2 className="text-2xl font-bold text-white mt-10 mb-4">
          Building workflows with appropriate oversight
        </h2>
        <p>
          Automation should not mean losing control of business operations.
          Execution visibility, permission checks and mechanisms for blocking
          problematic steps are important parts of a responsible orchestration
          design.
        </p>
        <p>
          The objective is to make complex work easier to coordinate while
          keeping execution states and operational outcomes understandable.
        </p>
      </div>
    ),
  },

  "ai-customer-support-automation-supportops": {
    slug: "ai-customer-support-automation-supportops",
    title: "Customer Support Ticket Management and Workflow Automation",
    metaTitle: "Customer Support Ticket Management Software | SupportOps",
    metaDescription:
      "Learn how SupportOps helps teams organise support channels, manage tickets, assign conversations, monitor SLAs and coordinate customer support.",
    category: "Customer Support",
    readTime: "6 min read",
    date: "Nov 17, 2026",
    summary:
      "A practical look at centralising customer conversations, organising ticket queues and coordinating support teams with SupportOps.",
    content: (
      <div className="space-y-6 text-slate-300 leading-relaxed">
        <p className="text-lg text-slate-200">
          Customer support becomes harder to manage when requests arrive
          through different channels and teams have no consistent way to
          track ownership or follow-up. <strong>SupportOps</strong> by Nexus
          Core provides a workspace for organising support conversations and
          coordinating ticket workflows.
        </p>

        <h2 className="text-2xl font-bold text-white mt-10 mb-4">
          Bring support conversations into one workspace
        </h2>
        <p>
          Support teams may handle requests from web chat, email, messaging
          platforms and phone calls. SupportOps provides configurable channel
          connections and a ticket inbox for managing incoming customer
          conversations.
        </p>
        <p>
          Channel availability depends on the connection being configured
          successfully. Teams can manage channel settings and inspect
          connection details from their workspace.
        </p>

        <div className="grid md:grid-cols-2 gap-4 my-8">
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <Inbox className="w-6 h-6 text-indigo-400 mb-3" />
            <h3 className="text-white font-bold mb-2">Ticket inbox</h3>
            <p className="text-sm text-slate-400">
              Review incoming tickets, inspect conversation details and
              organise work by ticket status.
            </p>
          </div>
          <div className="p-5 bg-slate-900 border border-slate-800 rounded-2xl">
            <MessageSquare className="w-6 h-6 text-indigo-400 mb-3" />
            <h3 className="text-white font-bold mb-2">Team communication</h3>
            <p className="text-sm text-slate-400">
              Assign tickets, send customer replies and add internal notes
              for team coordination.
            </p>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-white mt-10 mb-4">
          Ticket ownership and customer replies
        </h2>
        <p>
          A support request needs a clear owner and a reliable follow-up
          process. Agents can assign tickets to themselves, review customer
          details and respond through supported channels.
        </p>
        <p>
          Internal notes provide a way to share context with colleagues
          without treating every team discussion as a customer-facing reply.
          Supported WhatsApp workflows also include message template handling
          where required.
        </p>

        <h2 className="text-2xl font-bold text-white mt-10 mb-4">
          Monitor service-level deadlines
        </h2>
        <p>
          Response targets matter when a support team is handling a growing
          queue. SLA information helps teams identify tickets approaching
          their deadlines and requests that have already exceeded them.
        </p>

        <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
          <ShieldCheck className="w-6 h-6 text-indigo-400 mb-3" />
          <h3 className="text-white font-bold mb-2">Operational oversight</h3>
          <p className="text-sm text-slate-400">
            Workspace dashboards provide ticket and channel visibility.
            Incident monitoring and activity updates support operational
            follow-up by authorised team members.
          </p>
        </div>

        <h2 className="text-2xl font-bold text-white mt-10 mb-4">
          Where AI assistance fits
        </h2>
        <p>
          AI-assisted support workflows can help teams organise incoming
          requests and reduce repetitive work. The appropriate automation
          depends on the configured capabilities, connected channels and
          workspace setup.
        </p>
        <p>
          Teams should distinguish between features available in their
          configured workspace and illustrative features shown in a product
          demonstration.
        </p>

        <div className="flex gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
          <Activity className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
          <p className="text-sm text-slate-400">
            Good support operations combine clear ticket ownership, timely
            responses, useful operational information and appropriate
            automation.
          </p>
        </div>
      </div>
    ),
  },
};

export default function BlogPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const activeArticle = ARTICLES[slug];

  const title = activeArticle
    ? `${activeArticle.metaTitle} | Nexus Core`
    : "AI and Workflow Automation Insights | Nexus Core";

  const description = activeArticle
    ? activeArticle.metaDescription
    : "Practical articles about AI agent orchestration, business workflow automation and customer support operations.";

  const canonical = activeArticle
    ? `${ORIGIN}/blog/${activeArticle.slug}`
    : `${ORIGIN}/blog`;

  return (
    <>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={description} />
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={title} />
        <meta property="og:description" content={description} />
        <meta property="og:url" content={canonical} />
        <meta property="og:image" content={`${ORIGIN}/og-image.png`} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={title} />
        <meta name="twitter:description" content={description} />
      </Helmet>

      <div className="min-h-screen bg-[#030712] text-slate-100 font-sans px-4 sm:px-6 lg:px-8 py-12">
        <div className="max-w-6xl mx-auto">
          <header className="mb-10 flex items-center justify-between border-b border-slate-800 pb-6">
            <Link to="/" className="text-xl font-extrabold tracking-tight text-white flex items-center gap-2">
              <span className="h-3 w-3 rounded-full bg-indigo-500" />
              Nexus Core <span className="text-slate-500 text-sm font-normal">/ Blog</span>
            </Link>
            <Link to="/pricing" className="text-sm font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              Explore Plans <ArrowRight className="w-4 h-4" />
            </Link>
          </header>

          {activeArticle ? (
            <article className="max-w-3xl mx-auto">
              <button
                onClick={() => navigate("/blog")}
                className="text-xs font-semibold text-indigo-400 hover:text-white mb-6 flex items-center gap-1.5"
              >
                <ArrowLeft className="w-4 h-4" /> Back to all articles
              </button>

              <div className="flex flex-wrap items-center gap-3 mb-4 text-xs">
                <span className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 font-semibold uppercase">
                  {activeArticle.category}
                </span>
                <span className="text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> {activeArticle.readTime}
                </span>
                <span className="text-slate-500">{activeArticle.date}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight mb-8">
                {activeArticle.title}
              </h1>

              {activeArticle.content}

              <div className="mt-14 p-8 rounded-3xl bg-gradient-to-br from-indigo-900/40 via-slate-900 to-slate-950 border border-indigo-500/30 text-center">
                <Sparkles className="w-8 h-8 text-indigo-400 mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  Explore Nexus Core
                </h2>
                <p className="text-slate-400 text-sm max-w-lg mx-auto mb-6">
                  Discover AI agent coordination, business workflow automation
                  and customer support operations.
                </p>
                <Link
                  to="/pricing"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm"
                >
                  Explore Plans <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </article>
          ) : (
            <main>
              <div className="text-center max-w-2xl mx-auto mb-16">
                <h1 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
                  AI and Workflow Automation Insights
                </h1>
                <p className="text-slate-400 mt-4 text-base">
                  Practical articles about AI agent orchestration, business
                  workflow automation and customer support operations.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-8">
                {Object.values(ARTICLES).map((article) => (
                  <Link
                    key={article.slug}
                    to={`/blog/${article.slug}`}
                    className="rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-indigo-500/50 p-6 flex flex-col justify-between transition-all hover:scale-[1.01]"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs mb-3">
                        <span className="text-indigo-400 font-semibold uppercase">
                          {article.category}
                        </span>
                        <span className="text-slate-500">{article.readTime}</span>
                      </div>
                      <h2 className="text-xl font-bold text-white hover:text-indigo-300 mb-3 leading-snug">
                        {article.title}
                      </h2>
                      <p className="text-slate-400 text-sm mb-6">
                        {article.summary}
                      </p>
                    </div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300 pt-4 border-t border-slate-800/60">
                      <span>Read Article</span>
                      <ArrowRight className="w-4 h-4 text-indigo-400" />
                    </div>
                  </Link>
                ))}
              </div>
            </main>
          )}
        </div>
      </div>
    </>
  );
}
