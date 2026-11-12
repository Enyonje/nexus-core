/**
 * Read-only preflight for the SupportOps database split.
 * It NEVER creates, alters, copies, updates, or deletes database objects/rows.
 * Run from apps/api with:
 *   SUPPORTOPS_SOURCE_DATABASE_URL=... SUPPORTOPS_TARGET_DATABASE_URL=... \
 *     node supportops/scripts/db-preflight.js
 */
import pg from "pg";

const { Client } = pg;
const TABLES = [
  // Identity and organization records required by SupportOps authorization.
  "users",
  "organizations",
  // Product catalog, authorization, subscriptions and billing state.
  "apps",
  "plans",
  "subscriptions",
  "memberships",
  "app_access",
  "invites",
  "usage_records",
  "stripe_events",
  "addons",
  "subscription_addons",
  "Session",
  // SupportOps operational data.
  "channels",
  "inbound_events",
  "conversations",
  "messages",
  "support_customers",
  "support_tickets",
  "support_ticket_messages",
];

function required(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function identity(connectionString) {
  const parsed = new URL(connectionString);
  return `${parsed.hostname}:${parsed.port || "5432"}/${parsed.pathname}`;
}

async function connect(connectionString, label) {
  const client = new Client({ connectionString, connectionTimeoutMillis: 10000, query_timeout: 30000 });
  try {
    await client.connect();
    await client.query("SELECT 1");
    return client;
  } catch {
    await client.end().catch(() => {});
    throw new Error(`Could not connect to the ${label} database. Check its URL, network access and credentials.`);
  }
}

async function listPublicTables(client) {
  const result = await client.query(`
    SELECT tablename
    FROM pg_catalog.pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename
  `);
  return result.rows.map((row) => row.tablename);
}

async function countRows(client, table) {
  // Table names are constants from TABLES, still quote defensively.
  const quoted = `"${table.replaceAll('"', '""')}"`;
  const result = await client.query(`SELECT COUNT(*)::bigint AS count FROM public.${quoted}`);
  return Number(result.rows[0].count);
}

async function foreignKeyInventory(client) {
  const result = await client.query(`
    SELECT
      source.relname AS source_table,
      target.relname AS target_table,
      constraint_row.conname AS constraint_name
    FROM pg_constraint constraint_row
    JOIN pg_class source ON source.oid = constraint_row.conrelid
    JOIN pg_namespace source_ns ON source_ns.oid = source.relnamespace
    JOIN pg_class target ON target.oid = constraint_row.confrelid
    WHERE constraint_row.contype = 'f'
      AND source_ns.nspname = 'public'
      AND source.relname = ANY($1::text[])
    ORDER BY source.relname, target.relname
  `, [TABLES]);
  return result.rows;
}

async function main() {
  const sourceUrl = required("SUPPORTOPS_SOURCE_DATABASE_URL");
  const targetUrl = required("SUPPORTOPS_TARGET_DATABASE_URL");
  if (identity(sourceUrl) === identity(targetUrl)) {
    throw new Error("Source and target resolve to the same host/database. Refusing to continue.");
  }

  let source;
  let target;
  try {
    source = await connect(sourceUrl, "source");
    target = await connect(targetUrl, "target");

    const [sourceTables, targetTables] = await Promise.all([
      listPublicTables(source),
      listPublicTables(target),
    ]);

    const missing = TABLES.filter((table) => !sourceTables.includes(table));
    const counts = {};
    for (const table of TABLES) {
      if (sourceTables.includes(table)) counts[table] = await countRows(source, table);
    }

    const foreignKeys = await foreignKeyInventory(source);
    const unexpectedTargetTables = targetTables.filter((table) => table !== "_prisma_migrations");
    const result = {
      mode: "READ_ONLY_PREFLIGHT",
      generatedAt: new Date().toISOString(),
      source: { connected: true, tableCount: sourceTables.length, requiredTableCounts: counts },
      target: {
        connected: true,
        publicTables: targetTables,
        emptyForMigration: unexpectedTargetTables.length === 0,
      },
      missingRequiredSourceTables: missing,
      supportOpsForeignKeys: foreignKeys,
      checks: {
        sourceTablesPresent: missing.length === 0,
        targetIsEmpty: unexpectedTargetTables.length === 0,
        distinctDatabases: true,
      },
      safeToPrepareMigration: missing.length === 0 && unexpectedTargetTables.length === 0,
      warning: "This report does not migrate data or prove application compatibility. Review identity, billing and foreign-key ownership before any cutover.",
    };
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    if (!result.safeToPrepareMigration) process.exitCode = 2;
  } finally {
    await source?.end().catch(() => {});
    await target?.end().catch(() => {});
  }
}

main().catch((error) => {
  // Do not print driver errors because they can contain connection details.
  console.error(`SupportOps database preflight failed: ${error.message}`);
  process.exitCode = 1;
});
