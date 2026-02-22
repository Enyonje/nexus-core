// src/db/db.js
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

let connectionString = process.env.DATABASE_URL;
if (connectionString && !connectionString.includes("sslmode=")) {
  connectionString += (connectionString.includes("?") ? "&" : "?") + "sslmode=verify-full";
}

// Decode escaped newlines into real ones
const caCert = process.env.PG_CA_CERT
  ? process.env.PG_CA_CERT.replace(/\\n/g, "\n")
  : null;

export const db = new Pool({
  connectionString,
  ssl: caCert
    ? {
        ca: caCert,
        rejectUnauthorized: true, // enforce validation
      }
    : { rejectUnauthorized: false }, // fallback only for local dev
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Connectivity test
db.connect((err, client, release) => {
  if (err) {
    console.error("❌ CRITICAL: Could not connect to Aiven:", err.message);
  } else {
    console.log("✅ DATABASE_CONNECTED: Neural link established.");
    release();
  }
});