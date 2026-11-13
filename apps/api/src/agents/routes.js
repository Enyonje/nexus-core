import { loadAgentPlugins, publicAgent } from "./loader.js";
import { requireProductAuth } from "../auth/guard.js";

/** GET /api/agents, GET /api/agents/:slug, POST /api/agents/:slug/run (signed in to the agent's product). */
export function agentRoutes({ env = process.env } = {}) {
  return async function plugin(app) {
    app.get("/", async () => ({ agents: (await loadAgentPlugins()).map(publicAgent) }));

    app.get("/:slug", async (req, reply) => {
      const agent = (await loadAgentPlugins()).find((a) => a.slug === req.params.slug);
      if (!agent) return reply.code(404).send({ error: "AGENT_NOT_FOUND" });
      return publicAgent(agent);
    });

    app.post("/:slug/run", { config: { rateLimit: { max: 20, timeWindow: "1 minute" } } }, async (req, reply) => {
      const agent = (await loadAgentPlugins()).find((a) => a.slug === req.params.slug);
      if (!agent || typeof agent.run !== "function") return reply.code(404).send({ error: "AGENT_NOT_RUNNABLE" });
      await requireProductAuth(agent.product, { env })(req, reply);
      if (reply.sent) return reply;
      const output = await agent.run({ input: req.body?.input ?? {}, user: req.user, log: req.log });
      return { agent: agent.slug, output };
    });
  };
}
