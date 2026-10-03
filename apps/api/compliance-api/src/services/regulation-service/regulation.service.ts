import dotenv from "dotenv";
import { initEventBus, subscribe, publish, logger } from "../../shared/eventBus";
import { runCompliance } from "./engine/complianceEngine";

dotenv.config();

interface RegulationData {
    jobId: string;
    hsCodes: Array<{ hs_code: string }>;
    items: Array<{ name: string; category: string; value?: number }>;
    destination: string;
    origin: string;
    [key: string]: any; // allow additional fields like invoiceData, buyer, seller, etc.
}

async function start(): Promise<void> {
    await initEventBus();

    subscribe(
        "regulation.check",
        async (data: RegulationData) => {
            try {
                const result = await runCompliance(data);

                await publish("compliance.checked", {
                    ...data,
                    ...result,
                });

                logger.info({ jobId: data.jobId }, "Regulation check completed");
            } catch (err: any) {
                logger.error({ err, jobId: data.jobId }, "Regulation check failed");

                await publish("compliance.checked", {
                    ...data,
                    valid: false,
                    issues: ["System error during compliance check"],
                    checkedAt: new Date().toISOString(),
                });
            }
        },
        "regulation-service"
    );

    logger.info("Regulation service running with REAL APIs");
}

start();
