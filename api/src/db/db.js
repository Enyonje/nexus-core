// src/db/db.js
import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

// 1. Force the string to include sslmode if it's missing
let connectionString = process.env.DATABASE_URL;
if (connectionString && !connectionString.includes("sslmode=")) {
  connectionString += (connectionString.includes("?") ? "&" : "?") + "sslmode=require";
}

export const db = new Pool({
  connectionString,
  ssl: {
    rejectUnauthorized: false, // Critical for Aiven/Render handshake
  },
  max: 10,
  idleTimeoutMillis: 30000,
});

// Immediate Connectivity Test
db.connect((err, client, release) => {
  if (err) {
    console.error("❌ CRITICAL: Could not connect to Aiven:", err.message);
  } else {
    console.log("✅ DATABASE_CONNECTED: Neural link established.");
    release();
  }
});