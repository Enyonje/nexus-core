import Fastify from "fastify";
import cors from "@fastify/cors";

import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import { config } from "./config.js";
import { routes } from "./routes.js";
export async function buildApp() {
    const app = Fastify({ logger: true });
    await app.register(helmet);
    await app.register(cors, { origin: config.origin });
    await app.register(rateLimit, { max: 120, timeWindow: "1 minute" });
    app.setErrorHandler((e, r, p) => { r.log.error(e); p.code(e.statusCode && e.statusCode < 500 ? e.statusCode : 500).send({ error: e.statusCode && e.statusCode < 500 ? e.message : "Internal server error" }); });
    await routes(app);
    return app;
}
