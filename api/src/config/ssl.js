// config/ssl.js
import { readFileSync } from "fs";
import path from "path";

const CA_PATH = process.env.AIVEN_CA_PATH || path.join(process.cwd(), "certs/ca.pem");

let caCert;
try {
  caCert = readFileSync(CA_PATH).toString();
} catch (err) {
  console.warn("⚠️ Could not load CA certificate:", err.message);
  caCert = null;
}

export const sslConfig = caCert
  ? { rejectUnauthorized: true, ca: caCert }
  : { rejectUnauthorized: false };