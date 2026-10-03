import Fastify from "fastify";

// Import SupportOps JS Route Plugins
import { aiRoutes } from "./supportops/routes/aiRoutes.js";
import { aiReviewRoutes } from "./supportops/routes/aiReviewRoutes.js";
import { incidentsRoutes } from "./supportops/routes/incidents.js";
import { orgAnalyticsRoutes } from "./supportops/routes/orgAnalyticsRoutes.js";
import { stripeWebhookRoutes } from "./supportops/routes/stripeWebhook.js";
import { ticketsRoutes } from "./supportops/routes/tickets.js";

const app = Fastify({ logger: true });

/* =========================
   SUPPORTOPS ROUTE REGISTRATION
========================= */

// SupportOps Endpoints
app.register(aiRoutes, { prefix: "/api/v1/supportops/ai" });
app.register(aiReviewRoutes, { prefix: "/api/v1/supportops/ai-review" });
app.register(incidentsRoutes, { prefix: "/api/v1/supportops/incidents" });
app.register(orgAnalyticsRoutes, { prefix: "/api/v1/supportops/analytics" });
app.register(ticketsRoutes, { prefix: "/api/v1/supportops/tickets" });
app.register(stripeWebhookRoutes, { prefix: "/api/v1/supportops/webhooks/stripe" });

app.listen({ port: 3000, host: "0.0.0.0" });