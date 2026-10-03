import dotenv from "dotenv";
import { initEventBus, subscribe, publish, logger } from "../../shared/eventBus";
import { callAI } from "../../shared/aiService";

dotenv.config();

interface InvoiceData {
  seller: string;
  buyer: string;
  items: Array<{ name: string; quantity: number; price?: number }>;
  total_value: number;
  origin_country: string;
}

async function extractInvoice(documentUrl: string): Promise<InvoiceData> {
  const prompt = `
Extract structured JSON from this invoice:
Fields: seller, buyer, items, quantities, total_value, origin_country.
Document: ${documentUrl}
Return ONLY JSON.
`;

  const result = await callAI(prompt);

  let invoiceData: InvoiceData;
  try {
    invoiceData = JSON.parse(result);
  } catch (err) {
    throw new Error("AI returned invalid JSON: " + err);
  }

  return invoiceData;
}

async function start(): Promise<void> {
  await initEventBus();

  subscribe("invoice.extract", async (data: { documentUrl: string; jobId: string }) => {
    try {
      const invoiceData = await extractInvoice(data.documentUrl);

      await publish("invoice.extracted", {
        ...data,
        invoiceData,
      });

      logger.info({ jobId: data.jobId }, "Invoice extraction completed");
    } catch (err: any) {
      logger.error({ err, jobId: data.jobId }, "Invoice extraction failed");
      await publish("invoice.failed", { jobId: data.jobId, error: err.message });
    }
  }, "invoice-service");

  logger.info("Invoice service running");
}

start();
