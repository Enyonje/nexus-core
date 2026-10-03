BEGIN;

-- Reasoning trace per step
ALTER TABLE execution_steps
ADD COLUMN IF NOT EXISTS reasoning JSONB;

-- Outcome tracking (billing + analytics)
CREATE TABLE IF NOT EXISTS outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID REFERENCES executions(id) ON DELETE CASCADE,
  outcome_type TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outcomes_execution ON outcomes(execution_id);

COMMIT;