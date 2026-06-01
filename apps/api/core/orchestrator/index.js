// orchestrator/index.js
require('dotenv').config();
const { initEventBus, subscribe, publish, logger } = require('../shared/eventBus');

async function start() {
  await initEventBus();

  // Workflow start
  subscribe('compliance.start', async (data) => {
    logger.info({ jobId: data.jobId }, 'Starting workflow');
    await publish('invoice.extract', data);
  });

  subscribe('invoice.extracted', async (data) => {
    await publish('hs.classify', data);
  });

  subscribe('hs.classified', async (data) => {
    await publish('regulation.check', data);
  });

  subscribe('compliance.checked', async (data) => {
    if (!data.valid) {
      logger.warn({ jobId: data.jobId }, 'Retrying HS classification');
      return publish('hs.classify', { ...data, retry: true });
    }

    await publish('certificate.generate', data);
  });

  subscribe('certificate.generated', async (data) => {
    logger.info({ jobId: data.jobId }, 'Workflow completed');
  });

  logger.info('Orchestrator running');
}

start().catch(err => {
  logger.error(err);
  process.exit(1);
});