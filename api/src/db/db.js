// src/db/db.js
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

// Use CA cert in production, disable SSL locally
const sslConfig =
  process.env.NODE_ENV === "production"
    ? {
        ca: process.env.PG_CA_CERT, // full cert string from env
        rejectUnauthorized: true,   // enforce validation
      }
    : false;

export const db = new Pool({
  connectionString,
  ssl: sslConfig,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Test connection immediately on startup
db.query("SELECT NOW()", (err, res) => {
  if (err) {
    console.error("❌ Database Handshake Failed:", err.message);
  } else {
    console.log("✅ Database Handshake Successful at:", res.rows[0].now);
  }
});

db.on("connect", () => {
  console.log("✅ Postgres pool client created");
});

db.on("error", (err) => {
  console.error("❌ Unexpected Postgres error:", err);
});