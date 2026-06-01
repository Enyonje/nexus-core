require('dotenv').config();
const { initEventBus, subscribe, publish, logger } = require('../shared/eventBus');
const { callAI } = require('../shared/aiService');

async function classifyHS(invoiceData) {
  if (!invoiceData?.items) {
    throw new Error("No items found in invoiceData");
  }

  const prompt = `
Classify HS codes for these items:
${JSON.stringify(invoiceData.items)}
Return JSON: [{ "item": "...", "hs_code": "...", "confidence": 0.95 }]
`;

  const result = await callAI(prompt);

  let hsCodes;
  try {
    hsCodes = JSON.parse(result);
    if (!Array.isArray(hsCodes)) throw new Error("Invalid HS code format");
  } catch (err) {
    throw new Error("AI returned invalid JSON: " + err.message);
  }

  return hsCodes;
}

async function start() {
  await initEventBus();

  subscribe('hs.classify', async (data) => {
    try {
      const hsCodes = await classifyHS(data.invoiceData);

      await publish('hs.classified', {
        ...data,
        hsCodes,
      });

      logger.info({ jobId: data.jobId }, "HS classification completed");
    } catch (err) {
      logger.error({ err, jobId: data.jobId }, 'HS classification failed');
      await publish('hs.failed', { jobId: data.jobId, error: err.message });
    }
  }, 'hs-service');

  logger.info('HS service running');
}

start();
