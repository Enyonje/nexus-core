// regulation-service/index.js
require('dotenv').config();
const { initEventBus, subscribe, publish, logger } = require('../shared/eventBus');
const { runCompliance } = require('./engine/complianceEngine');

async function start() {
  await initEventBus();

  subscribe('regulation.check', async (data) => {
    try {
      const result = await runCompliance(data);

      await publish('compliance.checked', {
        ...data,
        ...result
      });

    } catch (err) {
      logger.error({ err, jobId: data.jobId }, 'Regulation check failed');

      await publish('compliance.checked', {
        ...data,
        valid: false,
        issues: ['System error during compliance check']
      });
    }
  }, 'regulation-service');

  logger.info('Regulation service running with REAL APIs');
}

start();