import Fastify from 'fastify';
import cors from '@fastify/cors';

// Initialize Logger and Fastify Server
const fastify = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' },
    },
  },
});

// ==========================================
// CORS Configuration
// ==========================================
await fastify.register(cors, {
  origin: [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
});

// ==========================================
// Lifespan / Hooks
// ==========================================
fastify.addHook('onReady', async () => {
  fastify.log.info('Initializing SupportOps Swarm Engine & Worker Pipelines...');
});

fastify.addHook('onClose', async () => {
  fastify.log.info('Shutting down SupportOps services gracefully...');
});

// ==========================================
// API Routes
// ==========================================

// Root endpoint
fastify.get('/', async (request, reply) => {
  return {
    service: 'SupportOps AI Engine',
    version: '2.4.0-production',
    status: 'running',
    docs: '/docs',
  };
});

// System Health Endpoint
fastify.get('/api/v1/system/health', async (request, reply) => {
  const minLatency = 95;
  const maxLatency = 140;
  const apiLatencyMs = Math.floor(Math.random() * (maxLatency - minLatency + 1)) + minLatency;

  return {
    status: 'healthy',
    uptime: '99.98%',
    aiEngine: 'Operational',
    orchestrator: 'Stable',
    apiLatencyMs,
    timestamp: new Date().toISOString(),
  };
});

// Dashboard Metrics Endpoint
fastify.get(
  '/api/v1/dashboard/metrics',
  {
    schema: {
      querystring: {
        type: 'object',
        properties: {
          timeframe: { type: 'string', pattern: '^(7d|30d|90d)$', default: '30d' },
        },
      },
    },
  },
  async (request, reply) => {
    const timeframe = request.query.timeframe || '30d';

    const multipliers = {
      '7d': 0.25,
      '30d': 1.0,
      '90d': 2.8,
    };

    const multiplier = multipliers[timeframe] || 1.0;

    return {
      mrr: 42850.0,
      mrrChange: '+12.4%',
      customers: 1240,
      customersChange: '+18',
      tickets: Math.floor(8420 * multiplier),
      ticketsChange: '+24%',
      aiResolutionRate: 88.5,
      aiResolutionRateChange: '+3.2%',
      timeframe,
    };
  }
);

// Server-Sent Events (SSE) Stream Endpoint
fastify.get('/api/v1/agents/activity/stream', (request, reply) => {
  reply.raw.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache, no-transform',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': request.headers.origin || '*',
    'Access-Control-Allow-Credentials': 'true',
  });

  const agentTypes = [
    'TriageAgent',
    'BillingAgent',
    'EscalationAgent',
    'ResolutionAgent',
    'SentimentAnalyzer',
  ];

  const actions = [
    'Analyzed customer intent and categorized as Priority Tier 1',
    'Auto-resolved password reset request via SSO protocol',
    'Processed tier-2 refund authorization and dispatched Stripe event',
    'Escalated sensitive enterprise SLA ticket to human ops manager',
    'Generated AI response draft using Claude 3.5 Sonnet router',
  ];

  let eventId = 1;

  const intervalId = setInterval(() => {
    const data = {
      id: `evt-${eventId}`,
      description: actions[Math.floor(Math.random() * actions.length)],
      agentType: agentTypes[Math.floor(Math.random() * agentTypes.length)],
      timestamp: new Date().toISOString(),
    };

    reply.raw.write(`id: ${eventId}\n`);
    reply.raw.write(`event: message\n`);
    reply.raw.write(`data: ${JSON.stringify(data)}\n\n`);

    eventId++;
  }, Math.floor(Math.random() * (5000 - 2500 + 1)) + 2500);

  // Handle client disconnect
  request.raw.on('close', () => {
    clearInterval(intervalId);
    fastify.log.info('SSE client disconnected.');
  });
});

// Deploy Agent Rule Endpoint
fastify.post(
  '/api/v1/agents/rules',
  {
    schema: {
      body: {
        type: 'object',
        required: ['name', 'agentType', 'triggerCondition', 'action'],
        properties: {
          name: { type: 'string' },
          agentType: { type: 'string' },
          triggerCondition: { type: 'string' },
          action: { type: 'string' },
        },
      },
    },
  },
  async (request, reply) => {
    const { name, agentType } = request.body;
    fastify.log.info(`Deploying agent rule: ${name} [${agentType}]`);

    reply.code(201);
    return {
      status: 'success',
      message: `Rule '${name}' successfully deployed to Nexus Swarm.`,
      rule_id: `rule-${Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000}`,
    };
  }
);

// Custom Error Handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  const statusCode = error.statusCode || 500;
  reply.status(statusCode).send({
    error: true,
    detail: error.message || 'Internal Server Error',
    path: request.url,
  });
});

// ==========================================
// Application Entry Point
// ==========================================
const start = async () => {
  try {
    const PORT = process.env.PORT || 8000;
    const HOST = '0.0.0.0';
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Server listening on http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();