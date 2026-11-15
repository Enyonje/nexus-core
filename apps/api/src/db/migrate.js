import "dotenv/config"; 
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { db } from "./db.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Adjusted path to look for a /migrations folder in your project root
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

  // Use a Transaction: All or nothing
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    console.log(`📦 Applying: ${filename}`);
    
    await client.query(sql);
    await client.query(
      "INSERT INTO schema_migrations (filename) VALUES ($1)",
      [filename]
    );
    
    await client.query('COMMIT');
    console.log(`✅ Success: ${filename}`);
  } catch (err) {
    await client.query('ROLLBACK');
    throw err; // Re-throw to be caught by the main runner
  } finally {
    client.release();
  }
}

async function runMigrations() {
  // 1. Check directory
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.warn(`⚠️ Migration directory not found at: ${MIGRATIONS_DIR}`);
    console.log("Creating directory...");
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    return;
  }

  console.log("🚀 Starting Neural Core Migration...");
  
  await ensureMigrationsTable();

  const applied = await getAppliedMigrations();
  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(f => f.endsWith(".sql"))
    .sort();

  const toApply = files.filter(f => !applied.includes(f));

  if (toApply.length === 0) {
    console.log("✨ Schema is already up to date.");
  } else {
    for (const file of toApply) {
      await applyMigration(file);
    }
    console.log(`🎉 ${toApply.length} migrations applied successfully.`);
  }

  await db.end();
  process.exit(0);
}

runMigrations().catch(err => {
  console.error("❌ MIGRATION_CRITICAL_FAILURE");
  console.error(`Reason: ${err.message}`);
  if (err.hint) console.error(`Hint: ${err.hint}`);
  process.exit(1);
});