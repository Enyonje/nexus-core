// certificate-service/index.js
require('dotenv').config();
const { initEventBus, subscribe, publish, logger } = require('../shared/eventBus');

async function generateCertificates(data) {
  return {
    certificateId: `CERT-${Date.now()}`,
    issuedAt: new Date().toISOString(),
  };
}

async function start() {
  await initEventBus();

  subscribe('certificate.generate', async (data) => {
    try {
      const cert = await generateCertificates(data);

      await publish('certificate.generated', {
        ...data,
        certificate: cert,
      });

    } catch (err) {
      logger.error({ err, jobId: data.jobId }, 'Certificate generation failed');
    }
  }, 'certificate-service');

  logger.info('Certificate service running');
}

start();