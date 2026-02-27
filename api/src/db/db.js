// src/db/db.js
import "dotenv/config";
import pg from "pg";
import { sslConfig } from "../config/ssl.js"; // shared CA loader

const { Pool } = pg;

// Use DATABASE_URL directly; append sslmode only if missing
let connectionString = process.env.DATABASE_URL;
if (connectionString && !connectionString.includes("sslmode=")) {
  // enforce verify-full for strong security
  connectionString += (connectionString.includes("?") ? "&" : "?") + "sslmode=verify-full";
}

// Create pool with shared SSL config
export const db = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? sslConfig : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// Test connection
db.connect((err, client, release) => {
  if (err) {
    console.error("❌ CRITICAL: Could not connect to Aiven:", err.message);
  } else {
    console.log("✅ DATABASE_CONNECTED: Neural link established.");
    release();
  }
});