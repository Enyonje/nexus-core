// server.js
import Fastify from 'fastify';
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

const fastify = Fastify({ logger: true, bodyLimit: 1048576 });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);



// ==========================================
// 1. BROADCAST PRICING TIERS
// ==========================================
fastify.get('/api/v1/supportops/pricing', (req, res) => {
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

// ==========================================
// 5. LOGIN AUTHENTICATION ENDPOINT (POST)
// ==========================================
fastify.post('/api/v1/supportops/login', async (request, reply) => {
  try {
    const { email, password } = request.body || {};

    if (!email || !password) {
      return reply.status(400).send({
        success: false,
        error: 'Email and password are required.',
      });
    }

    fastify.log.info(`[Login Attempt] Authenticating user: ${email}`);

    return reply.status(200).send({
      success: true,
      message: 'Authentication successful.',
      token: 'jwt_mock_auth_token_' + Date.now(),
      redirectUrl: '/supportops/admin/executive', // Redirect to the Super Admin Dashboard after login
    });
  } catch (err) {
    fastify.log.error('[Login Error]:', err.message);
    return reply.status(500).send({
      success: false,
      error: 'Server error during authentication.',
    });
  }
});

// ==========================================
// 1. FREE TRIAL ENDPOINT -> Admin Workspace Setup Form
// ==========================================
fastify.post('/api/v1/supportops/start-trial', async (request, reply) => {
  try {
    const { planId } = request.body || {};

    return reply.status(200).send({
      success: true,
      message: 'Trial initialized successfully.',
      // Explicit route to your Admin Workspace creation form
      redirectUrl: `/supportops/onboarding?plan=${encodeURIComponent(planId || 'price_supportops_growth')}&type=trial`,
    });
  } catch (err) {
    fastify.log.error('[Start Trial Error]:', err);
    return reply.status(400).send({
      success: false,
      error: 'Unable to start trial at this time.',
    });
  }
});

// ==========================================
// 2. PAID CHECKOUT ENDPOINT -> Stripe Checkout or Sandbox Setup
// ==========================================
fastify.post('/api/v1/supportops/checkout', async (request, reply) => {
  try {
    const { priceId, withTrial } = request.body || {};

    if (!priceId) {
      return reply.status(400).send({
        success: false,
        error: 'Missing priceId parameter.',
      });
    }

    // If Stripe key is missing on Render, route to Sandbox Admin Setup rather than landing page
    if (!stripe) {
      console.warn('[Checkout] STRIPE_SECRET_KEY missing. Bypassing to onboarding sandbox.');
      return reply.status(200).send({
        success: true,
        url: `/supportops/onboarding?plan=${encodeURIComponent(priceId)}&type=paid_sandbox`,
      });
    }

    // Live Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: 'subscription',
      success_url: `${request.headers.origin || 'https://nexusthecore.com'}/supportops/onboarding?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${request.headers.origin || 'https://nexusthecore.com'}/supportops/pricing`,
      ...(withTrial && { subscription_data: { trial_period_days: 14 } }),
    });

    return reply.status(200).send({
      success: true,
      url: session.url,
    });
  } catch (err) {
    fastify.log.error('[Checkout Error]:', err.message);
    return reply.status(500).send({
      success: false,
      error: err.message || 'Failed to initialize payment session.',
    });
  }
});

// ==========================================
// 4. PROVISION WORKSPACE ENDPOINT (POST)
// ==========================================
fastify.post('/api/v1/supportops/provision-workspace', async (request, reply) => {
  try {
    const {
      companyName,
      adminName,
      adminEmail,
      password,
      teamSize,
      primaryChannel,
      planId,
      onboardingType,
      stripeSessionId,
    } = request.body || {};

    if (!companyName || !adminEmail || !password) {
      return reply.status(400).send({
        success: false,
        error: 'Missing required workspace fields (companyName, adminEmail, password).',
      });
    }

    fastify.log.info(`[Workspace Setup] Provisioning tenant "${companyName}" for admin ${adminEmail}`);

    // TODO: Hash password and store company/user details in PostgreSQL/MongoDB
    // const workspace = await db.workspaces.create({ ... });

    return reply.status(200).send({
      success: true,
      message: 'Workspace provisioned successfully.',
      token: 'jwt_mock_session_token_' + Date.now(),
      dashboardUrl: '/supportops/admin/executive', // Redirect to the admin dashboard after setup
    });
  } catch (err) {
    fastify.log.error('[Workspace Setup Error]:', err.message);
    return reply.status(500).send({
      success: false,
      error: 'Server error while provisioning workspace.',
    });
  }
});

// ==========================================
// 4. ENTERPRISE LEAD CAPTURE / CONTACT SALES
// ==========================================
fastify.post('/api/v1/supportops/contact-sales', async (req, res) => {
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

// ==========================================
// EXECUTIVE OVERVIEW ENDPOINT (GET)
// ==========================================
fastify.get('/api/v1/executive/overview', async (request, reply) => {
  try {
    return reply.status(200).send({
      success: true,
      metrics: {
        totalTickets: 1420,
        aiResolutionRate: '88.4%',
        activeAgents: 14,
        avgResponseTime: '1.2m',
        monthlyRecurringRevenue: '$14,500',
      },
      tickets: [
        {
          id: 'T-1042',
          subject: 'Payment failed twice at checkout',
          customer: 'Amina K.',
          channel: 'whatsapp',
          priority: 'high',
          slaMins: 12,
        }
      ],
      systemHealth: 'Optimal',
    });
  } catch (err) {
    fastify.log.error('[Executive Overview Error]:', err.message);
    return reply.status(500).send({
      success: false,
      error: 'Failed to retrieve executive overview metrics.',
    });
  }
});

// ==========================================
// 1. WORKSPACE METRICS ENDPOINT (GET)
// ==========================================
fastify.get('/api/v1/supportops/metrics', async (request, reply) => {
  try {
    const { timeframe = '30d' } = request.query;
    fastify.log.info({ timeframe }, '[Metrics] Fetching workspace KPIs');

    return reply.status(200).send({
      success: true,
      avgFirstResponseMin: 4.2,
      csat: 96.5,
      backlog: 18,
      slaCompliance: 98.2,
      avgResolutionHours: 1.8,
      aiResolutionRate: 84.5,
      seatsUsed: 12,
      seatLimit: 25,
      tickets: 1420,
      mrr: 14500,
      customers: 340,
      mrrChange: '+14.2% vs last month',
      customersChange: '+8.4% new accounts',
      ticketsChange: '+12.1% volume',
      byChannel: {
        whatsapp: 540,
        email: 380,
        voice: 220,
        web: 180,
        sms: 60,
        social: 40,
      },
    });
  } catch (err) {
    fastify.log.error('[Metrics Error]:', err.message);
    return reply.status(500).send({ success: false, error: 'Failed to fetch metrics.' });
  }
});

// ==========================================
// 2. SYSTEM HEALTH ENDPOINT (GET)
// ==========================================
fastify.get('/api/v1/health', async (request, reply) => {
  return reply.status(200).send({
    success: true,
    apiLatencyMs: 38,
    uptime: '99.98% operational',
  });
});

// ==========================================
// 3. TICKETS LIST ENDPOINT (GET)
// ==========================================
fastify.get('/api/v1/supportops/tickets', async (request, reply) => {
  try {
    const { status = 'open', limit = 10 } = request.query;

    const mockTickets = [
      {
        id: 'T-1042',
        subject: 'Payment failed twice at checkout',
        customer: 'Amina K.',
        channel: 'whatsapp',
        priority: 'high',
        slaMins: 12,
      },
      {
        id: 'T-1041',
        subject: 'Missed call: delivery not received',
        customer: 'Brian O.',
        channel: 'voice',
        priority: 'urgent',
        slaMins: -8, // Breached
      },
      {
        id: 'T-1039',
        subject: 'Invoice copy request',
        customer: 'Nia Traders',
        channel: 'email',
        priority: 'low',
        slaMins: 190,
      },
      {
        id: 'T-1037',
        subject: 'Cannot reset password',
        customer: 'Joy M.',
        channel: 'web',
        priority: 'normal',
        slaMins: 55,
      },
    ];

    return reply.status(200).send({
      success: true,
      items: mockTickets.slice(0, Number(limit)),
    });
  } catch (err) {
    return reply.status(500).send({ success: false, error: 'Failed to fetch tickets.' });
  }
});

// ==========================================
// 4. CHANNELS STATUS ENDPOINT (GET)
// ==========================================
fastify.get('/api/v1/supportops/tickets/channels', async (request, reply) => {
  return reply.status(200).send({
    success: true,
    channels: [
      { key: 'whatsapp', connected: true },
      { key: 'voice', connected: true },
      { key: 'email', connected: true },
      { key: 'sms', connected: false },
      { key: 'web', connected: true },
      { key: 'social', connected: false },
    ],
  });
});

// ==========================================
// 5. TEAM INVITATIONS ENDPOINTS (GET, POST, DELETE)
// ==========================================
const mockInvites = [
  {
    id: 'inv_101',
    email: 'agent.lead@company.com',
    role: 'agent',
    status: 'pending',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 5).toISOString(),
  },
];

fastify.get('/api/v1/supportops/invites', async (request, reply) => {
  return reply.status(200).send({
    success: true,
    items: mockInvites,
  });
});

fastify.post('/api/v1/supportops/invites', async (request, reply) => {
  const { email, role } = request.body || {};
  if (!email) {
    return reply.status(400).send({ success: false, error: 'Email is required.' });
  }

  const newInvite = {
    id: 'inv_' + Date.now(),
    email,
    role: role || 'agent',
    status: 'pending',
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 86400000 * 7).toISOString(),
  };

  mockInvites.push(newInvite);

  return reply.status(201).send({
    success: true,
    message: `Invitation sent to ${email}`,
    invite: newInvite,
  });
});

fastify.delete('/api/v1/supportops/invites/:id', async (request, reply) => {
  const { id } = request.params;
  const index = mockInvites.findIndex((inv) => inv.id === id);

  if (index !== -1) {
    mockInvites.splice(index, 1);
  }

  return reply.status(200).send({
    success: true,
    message: 'Invitation revoked successfully.',
  });
});

// ==========================================
// 6. LIVE ACTIVITY STREAM (Server-Sent Events)
// ==========================================
fastify.get('/api/v1/activity/stream', async (request, reply) => {
  reply.raw.setHeader('Content-Type', 'text/event-stream');
  reply.raw.setHeader('Cache-Control', 'no-cache');
  reply.raw.setHeader('Connection', 'keep-alive');

  const sendEvent = (description) => {
    const payload = JSON.stringify({
      id: Date.now(),
      description,
      timestamp: new Date().toISOString(),
    });
    reply.raw.write(`data: ${payload}\n\n`);
  };

  // Send initial connected event
  sendEvent('Agent workspace stream connected');

  // Send periodic mock updates
  const interval = setInterval(() => {
    const eventsList = [
      'AI resolved WhatsApp ticket #T-1042 automatically',
      'New voice inquiry queued from Brian O.',
      'Agent accepted ticket #T-1037',
      'SLA warning triggered for urgent ticket #T-1041',
    ];
    const randomEvent = eventsList[Math.floor(Math.random() * eventsList.length)];
    sendEvent(randomEvent);
  }, 15000);

  request.raw.on('close', () => {
    clearInterval(interval);
  });
});

// ========================= IMMEDIATE HEALTH CHECK ROUTE =========================
const healthHandler = async (_req, reply) => {
  return reply.code(200).send({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
};
fastify.get("/health", healthHandler);
fastify.get("/api/health", healthHandler);
fastify.get("/api/v1/system/health", healthHandler);

async function start() {
  const mountBoth = (label, mod, prefixSegment) => {
    const plugin = resolvePlugin(mod, label);
    fastify.register(plugin, { prefix: `/api/v1/${prefixSegment}` });
    fastify.register(plugin, { prefix: `/api/${prefixSegment}` });
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
  await fastify.register(cors, () => (req, cb) => {
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
  await fastify.register(cookie, { secret: env.COOKIE_SECRET });
  await fastify.register(rateLimit, { max: 120, timeWindow: "1 minute" });
  await fastify.register(websocket);

  if (env.DATABASE_URL) {
    try {
      await fastify.register(fastifyPostgres, {
        connectionString: env.DATABASE_URL,
        ssl: env.NODE_ENV === "production"
          ? { ca: env.PG_CA_CERT, rejectUnauthorized: false }
          : false,
      });
    } catch (err) {
      console.warn("DB connection warning during boot:", err.message);
    }
  }

  await fastify.register(fastifyJwt, { secret: env.JWT_SECRET || "fallback-jwt" });

  /* ========================= CORE ROUTES ========================= */
  // Mount auth plugin under root /auth, /api/auth, and /api/v1/auth
  const authPlugin = resolvePlugin(authRoutesMod, "auth");
  fastify.register(authPlugin, { prefix: "/auth" });
  fastify.register(authPlugin, { prefix: "/api/auth" });
  fastify.register(authPlugin, { prefix: "/api/v1/auth" });
  fastify.register(webhookRoutes, { prefix: "/api" });
  fastify.register(webhookRoutes, { prefix: "/api/v1" });

  // Other Core Routes
  mountBoth("goals", goalsRoutesMod, "goals");
  mountBoth("admin", adminRoutesMod, "admin");
  mountBoth("executions", executionsRoutesMod, "executions");
  mountBoth("audit", auditRoutesMod, "audit");
  mountBoth("payments", paymentsRoutesMod, "payments");
  mountBoth("stream", streamRoutesMod, "stream");
  mountBoth("stripe", stripeRoutesMod, "stripe");
  mountBoth("dashboard", dashboardRoutesMod, ""); // <--- Registers /api/metrics, /api/dashboard/metrics, etc.
  // Sales Assistant is an independent, tenant-scoped product module.
  fastify.register(salesAssistantRoutes, { prefix: "/api/sales-assistant" });

  fastify.register(resolvePlugin(webhooksRoutesMod, "webhooks"));

  /* ========================= SUPPORTOPS ROUTES ========================= */
  /*mountBoth("supportops/tickets", ticketsRoutesMod, "supportops/tickets");
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
  mountBoth("billing-v1", billingV1Mod, "billing");*/


  /* ========================= ERROR HANDLERS ========================= */
  fastify.setNotFoundHandler((req, reply) => {
    reply.code(404).send({
      statusCode: 404,
      error: "Not Found",
      message: `Route ${req.method}:${req.url} not found`,
    });
  });

  fastify.setErrorHandler((error, req, reply) => {
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
  fastify.addHook("onClose", async () => {
    await closeRealtime();
  });

  const port = process.env.PORT || env.PORT || 10000;
  await fastify.listen({ port: Number(port), host: "0.0.0.0" });
  console.log(`🚀 API running on port ${port} in ${env.NODE_ENV || "development"} mode`);
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});