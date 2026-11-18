CREATE TABLE IF NOT EXISTS sales_autopilot_config (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  enabled BOOLEAN NOT NULL DEFAULT FALSE,
  objective TEXT NOT NULL DEFAULT 'Find and qualify potential business customers for Nexus Core',
  market TEXT NOT NULL DEFAULT '',
  ideal_customer TEXT,
  geography TEXT,
  max_leads INTEGER NOT NULL DEFAULT 10 CHECK (max_leads BETWEEN 1 AND 50),
  interval_hours INTEGER NOT NULL DEFAULT 24 CHECK (interval_hours BETWEEN 6 AND 168),
  updated_by TEXT,
  next_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sales_autopilot_due_idx ON sales_autopilot_config(enabled,next_run_at);
