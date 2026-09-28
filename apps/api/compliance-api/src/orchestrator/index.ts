import dotenv from "dotenv";
import { initEventBus, subscribe, publish, logger } from "../shared/eventBus";

dotenv.config();

interface WorkflowData {
  jobId: string;
  invoiceData?: any;
  hsCodes?: Array<{ item: string; hs_code: string; confidence: number }>;
  valid?: boolean;
  retry?: boolean;
  [key: string]: any; // allow additional fields
}

async function start(): Promise<void> {
  await initEventBus();

  // Workflow start
  subscribe("compliance.start", async (data: WorkflowData) => {
    logger.info({ jobId: data.jobId }, "Starting workflow");
    await publish("invoice.extract", data);
  });

  subscribe("invoice.extracted", async (data: WorkflowData) => {
    await publish("hs.classify", data);
  });

  subscribe("hs.classified", async (data: WorkflowData) => {
    await publish("regulation.check", data);
  });

  subscribe("compliance.checked", async (data: WorkflowData) => {
    if (!data.valid) {
      logger.warn({ jobId: data.jobId }, "Retrying HS classification");
      return publish("hs.classify", { ...data, retry: true });
    }

    await publish("certificate.generate", data);
  });

  subscribe("certificate.generated", async (data: WorkflowData) => {
    logger.info({ jobId: data.jobId }, "Workflow completed");
  });

  logger.info("Orchestrator running");
}

start().catch((err: any) => {
  logger.error(err);
  process.exit(1);
});
