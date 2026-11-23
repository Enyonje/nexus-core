-- Nexus Core execution runtime persistence.
-- The live database uses TEXT IDs for Prisma String fields. Do not use UUID
-- columns for foreign keys to executions or for its related Prisma models.

CREATE TABLE IF NOT EXISTS execution_events (
  id BIGSERIAL PRIMARY KEY,
  execution_id TEXT NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_execution_events_execution_id_id
  ON execution_events(execution_id, id);
CREATE INDEX IF NOT EXISTS idx_execution_events_created_at
  ON execution_events(created_at);

-- Keep the existing execution_steps.id and execution_steps.execution_id types
-- unchanged. They are TEXT in the deployed database.
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS step_key TEXT;
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS step_index INTEGER;
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS position INTEGER;
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS step_type TEXT;
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS user_id TEXT;
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS org_id TEXT;
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS reasoning TEXT;
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS input JSONB;
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS output JSONB;
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS error TEXT;
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS attempt_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE execution_steps ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

-- Remove legacy status checks that reject values emitted by the current runner.
DO $$
DECLARE constraint_row RECORD;
BEGIN
  FOR constraint_row IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'execution_steps'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE execution_steps DROP CONSTRAINT %I', constraint_row.conname);
  END LOOP;
END $$;

ALTER TABLE execution_steps
  ADD CONSTRAINT execution_steps_status_runtime_check
  CHECK (status IN (
    'pending', 'PENDING', 'running', 'RUNNING',
    'success', 'completed', 'COMPLETED',
    'failed', 'FAILED', 'blocked', 'BLOCKED',
    'awaiting_approval', 'cancelled'
  ));

CREATE INDEX IF NOT EXISTS idx_execution_steps_execution_started
  ON execution_steps(execution_id, started_at, id);
CREATE INDEX IF NOT EXISTS idx_execution_steps_status_retry
  ON execution_steps(status, next_retry_at);

-- Prisma maps String IDs to TEXT. The runner supplies a text UUID explicitly.
CREATE TABLE IF NOT EXISTS execution_audit (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  execution_id TEXT NOT NULL REFERENCES executions(id) ON DELETE CASCADE,
  status TEXT,
  meta JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  event TEXT NOT NULL DEFAULT 'unknown'
);

ALTER TABLE execution_audit ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE execution_audit ADD COLUMN IF NOT EXISTS meta JSONB;
ALTER TABLE execution_audit ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE execution_audit ADD COLUMN IF NOT EXISTS event TEXT NOT NULL DEFAULT 'unknown';

CREATE INDEX IF NOT EXISTS idx_execution_audit_execution_created
  ON execution_audit(execution_id, created_at);
