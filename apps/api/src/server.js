// server.js
import Fastify, { FastifyInstance } from 'fastify';
import Stripe from "stripe";
import cors from "@fastify/cors";
import websocket from "@fastify/websocket";
import fastifyPostgres from "@fastify/postgres";
import fastifyJwt from "@fastify/jwt";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import "dotenv/config";

import { env } from "./config/env.js";

// Core Routes
import * as webhooksRoutesMod from "./routes/webhooks.js";
import * as authRoutesMod from "./routes/auth.js";
import * as goalsRoutesMod from "./routes/goals.js";
import * as adminRoutesMod from "./routes/admin.js";
import * as executionsRoutesMod from "./routes/executions.js";
import * as auditRoutesMod from "./routes/audit.js";
import * as paymentsRoutesMod from "./routes/payments.js";
import * as streamRoutesMod from "./routes/stream.js";
import * as stripeRoutesMod from "./routes/stripe.js";
import * as dashboardRoutesMod from "../supportops/routes/dashboard.js"; // <--- Added Dashboard Routes

// SupportOps Routes
import * as aiRoutesMod from "../supportops/routes/ai.js";
import * as aiLegacyRoutesMod from "../supportops/routes/aiRoutes.js";
import * as aiReviewRoutesMod from "../supportops/routes/aiReviewRoutes.js";
import * as channelsRoutesMod from "../supportops/routes/channelsRoutes.js";
import * as chatRoutesMod from "../supportops/routes/chatRoutes.js";
import * as incidentsRoutesMod from "../supportops/routes/incidents.js";
import * as orgAnalyticsRoutesMod from "../supportops/routes/orgAnalyticsRoutes.js";
import * as stripeWebhookRoutesMod from "../supportops/routes/stripeWebhook.js";
import * as supportopsRoutesMod from "../supportops/routes/supportops.js";
import * as ticketsRoutesMod from "../supportops/routes/ticketsRoutes.js";
import * as oldTicketsRoutesMod from "../supportops/routes/tickets.js";
import * as inviteRoutesMod from "../supportops/routes/inviteRoutes.js";
import * as readinessRoutesMod from "../supportops/routes/readinessRoutes.js";
import * as billingV1Mod from "../supportops/routes/billingRoutes.js";
import webhookRoutes from "../supportops/routes/webhooks.js";
import { initializeRealtime, closeRealtime } from "../supportops/routes/realtime.js";

function isClassConstructor(func) {
  if (typeof func !== "function") return false;
  return /^\s*class\s+/.test(Function.prototype.toString.call(func));
}

function resolvePlugin(mod, label = "unknown") {
  let picked = null;
  if (typeof mod?.default === "function" && !isClassConstructor(mod.default)) {
    picked = mod.default;
  } else if (typeof mod === "function" && !isClassConstructor(mod)) {
    picked = mod;
  } else {
    for (const key of Object.keys(mod || {})) {
      if (typeof mod[key] === "function" && !isClassConstructor(mod[key])) {
        picked = mod[key];
        break;
      }
    }
  }
  if (!picked) {
    console.warn(`[routes] ${label}: no plugin function exported`);
    return async function emptyPlugin() { };
  }
  return picked;
}

const app = Fastify({ logger: true, bodyLimit: 1048576 });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



// ==========================================
// 1. BROADCAST PRICING TIERS
// ==========================================
app.get('/api/v1/supportops/pricing', (req, res) => {
  const tiers = [
    {
      id: 'supportops_free_trial',
      name: 'SupportOps 14-Day Trial',
      description: 'Full access to autonomous agent swarms and ticket triage. No credit card required.',
      price: '$0',
      currency: 'USD',
      interval: '14 days',
      isTrial: true, // Flags frontend to bypass Stripe
    },
    {
      id: 'price_supportops_starter',
      name: 'Starter',
      price: '$199',
      interval: 'month',
      isTrial: false,
      features: [
        'Up to 5 seats',
        '500 AI resolutions / month',
        'Basic triage',
        'Email'
      ],
      cta: 'Subscribe & Setup Workspace'
    },
    {
      id: 'price_supportops_growth',
      name: 'Growth',
      price: '$699',
      interval: 'month',
      hasTrial: true,
      features: [
        'Up to 20 seats',
        '2,500 AI resolutions / month',
        'Basic triage',
        'Email',
        'In-app chat',
        'Intercom / Zendesk sync',
        'Predictive SLA engine'
      ],
      ctaTrial: 'Start 14-day trial',
      ctaSubscribe: 'Subscribe & Setup Workspace'
    },
    {
      id: 'price_supportops_enterprise',
      name: 'Enterprise',
      price: 'Custom',
      interval: 'custom',
      isEnterprise: true,
      features: [
        'Unlimited seats',
        'Custom AI resolution volume',
        'Basic triage',
        'Intercom / Zendesk sync',
        'Predictive SLA engine',
        'Custom webhook triggers',
        'SSO',
        'Role-based access control',
        'Audit logs & exports',
        'Dedicated tenant isolation'
      ],
      cta: 'Contact sales'
    }
  ];

  return { success: true, tiers };
});

const fastify = Fastify({ logger: true });
// ==========================================
// 2. PAID CHECKOUT ENDPOINT (Stripe Session)
// ==========================================
fastify.post('/api/v1/supportops/checkout', async (request, reply) => {
  try {
    const body = request.body || {};
    const { priceId, withTrial } = body;

    if (!priceId) {
      return reply.status(400).send({
        success: false,
        error: 'Missing required parameter: priceId',
      });
    }

    // Check if Stripe is configured
    if (!stripe) {
      console.warn('[SupportOps Checkout] STRIPE_SECRET_KEY is not configured on Render.');
      return reply.status(200).send({
        success: true,
        url: '/supportops/dashboard?checkout=sandbox_bypass',
      });
    }

    const sessionConfig = {
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: 'https://nexusthecore.com/supportops/dashboard?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://nexusthecore.com/supportops/pricing',
    };

    if (withTrial) {
      sessionConfig.subscription_data = {
        trial_period_days: 14,
      };
    }

    const session = await stripe.checkout.sessions.create(sessionConfig);
    return reply.status(200).send({ success: true, url: session.url });
  } catch (err) {
    fastify.log.error('[SupportOps Checkout Error]:', err.message);

    return reply.status(500).send({
      success: false,
      error: err.message || 'Failed to initialize Stripe checkout session.',
    });
  }
});



// ==========================================
// 1. FREE TRIAL ENDPOINT (No Credit Card)
// ==========================================
fastify.post('/api/v1/supportops/start-trial', async (request, reply) => {
  try {
    const body = request.body || {};
    const { planId, email } = body;

    console.log('[SupportOps Trial] Initializing trial workspace for plan:', planId);

    // TODO: Save trial state in your database
    // e.g., await db.workspaces.create({ planId, email, status: 'active_trial' });

    return reply.status(200).send({
      success: true,
      message: 'Trial workspace provisioned successfully.',
      redirectUrl: '/supportops/dashboard?trial=active',
    });
  } catch (err) {
    fastify.log.error('[SupportOps Trial Error]:', err);

    // Return a structured error response with status 200/400 to prevent uncaught 500 crashes
    return reply.status(400).send({
      success: false,
      error: 'Unable to start trial at this time.',
    });
  }
});

// ==========================================
// 4. ENTERPRISE LEAD CAPTURE / CONTACT SALES
// ==========================================
app.post('/api/v1/supportops/contact-sales', async (req, res) => {
  const { name, email, company, requirements } = req.body;

  try {
    // TODO: Send notification email to sales team or store lead in CRM

    return res.json({
      success: true,
      message: 'Sales inquiry received. Our team will contact you within 2 business hours.'
    });
  } catch (err) {
    return { success: false, error: 'Failed to submit inquiry.' };
  }
});

// ========================= IMMEDIATE HEALTH CHECK ROUTE =========================
const healthHandler = async (_req, reply) => {
  return reply.code(200).send({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
};
app.get("/health", healthHandler);
app.get("/api/health", healthHandler);
app.get("/api/v1/system/health", healthHandler);

async function start() {
  const mountBoth = (label, mod, prefixSegment) => {
    const plugin = resolvePlugin(mod, label);
    app.register(plugin, { prefix: `/api/v1/${prefixSegment}` });
    app.register(plugin, { prefix: `/api/${prefixSegment}` });
  };

  /* ========================= CORS ========================= */
  const allowedOrigins = [...new Set([
    "https://nexusthecore.com",
    "https://nexus-core-chi.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    process.env.FRONTEND_URL,
    ...(process.env.CORS_ALLOWED_ORIGINS || "").split(",").map((origin) => origin.trim()),
  ].filter(Boolean))];
  await app.register(cors, () => (req, cb) => {
    const origin = req.headers.origin;
    const isWidget = req.url.includes("/chat/widget/");
    const allowed = !origin || isWidget || allowedOrigins.includes(origin);
    cb(null, {
      origin: allowed,
      credentials: !isWidget,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Requested-With",
        "X-Org-Id",
        "X-App-Slug",
        "Accept",
        "Cache-Control",
        "Last-Event-ID",
      ],
      exposedHeaders: ["Content-Type", "Cache-Control", "Connection"],
    });
  });

  /* ========================= PLUGINS ========================= */
  await app.register(cookie, { secret: env.COOKIE_SECRET });
  await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await app.register(websocket);

  if (env.DATABASE_URL) {
    try {
      await app.register(fastifyPostgres, {
        connectionString: env.DATABASE_URL,
        ssl: env.NODE_ENV === "production"
          ? { ca: env.PG_CA_CERT, rejectUnauthorized: false }
          : false,
      });
    } catch (err) {
      console.warn("DB connection warning during boot:", err.message);
    }
  }

  await app.register(fastifyJwt, { secret: env.JWT_SECRET || "fallback-jwt" });

  /* ========================= CORE ROUTES ========================= */
  // Mount auth plugin under root /auth, /api/auth, and /api/v1/auth
  const authPlugin = resolvePlugin(authRoutesMod, "auth");
  app.register(authPlugin, { prefix: "/auth" });
  app.register(authPlugin, { prefix: "/api/auth" });
  app.register(authPlugin, { prefix: "/api/v1/auth" });
  app.register(webhookRoutes, { prefix: "/api" });
  app.register(webhookRoutes, { prefix: "/api/v1" });

  // Other Core Routes
  mountBoth("goals", goalsRoutesMod, "goals");
  mountBoth("admin", adminRoutesMod, "admin");
  mountBoth("executions", executionsRoutesMod, "executions");
  mountBoth("audit", auditRoutesMod, "audit");
  mountBoth("payments", paymentsRoutesMod, "payments");
  mountBoth("stream", streamRoutesMod, "stream");
  mountBoth("stripe", stripeRoutesMod, "stripe");
  mountBoth("dashboard", dashboardRoutesMod, ""); // <--- Registers /api/metrics, /api/dashboard/metrics, etc.

  app.register(resolvePlugin(webhooksRoutesMod, "webhooks"));

  /* ========================= SUPPORTOPS ROUTES ========================= */
  mountBoth("supportops/tickets", ticketsRoutesMod, "supportops/tickets");
  mountBoth("supportops/channels", channelsRoutesMod, "supportops/tickets/channels");
  mountBoth("supportops/chat", chatRoutesMod, "supportops/chat");
  mountBoth("supportops/invites", inviteRoutesMod, "supportops/invites");
  mountBoth("supportops/readiness", readinessRoutesMod, "supportops/readiness");
  mountBoth("supportops/tickets-legacy", oldTicketsRoutesMod, "supportops/tickets-legacy");
  mountBoth("supportops/ai", aiRoutesMod, "supportops/ai");
  mountBoth("supportops/ai-v2", aiLegacyRoutesMod, "supportops/ai-v2");
  mountBoth("supportops/ai-review", aiReviewRoutesMod, "supportops/ai-review");
  mountBoth("supportops/incidents", incidentsRoutesMod, "supportops/incidents");
  mountBoth("supportops/analytics", orgAnalyticsRoutesMod, "supportops/analytics");
  mountBoth("supportops/webhooks-stripe", stripeWebhookRoutesMod, "supportops/webhooks/stripe");
  mountBoth("supportops/supportops", supportopsRoutesMod, "supportops");
  mountBoth("billing-v1", billingV1Mod, "billing");


  /* ========================= ERROR HANDLERS ========================= */
  app.setNotFoundHandler((req, reply) => {
    reply.code(404).send({
      statusCode: 404,
      error: "Not Found",
      message: `Route ${req.method}:${req.url} not found`,
    });
  });

  app.setErrorHandler((error, req, reply) => {
    req.log.error(error);
    const status = error.statusCode || 500;
    reply.code(status).send({
      statusCode: status,
      error: error.name || "Internal Server Error",
      message: status >= 500 && env.NODE_ENV === "production"
        ? "An error occurred"
        : error.message || "An error occurred",
    });
  });

  // Shared Redis Pub/Sub is required for realtime fan-out across multiple API instances.
  await initializeRealtime();
  app.addHook("onClose", async () => {
    await closeRealtime();
  });

  const port = process.env.PORT || env.PORT || 10000;
  await app.listen({ port: Number(port), host: "0.0.0.0" });
  console.log(`🚀 API running on port ${port} in ${env.NODE_ENV || "development"} mode`);
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});