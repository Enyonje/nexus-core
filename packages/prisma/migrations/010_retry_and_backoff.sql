BEGIN;

-- Add retry/backoff tracking to execution_steps
ALTER TABLE execution_steps
  ADD COLUMN IF NOT EXISTS attempt_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error TEXT,
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ;

-- Add error tracking to agent_actions
ALTER TABLE agent_actions
  ADD COLUMN IF NOT EXISTS error TEXT;

-- Index for retry scheduling
CREATE INDEX IF NOT EXISTS idx_steps_retry
  ON execution_steps (status, next_retry_at);

COMMIT;