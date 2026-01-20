import "dotenv/config";   // ensures .env is loaded before anything else
import pg from "pg";

const { Pool } = pg;

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production"
    ? { rejectUnauthorized: false }
    : undefined,   // use undefined instead of false
});

db.on("connect", () => {
  console.log("✅ Postgres connected");
});

db.on("error", (err) => {
  console.error("❌ Postgres error", err);
  process.exit(1);
});