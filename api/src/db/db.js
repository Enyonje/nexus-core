import "dotenv/config";
import pg from "pg";
import { sslConfig } from "../config/ssl.js";

const { Pool } = pg;

let connectionString = process.env.DATABASE_URL;
if (connectionString && !connectionString.includes("sslmode=")) {
  connectionString += (connectionString.includes("?") ? "&" : "?") + "sslmode=verify-full";
}

export const db = new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? sslConfig : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

db.connect((err, client, release) => {
  if (err) {
    console.error("❌ CRITICAL: Could not connect to Aiven:", err.message);
  } else {
    console.log("✅ DATABASE_CONNECTED: Neural link established.");
    release();
  }
});