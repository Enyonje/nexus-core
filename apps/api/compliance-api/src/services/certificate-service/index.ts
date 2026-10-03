import dotenv from "dotenv";
import { initEventBus, subscribe, publish, logger } from "../../shared/eventBus";

dotenv.config();

interface Certificate {
  certificateId: string;
  issuedAt: string;
}

interface CertificateData {
  jobId: string;
  [key: string]: any; // allow additional fields like invoiceData, hsCodes, etc.
}

async function generateCertificates(data: CertificateData): Promise<Certificate> {
  return {
    certificateId: `CERT-${Date.now()}`,
    issuedAt: new Date().toISOString(),
  };
}

async function start(): Promise<void> {
  await initEventBus();

  subscribe(
    "certificate.generate",
    async (data: CertificateData) => {
      try {
        const cert = await generateCertificates(data);

        await publish("certificate.generated", {
          ...data,
          certificate: cert,
        });

        logger.info({ jobId: data.jobId }, "Certificate generation completed");
      } catch (err: any) {
        logger.error({ err, jobId: data.jobId }, "Certificate generation failed");
        await publish("certificate.failed", {
          jobId: data.jobId,
          error: err.message,
        });
      }
    },
    "certificate-service"
  );

  logger.info("Certificate service running");
}

start();
