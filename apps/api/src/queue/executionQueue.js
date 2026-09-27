import { Queue, Worker } from "bullmq";
import Redis from "ioredis";
import { runExecution } from "../execution/runner.js";

const connection = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
    maxRetriesPerRequest: null,
});

export const executionQueue = new Queue("nexus-executions", { connection });

// Background Worker Processor
export const executionWorker = new Worker(
    "nexus-executions",
    async (job) => {
        const { executionId, payloadOverride } = job.data;
        console.log(`[Worker] Starting execution job ${job.id} for execution ${executionId}`);
        return await runExecution(executionId, payloadOverride);
    },
    {
        connection,
        concurrency: parseInt(process.env.WORKER_CONCURRENCY || "10", 10),
    }
);

executionWorker.on("failed", (job, err) => {
    console.error(`[Worker:Error] Job ${job?.id} failed with error: ${err.message}`);
});