import dotenv from "dotenv";
import { initEventBus, subscribe, publish, logger } from "../../shared/eventBus";
import { callAI } from "../../shared/aiService";

dotenv.config();

interface InvoiceItem {
  name: string;
  quantity: number;
  price?: number;
}

interface InvoiceData {
  items: InvoiceItem[];
}

interface HSCodeResult {
  item: string;
  hs_code: string;
  confidence: number;
}

async function classifyHS(invoiceData: InvoiceData): Promise<HSCodeResult[]> {
  if (!invoiceData?.items) {
    throw new Error("No items found in invoiceData");
  }

  const prompt = `
Classify HS codes for these items:
${JSON.stringify(invoiceData.items)}
Return JSON: [{ "item": "...", "hs_code": "...", "confidence": 0.95 }]
`;

  const result = await callAI(prompt);

  let hsCodes: HSCodeResult[];
  try {
    hsCodes = JSON.parse(result);
    if (!Array.isArray(hsCodes)) throw new Error("Invalid HS code format");
  } catch (err: any) {
    throw new Error("AI returned invalid JSON: " + err.message);
  }

  return hsCodes;
}

async function start(): Promise<void> {
  await initEventBus();

  subscribe(
    "hs.classify",
    async (data: { invoiceData: InvoiceData; jobId: string }) => {
      try {
        const hsCodes = await classifyHS(data.invoiceData);

        await publish("hs.classified", {
          ...data,
          hsCodes,
        });

        logger.info({ jobId: data.jobId }, "HS classification completed");
      } catch (err: any) {
        logger.error({ err, jobId: data.jobId }, "HS classification failed");
        await publish("hs.failed", { jobId: data.jobId, error: err.message });
      }
    },
    "hs-service"
  );

  logger.info("HS service running");
}

start();
