BEGIN;

-- Execution steps (individual nodes in a plan)
CREATE TABLE IF NOT EXISTS execution_steps (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID REFERENCES executions(id) ON DELETE CASCADE,
  step_key TEXT NOT NULL,
  step_type TEXT,
  status TEXT CHECK (
    status IN ('pending', 'running', 'success', 'failed', 'blocked')
  ) DEFAULT 'pending',
  input JSONB,
  output JSONB,
  created_at TIMESTAMP DEFAULT now(),
  completed_at TIMESTAMP
);

-- Indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_steps_execution_id ON execution_steps(execution_id);
CREATE INDEX IF NOT EXISTS idx_steps_status ON execution_steps(status);

COMMIT;