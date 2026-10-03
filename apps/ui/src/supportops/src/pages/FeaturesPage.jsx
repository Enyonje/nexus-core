export default function FeaturesPage() {
  return (
    <div className="bg-[#020617] text-white min-h-screen px-6 py-16">
      <div className="max-w-5xl mx-auto space-y-12">
        <h1 className="text-4xl md:text-5xl font-extrabold text-center">
          Why SupportOps Pro?
        </h1>
        <p className="text-slate-400 text-lg text-center max-w-3xl mx-auto">
          SupportOps Pro is the only AI‑powered platform designed to automate,
          analyze, and scale customer support. Here’s what makes us the
          inevitable choice for modern teams:
        </p>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="rounded-2xl bg-white/5 border border-white/10 p-8">
            <h3 className="text-xl font-semibold text-white">Real‑Time AI Inbox</h3>
            <p className="mt-3 text-slate-400">
              Resolve tickets instantly with WebSocket‑powered sync and
              intelligent orchestration that learns from every interaction.
            </p>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-8">
            <h3 className="text-xl font-semibold text-white">Predictive Analytics</h3>
            <p className="mt-3 text-slate-400">
              Forecast revenue, track system health, and unlock insights that
              drive strategic decisions with executive dashboards.
            </p>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-8">
            <h3 className="text-xl font-semibold text-white">Role‑Based Dashboards</h3>
            <p className="mt-3 text-slate-400">
              Tailored views for agents, executives, and investors — ensuring
              clarity, security, and control at every level.
            </p>
          </div>

          <div className="rounded-2xl bg-white/5 border border-white/10 p-8">
            <h3 className="text-xl font-semibold text-white">Seamless Integration</h3>
            <p className="mt-3 text-slate-400">
              Deploy on Vercel and plug into your existing stack with minimal
              setup. Scale effortlessly as your team grows.
            </p>
          </div>
        </div>

        <div className="text-center mt-12">
          <a
            href="/dashboard"
            className="px-6 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition"
          >
            Explore the Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}