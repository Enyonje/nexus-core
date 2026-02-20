// src/db/db.js
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

// Aiven and Render both require SSL. 
// We use a helper to determine if we should apply the SSL fix.
const useSSL = connectionString && !connectionString.includes("localhost") && !connectionString.includes("127.0.0.1");

export const db = new Pool({
  connectionString,
  ssl: useSSL 
    ? { rejectUnauthorized: false } 
    : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000, // Terminate if connection takes too long
});

// Test connection immediately on startup
db.query('SELECT NOW()', (err, res) => {
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