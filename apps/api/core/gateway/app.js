require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initEventBus, publish, subscribe, logger } = require('../../shared/eventBus');
const { v4: uuidv4 } = require('uuid');

const app = express();
app.use(express.json());

// Parse allowed origins from .env
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ["http://localhost:3000"];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  })
);

// Start compliance workflow
app.post('/compliance/start', async (req, res) => {
  const jobId = uuidv4();

  await publish('compliance.start', {
    jobId,
    ...req.body,
  });

  res.json({ jobId, status: 'started' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Stream job progress via SSE
app.get('/compliance/:jobId/stream', async (req, res) => {
  const { jobId } = req.params;

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  logger.info({ jobId }, 'Client connected to SSE stream');

  // Subscribe to all workflow events for this job
  const events = [
    'invoice.extracted',
    'hs.classified',
    'compliance.checked',
    'certificate.generated',
  ];

  events.forEach((event) => {
    subscribe(event, async (data) => {
      if (data.jobId === jobId) {
        res.write(`data: ${JSON.stringify({ type: event, payload: data })}\n\n`);
        if (event === 'certificate.generated') {
          res.write(`data: ${JSON.stringify({ type: 'completed', payload: data })}\n\n`);
          res.end();
        }
      }
    });
  });
});

async function start() {
  await initEventBus();

  app.listen(process.env.PORT || 3000, () => {
    logger.info(`🚀 Gateway running on port ${process.env.PORT || 3000}`);
  });
}

start();
