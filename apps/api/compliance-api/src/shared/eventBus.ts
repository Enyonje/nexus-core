import pino from "pino";
import { connect as connectNats, NatsConnection, StringCodec, Subscription } from "nats";
import { createClient, RedisClientType } from "redis";

const logger = pino({ level: process.env.LOG_LEVEL || "info" });

let nc: NatsConnection | null = null; // NATS connection
const sc = StringCodec();

let pubClient: RedisClientType | null = null; // Redis publisher
let subClient: RedisClientType | null = null; // Redis subscriber

export interface PipelineEvent {
  pipelineId: string;
  stepId: string;
  agent: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  data?: any;
  timestamp: string;
}

export async function initEventBus(): Promise<NatsConnection | { pubClient: RedisClientType; subClient: RedisClientType }> {
  const backend = process.env.EVENT_BUS || "redis"; // default to redis

  if (backend === "nats") {
    if (nc) return nc;
    nc = await connectNats({
      servers: process.env.NATS_URL || "nats://localhost:4222",
      maxReconnectAttempts: -1,
    });
    logger.info("✅ Connected to NATS EventBus");
    return nc;
  } else {
    if (pubClient && subClient) return { pubClient, subClient };

    pubClient = createClient({ url: process.env.REDIS_URL });
    subClient = createClient({ url: process.env.REDIS_URL });

    pubClient.on("error", (err) => logger.error("Redis Pub Error: " + err));
    subClient.on("error", (err) => logger.error("Redis Sub Error: " + err));

    await pubClient.connect();
    await subClient.connect();

    logger.info("✅ Connected to Redis EventBus");
    return { pubClient, subClient };
  }
}

export async function publish(subject: string, payload: unknown): Promise<void> {
  const backend = process.env.EVENT_BUS || "redis";

  if (backend === "nats") {
    if (!nc) throw new Error("NATS not initialized");
    nc.publish(subject, sc.encode(JSON.stringify(payload)));
    logger.info(`Published to NATS ${subject}`);
  } else {
    if (!pubClient) throw new Error("Redis not initialized");
    await pubClient.publish(subject, JSON.stringify(payload));
    logger.info(`Published to Redis ${subject}`);
  }
}

export async function subscribe(
  subject: string,
  handler: (data: any) => Promise<void> | void,
  queue = "default"
): Promise<void> {
  const backend = process.env.EVENT_BUS || "redis";

  if (backend === "nats") {
    if (!nc) throw new Error("NATS not initialized");
    const sub: Subscription = nc.subscribe(subject, { queue });
    (async () => {
      for await (const msg of sub) {
        try {
          const data = JSON.parse(sc.decode(msg.data));
          await handler(data);
        } catch (err) {
          logger.error({ err }, `Error processing NATS message on ${subject}`);
        }
      }
    })();
  } else {
    if (!subClient) throw new Error("Redis not initialized");
    await subClient.subscribe(subject, async (msg: string) => {
      try {
        const data = JSON.parse(msg);
        await handler(data);
      } catch (err) {
        logger.error({ err }, `Error processing Redis message on ${subject}`);
      }
    });
  }
}

/**
 * Pipeline-specific wrapper methods for Nexus Core swarm execution
 */
export async function emitPipelineEvent(event: PipelineEvent): Promise<void> {
  const subject = `pipeline.${event.pipelineId}`;
  await publish(subject, event);
  await publish("pipeline.global", event);
}

export async function subscribePipelineEvent(
  pipelineId: string,
  handler: (event: PipelineEvent) => Promise<void> | void
): Promise<void> {
  const subject = `pipeline.${pipelineId}`;
  await subscribe(subject, handler);
}

export async function shutdown(): Promise<void> {
  const backend = process.env.EVENT_BUS || "redis";

  if (backend === "nats") {
    if (nc) await nc.drain();
  } else {
    if (pubClient) await pubClient.quit();
    if (subClient) await subClient.quit();
  }
}

export { logger };