import { Link } from "react-router-dom";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-100 dark:from-gray-900 dark:to-gray-800 text-gray-900 dark:text-white">
      {/* Hero */}
      <section className="px-6 py-20 text-center max-w-5xl mx-auto">
        <h1 className="text-5xl font-extrabold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          From Workflows to Workforces — Meet Nexus Core
        </h1>
        <p className="text-lg text-gray-700 dark:text-gray-300 mb-8">
          The first AI-native SaaS that manages a dynamic digital workforce, not just tasks.
        </p>
        <div className="flex justify-center gap-4">
          <Link
            to="/register"
            className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow hover:scale-105 hover:bg-blue-700 transition"
          >
            Start Free Trial
          </Link>
          <Link
            to="/subscription"
            className="px-6 py-3 rounded-lg bg-purple-600 text-white font-semibold shadow hover:scale-105 hover:bg-purple-700 transition"
          >
            See Agentic Workflows
          </Link>
        </div>
      </section>

      {/* Problem → Solution */}
      <section className="px-6 py-16 max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
        <div className="group p-6 rounded-xl bg-white dark:bg-gray-900 shadow hover:shadow-xl transition">
          <h2 className="text-3xl font-bold mb-4 text-blue-600 dark:text-blue-400">The Problem</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Rigid workflows slow your business. Zapier/Make force you to think in “if-this-then-that” chains.
          </p>
        </div>
        <div className="group p-6 rounded-xl bg-white dark:bg-gray-900 shadow hover:shadow-xl transition">
          <h2 className="text-3xl font-bold mb-4 text-purple-600 dark:text-purple-400">The Solution</h2>
          <p className="text-gray-700 dark:text-gray-300">
            Nexus Core defines goals, spawns agents, and autonomously executes — no micromanagement required.
          </p>
        </div>
      </section>

      {/* Architecture */}
      <section className="px-6 py-20 bg-white dark:bg-gray-900">
        <h2 className="text-4xl font-bold text-center mb-12">The Architecture</h2>
        <div className="grid md:grid-cols-4 gap-8 text-center">
          {[
            ["The Architect", "Breaks down complex goals into sub-tasks using reasoning models."],
            ["Worker Swarm", "Specialized agents for APIs, databases, and UI interaction."],
            ["The Sentinel", "Audit agent monitors for hallucinations or security risks."],
            ["Generative UI", "Dynamic dashboards built in real-time based on task status."]
          ].map(([title, desc]) => (
            <div
              key={title}
              className="group p-6 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 shadow hover:scale-[1.02] transition"
            >
              <h3 className="text-xl font-semibold mb-3 text-blue-700 dark:text-blue-300">{title}</h3>
              <p className="text-gray-600 dark:text-gray-300">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Use Cases */}
      <section className="px-6 py-20 max-w-6xl mx-auto">
        <h2 className="text-4xl font-bold text-center mb-12">Use Cases</h2>
        <div className="grid md:grid-cols-3 gap-8">
          {[
            ["Client Onboarding", "Set up cloud environments automatically based on contract terms."],
            ["Compliance Reporting", "Generate and deliver reports across multiple systems with zero manual steps."],
            ["SaaS Deployment", "Deploy and monitor environments autonomously with agentic workflows."]
          ].map(([title, desc]) => (
            <div
              key={title}
              className="p-6 rounded-xl bg-white dark:bg-gray-900 shadow hover:shadow-lg transition"
            >
              <h3 className="text-xl font-semibold mb-3 text-purple-700 dark:text-purple-300">{title}</h3>
              <p className="text-gray-600 dark:text-gray-300">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing Preview */}
      <section className="px-6 py-20 bg-gray-50 dark:bg-gray-800">
        <h2 className="text-4xl font-bold text-center mb-12">Choose Your Workforce Plan</h2>
        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            ["Free", "Try agentic workflows with limited agents."],
            ["Pro", "Full execution + monitoring."],
            ["Enterprise", "Custom swarms, governance, and integrations."]
          ].map(([tier, desc]) => (
            <div
              key={tier}
              className="p-8 rounded-xl bg-white dark:bg-gray-900 shadow hover:shadow-xl transition flex flex-col items-center"
            >
              <h3 className="text-2xl font-bold mb-4">{tier}</h3>
              <p className="text-gray-600 dark:text-gray-300 mb-6 text-center">{desc}</p>
              <Link
                to="/subscription"
                className="px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 transition"
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
<footer className="px-6 py-12 text-center text-gray-600 dark:text-gray-400">
  <p className="mb-4">© {new Date().getFullYear()} Nexus Core. All rights reserved.</p>
  <nav className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
    <Link to="/docs" className="hover:text-blue-600 transition">Docs</Link>
    <Link to="/blog" className="hover:text-blue-600 transition">Blog</Link>
    <Link to="/careers" className="hover:text-blue-600 transition">Careers</Link>
    <Link to="/contact" className="hover:text-blue-600 transition">Contact</Link>
  </nav>
</footer>

    </div>
  );
}