"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const uuid_1 = require("uuid");
const eventBus_1 = require("../../shared/eventBus");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Parse allowed origins from .env
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(",")
    : ["http://localhost:3000"];
app.use((0, cors_1.default)({
    origin: allowedOrigins,
    credentials: true,
}));
// Start compliance workflow
app.post("/compliance/start", async (req, res) => {
    const jobId = (0, uuid_1.v4)();
    await (0, eventBus_1.publish)("compliance.start", {
        jobId,
        ...req.body,
    });
    res.json({ jobId, status: "started" });
});
// Health check
app.get("/health", (req, res) => {
    res.json({ status: "ok" });
});
// Stream job progress via SSE
app.get("/compliance/:jobId/stream", async (req, res) => {
    const { jobId } = req.params;
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders();
    eventBus_1.logger.info({ jobId }, "Client connected to SSE stream");
    const events = [
        "invoice.extracted",
        "hs.classified",
        "compliance.checked",
        "certificate.generated",
    ];
    events.forEach((event) => {
        (0, eventBus_1.subscribe)(event, async (data) => {
            if (data.jobId === jobId) {
                res.write(`data: ${JSON.stringify({ type: event, payload: data })}\n\n`);
                if (event === "certificate.generated") {
                    res.write(`data: ${JSON.stringify({ type: "completed", payload: data })}\n\n`);
                    res.end();
                }
            }
        });
    });
});
async function start() {
    await (0, eventBus_1.initEventBus)();
    app.listen(process.env.PORT || 3000, () => {
        eventBus_1.logger.info(`🚀 Gateway running on port ${process.env.PORT || 3000}`);
    });
}
start();
