// invoice-service/index.js
require('dotenv').config();
const { initEventBus, subscribe, publish, logger } = require('../shared/eventBus');
const { callAI } = require('../shared/aiService');

async function extractInvoice(documentUrl) {
  const prompt = `
Extract structured JSON from this invoice:
Fields: seller, buyer, items, quantities, total_value, origin_country.
Document: ${documentUrl}
Return ONLY JSON.
`;

  const result = await callAI(prompt);
  return JSON.parse(result);
}

async function start() {
  await initEventBus();

  subscribe('invoice.extract', async (data) => {
    try {
      const invoiceData = await extractInvoice(data.documentUrl);

      await publish('invoice.extracted', {
        ...data,
        invoiceData,
      });

    } catch (err) {
      logger.error({ err, jobId: data.jobId }, 'Invoice extraction failed');
    }
  }, 'invoice-service');

  logger.info('Invoice service running');
}

start();