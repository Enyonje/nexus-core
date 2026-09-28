"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const eventBus_1 = require("../shared/eventBus");
dotenv_1.default.config();
async function start() {
    await (0, eventBus_1.initEventBus)();
    // Workflow start
    (0, eventBus_1.subscribe)("compliance.start", async (data) => {
        eventBus_1.logger.info({ jobId: data.jobId }, "Starting workflow");
        await (0, eventBus_1.publish)("invoice.extract", data);
    });
    (0, eventBus_1.subscribe)("invoice.extracted", async (data) => {
        await (0, eventBus_1.publish)("hs.classify", data);
    });
    (0, eventBus_1.subscribe)("hs.classified", async (data) => {
        await (0, eventBus_1.publish)("regulation.check", data);
    });
    (0, eventBus_1.subscribe)("compliance.checked", async (data) => {
        if (!data.valid) {
            eventBus_1.logger.warn({ jobId: data.jobId }, "Retrying HS classification");
            return (0, eventBus_1.publish)("hs.classify", { ...data, retry: true });
        }
        await (0, eventBus_1.publish)("certificate.generate", data);
    });
    (0, eventBus_1.subscribe)("certificate.generated", async (data) => {
        eventBus_1.logger.info({ jobId: data.jobId }, "Workflow completed");
    });
    eventBus_1.logger.info("Orchestrator running");
}
start().catch((err) => {
    eventBus_1.logger.error(err);
    process.exit(1);
});
