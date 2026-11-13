// API entry point. All routes are defined in app.js so tests can build the exact same server.
import "dotenv/config";
import { env } from "./config/env.js";
import { buildApp } from "./app.js";
import { createPrismaStore } from "./auth/stores/prismaStore.js";
import { createMailer } from "./services/mailer.js";

async function start() {
  const app = await buildApp({ store: createPrismaStore(), mailer: await createMailer().catch(() => null), env: process.env });

  if (env.DATABASE_URL) {
    const { default: fastifyPostgres } = await import("@fastify/postgres");
    await app.register(fastifyPostgres, {
      connectionString: env.DATABASE_URL,
      ssl: env.NODE_ENV === "production" ? { ca: env.PG_CA_CERT, rejectUnauthorized: Boolean(env.PG_CA_CERT) } : false,
    });
  }

  const port = Number(process.env.PORT || env.PORT || 10000);
  await app.listen({ port, host: "0.0.0.0" });
  app.log.info(`API running on port ${port} (${env.NODE_ENV})`);
}

start().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
