// config/ssl.js
import { readFileSync } from "fs";
import path from "path";

// Path to your Aiven CA certificate
// You can set AIVEN_CA_PATH in your environment, or default to certs/ca.pem in project root
const CA_PATH = process.env.AIVEN_CA_PATH || path.join(process.cwd(), "certs/ca.pem");

let caCert;
try {
  caCert = readFileSync(CA_PATH).toString();
} catch (err) {
  console.warn("⚠️ Could not load CA certificate:", err.message);
  caCert = null;
}

// Export a shared SSL config object
export const sslConfig = caCert
  ? {
      rejectUnauthorized: true,
      ca: caCert,
    }
  : { rejectUnauthorized: false }; // fallback for local dev if CA not found