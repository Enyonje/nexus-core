// src/db/db.js
import "dotenv/config";   // ensures .env is loaded before anything else
import pg from "pg";

const { Pool } = pg;

// Decide which connection string to use
// - In production (Render), use DATABASE_URL (internal URL recommended)
// - In local dev, you can set DATABASE_URL to the external Render URL in .env
const connectionString = process.env.DATABASE_URL;

export const db = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false } // Render requires SSL
    : undefined,
  max: 10,               // limit pool size to avoid exhausting DB connections
  idleTimeoutMillis: 30000, // close idle clients after 30s
});

// Event listeners for visibility
db.on("connect", () => {
  console.log("✅ Postgres connected");
});

db.on("error", (err) => {
  console.error("❌ Postgres error:", err);
  // Don't force exit here; let Render restart if needed
});