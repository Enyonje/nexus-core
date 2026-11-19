import "dotenv/config";
import pg from "pg";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is missing.");
}

const databaseUrl = new URL(connectionString);
const isAiven = databaseUrl.hostname.includes("aivencloud.com");

let ssl;

if (isAiven) {
  const caPath = fileURLToPath(
    new URL("../../certs/ca.pem", import.meta.url)
  );

  const ca = readFileSync(caPath, "utf8");

  // Configure TLS ourselves using Aiven's trusted CA.
  databaseUrl.searchParams.delete("sslmode");
  databaseUrl.searchParams.delete("sslrootcert");

  ssl = {
    ca,
    rejectUnauthorized: true,
  };
}

export const db = new Pool({
  connectionString: databaseUrl.toString(),
  ssl,
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

// Dedicated pool for long-lived PostgreSQL LISTEN connections.
export const notificationDb = new Pool({
  connectionString: databaseUrl.toString(),
  ssl,
  max: 2,
  idleTimeoutMillis: 10000,
  connectionTimeoutMillis: 10000,
});

notificationDb.on("error", (err) => {
  console.error("PostgreSQL notification pool error:", err.message);
});

db.on("error", (err) => {
  console.error("PostgreSQL pool error:", err.message);
});

db.connect()
  .then((client) => {
    console.log("DATABASE_CONNECTED: Aiven PostgreSQL secured connection established.");
    client.release();
  })
  .catch((err) => {
    console.error("DATABASE_CONNECTION_FAILED:", err.message);
  });