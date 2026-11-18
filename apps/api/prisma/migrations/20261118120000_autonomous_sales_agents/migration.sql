
CREATE TABLE IF NOT EXISTS sales_agent_runs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 created_by TEXT,
 status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','running','completed','partial','failed')),
 objective TEXT NOT NULL,
 market TEXT NOT NULL,
 ideal_customer TEXT,
 geography TEXT,
 max_leads INTEGER NOT NULL DEFAULT 10 CHECK (max_leads BETWEEN 1 AND 50),
 result JSONB NOT NULL DEFAULT '{}'::jsonb,
 error TEXT,
 started_at TIMESTAMPTZ,
 finished_at TIMESTAMPTZ,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sales_agent_runs_created_idx ON sales_agent_runs(created_at DESC);
CREATE TABLE IF NOT EXISTS sales_agent_events (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
 run_id UUID NOT NULL REFERENCES sales_agent_runs(id) ON DELETE CASCADE,
 agent TEXT NOT NULL,
 event_type TEXT NOT NULL,
 message TEXT NOT NULL,
 payload JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sales_agent_events_run_idx ON sales_agent_events(run_id, created_at);
ALTER TABLE sales_leads ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE sales_leads ADD COLUMN IF NOT EXISTS research JSONB NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE sales_leads ADD COLUMN IF NOT EXISTS qualification_score INTEGER NOT NULL DEFAULT 0;
ALTER TABLE sales_leads ADD COLUMN IF NOT EXISTS qualification_reason TEXT;
ALTER TABLE sales_leads ADD COLUMN IF NOT EXISTS next_action TEXT;
ALTER TABLE sales_leads ADD COLUMN IF NOT EXISTS source_url TEXT;
