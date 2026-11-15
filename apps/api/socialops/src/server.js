import { buildApp } from "./app.js";
import { config } from "./config.js";
import { prisma } from "./db.js";
import { processAutomations } from "./agents/automation-worker.js";

const app = await buildApp();

const automationWorker = setInterval(async () => {
    try {
        await processAutomations(app.log);
    } catch (error) {
        app.log.error(error);
    }
}, config.poll);

automationWorker.unref();

const stop = async () => {
    clearInterval(automationWorker);
    await app.close();
    await prisma.$disconnect();
    process.exit(0);
};

process.on("SIGINT", stop);
process.on("SIGTERM", stop);

await app.listen({
    port: config.port,
    host: "0.0.0.0"
});