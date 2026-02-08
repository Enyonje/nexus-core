// queue.js
import { Queue, Worker, QueueScheduler } from "bullmq";
import { runNextStep } from "./worker.js";

const connection = { host: "localhost", port: 6379 };

// Create queue + scheduler
export const executionQueue = new Queue("executions", { connection });
new QueueScheduler("executions", { connection });

// Producer: enqueue execution
export async function enqueueExecution(executionId) {
  await executionQueue.add("run", { executionId });
}

// Worker: process jobs
new Worker(
  "executions",
  async (job) => {
    const { executionId } = job.data;
    let keepRunning = true;

    while (keepRunning) {
      const step = await runNextStep(executionId);

      if (!step) {
        // Check if execution is finished
        // (reuse your runExecutionLoop logic here)
        keepRunning = false;
      }
    }
  },
  { connection }
);