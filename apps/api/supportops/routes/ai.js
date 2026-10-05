import { guard } from "../security/entitlements.js";

export default async function aiRoutes(app) {
    const access = guard({ app: "supportops" });

    app.get("/", { preHandler: access }, async (req, reply) => {
        // Your logic here
        return reply.send({ ok: true, service: "supportops-ai" });
    });

    app.post("/generate", { preHandler: access }, async (req, reply) => {
        // Your generation logic here
        return reply.send({ status: "processing" });
    });
}