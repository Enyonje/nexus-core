import "dotenv/config";   // load .env before using db
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIGRATIONS_DIR = path.join(__dirname, "../../migrations");

async function ensureMigrationsTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id SERIAL PRIMARY KEY,
      filename TEXT NOT NULL UNIQUE,
      applied_at TIMESTAMP NOT NULL DEFAULT now()
    );
  `);
}

async function getAppliedMigrations() {
  const result = await db.query(
    "SELECT filename FROM schema_migrations ORDER BY filename"
  );
  return result.rows.map(r => r.filename);
}

async function applyMigration(filename) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filePath, "utf8");

  console.log(`📦 Applying migration: ${filename}`);
  await db.query(sql);
  await db.query(
    "INSERT INTO schema_migrations (filename) VALUES ($1)",
    [filename]
  );
}

async function runMigrations() {
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith(".sql"))
    .sort();

  for (const file of files) {
    if (!applied.includes(file)) {
      await applyMigration(file);
    }
  }

  console.log("✅ All migrations applied");
  await db.end();
}

runMigrations().catch(err => {
  console.error("❌ Migration failed", err);
  process.exit(1);
});