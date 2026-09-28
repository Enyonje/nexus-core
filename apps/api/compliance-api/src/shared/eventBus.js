"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logger = void 0;
exports.initEventBus = initEventBus;
exports.publish = publish;
exports.subscribe = subscribe;
exports.shutdown = shutdown;
const pino_1 = __importDefault(require("pino"));
const nats_1 = require("nats");
const redis_1 = require("redis");
const logger = (0, pino_1.default)({ level: process.env.LOG_LEVEL || "info" });
exports.logger = logger;
let nc = null; // NATS connection
const sc = (0, nats_1.StringCodec)();
let pubClient = null; // Redis publisher
let subClient = null; // Redis subscriber
async function initEventBus() {
    const backend = process.env.EVENT_BUS || "redis"; // default to redis
    if (backend === "nats") {
        if (nc)
            return nc;
        nc = await (0, nats_1.connect)({
            servers: process.env.NATS_URL || "nats://localhost:4222",
            maxReconnectAttempts: -1,
        });
        logger.info("✅ Connected to NATS EventBus");
        return nc;
    }
    else {
        if (pubClient && subClient)
            return { pubClient, subClient };
        pubClient = (0, redis_1.createClient)({ url: process.env.REDIS_URL });
        subClient = (0, redis_1.createClient)({ url: process.env.REDIS_URL });
        pubClient.on("error", (err) => logger.error("Redis Pub Error: " + err));
        subClient.on("error", (err) => logger.error("Redis Sub Error: " + err));
        await pubClient.connect();
        await subClient.connect();
        logger.info("✅ Connected to Redis EventBus");
        return { pubClient, subClient };
    }
}
async function publish(subject, payload) {
    const backend = process.env.EVENT_BUS || "redis";
    if (backend === "nats") {
        if (!nc)
            throw new Error("NATS not initialized");
        nc.publish(subject, sc.encode(JSON.stringify(payload)));
        logger.info(`Published to NATS ${subject}`);
    }
    else {
        if (!pubClient)
            throw new Error("Redis not initialized");
        await pubClient.publish(subject, JSON.stringify(payload));
        logger.info(`Published to Redis ${subject}`);
    }
}
async function subscribe(subject, handler, queue = "default") {
    const backend = process.env.EVENT_BUS || "redis";
    if (backend === "nats") {
        if (!nc)
            throw new Error("NATS not initialized");
        const sub = nc.subscribe(subject, { queue });
        (async () => {
            for await (const msg of sub) {
                try {
                    const data = JSON.parse(sc.decode(msg.data));
                    await handler(data);
                }
                catch (err) {
                    logger.error({ err }, `Error processing NATS message on ${subject}`);
                }
            }
        })();
    }
    else {
        if (!subClient)
            throw new Error("Redis not initialized");
        await subClient.subscribe(subject, async (msg) => {
            try {
                const data = JSON.parse(msg);
                await handler(data);
            }
            catch (err) {
                logger.error({ err }, `Error processing Redis message on ${subject}`);
            }
        });
    }
}
async function shutdown() {
    const backend = process.env.EVENT_BUS || "redis";
    if (backend === "nats") {
        if (nc)
            await nc.drain();
    }
    else {
        if (pubClient)
            await pubClient.quit();
        if (subClient)
            await subClient.quit();
    }
}
