import dotenv from "dotenv";
import express, { Request, Response } from "express";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import { initEventBus, publish, subscribe, logger } from "../shared/eventBus";

dotenv.config();

const app = express();

// Parse allowed origins cleanly from .env or fallback to default origins
const rawOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((origin) => origin.trim())
  : [
    "http://localhost:3000",
    "http://localhost:5173",
    "https://nexusthecore.com",
    "https://nexus-core-chi.vercel.app",
  ];

const corsOptions: cors.CorsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow non-browser requests (e.g. mobile apps, curl, postman, server-to-server) or matched origins
    if (!origin || rawOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Permissive fallback for dev environment
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  optionsSuccessStatus: 200,
};

// Enable CORS middleware globally
app.use(cors(corsOptions));
app.options(/^.*$/, cors(corsOptions)); // Robust wildcard handling for preflight OPTIONS requests

app.use(express.json());

// ✅ Agents API route
app.get("/api/agents", (req: Request, res: Response) => {
  res.json([
    { id: 1, name: "Agent A", status: "active" },
    { id: 2, name: "Agent B", status: "idle" },
  ]);
});

// ✅ Shipments API route
app.get("/api/shipments", (req: Request, res: Response) => {
  res.json([
    {
      id: "SH-2026-001",
      origin: "Kenya",
      destination: "South Africa",
      status: "COMPLIANCE_VERIFIED",
      hsCode: "0901.11.00",
    },
  ]);
});

// Start compliance workflow
app.post("/compliance/start", async (req: Request, res: Response) => {
  try {
    const jobId = uuidv4();

    await publish("compliance.start", {
      jobId,
      ...req.body,
    });

    res.json({ jobId, status: "started" });
  } catch (error: any) {
    logger.error({ error: error.message }, "Failed to start compliance workflow");
    res.status(500).json({ error: "Internal server error" });
  }
});

// Health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.json({ status: "ok" });
});

// Stream job progress via SSE
app.get("/compliance/:jobId/stream", async (req: Request, res: Response) => {
  const { jobId } = req.params;

  // Set SSE headers with proxy buffering protection
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  logger.info({ jobId }, "Client connected to SSE stream");

  const events = [
    "invoice.extracted",
    "hs.classified",
    "compliance.checked",
    "certificate.generated",
  ];

  const subscriptions: Array<() => void> = [];

  events.forEach((event) => {
    const unsubscribe = subscribe(event, async (data: any) => {
      if (data.jobId === jobId) {
        res.write(`data: ${JSON.stringify({ type: event, payload: data })}\n\n`);
        if (event === "certificate.generated") {
          res.write(`data: ${JSON.stringify({ type: "completed", payload: data })}\n\n`);
          res.end();
        }
      }
    });

    if (typeof unsubscribe === "function") {
      subscriptions.push(unsubscribe);
    }
  });

  // Clean up event listeners on connection loss/closing
  req.on("close", () => {
    logger.info({ jobId }, "Client disconnected from SSE stream");
    subscriptions.forEach((unsub) => unsub());
  });
});

async function start() {
  await initEventBus();

  const port = process.env.PORT || 5000;
  app.listen(port, () => {
    logger.info(`🚀 Gateway running on port ${port}`);
  });
}

start();