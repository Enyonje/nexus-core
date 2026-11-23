-- Nexus Core execution engine schema.
-- IMPORTANT: The deployed Prisma schema stores String IDs as TEXT, not UUID.
-- Keep all references to existing Prisma-backed tables TEXT to match production.

CREATE TABLE IF NOT EXISTS goals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  org_id TEXT REFERENCES organizations(id) ON DELETE CASCADE,
  submitted_by TEXT REFERENCES users(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL,
  goal_payload JSONB NOT NULL,
  status TEXT CHECK (status IN ('pending', 'running', 'completed', 'failed', 'blocked')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS executions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  goal_id TEXT REFERENCES goals(id) ON DELETE CASCADE,
  version INTEGER NOT NULL,
  status TEXT CHECK (status IN ('running', 'completed', 'failed', 'blocked')) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ
);

-- This table was the immediate cause of migration 002 failing in production:
-- executions.id is TEXT, so execution_plans.execution_id must also be TEXT.
CREATE TABLE IF NOT EXISTS execution_plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  execution_id TEXT NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  plan_version INTEGER NOT NULL,
  plan_dag JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_execution_plans_execution_id
  ON execution_plans(execution_id);
