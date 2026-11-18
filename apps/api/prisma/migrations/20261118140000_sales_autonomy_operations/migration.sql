-- Durable queue and sales execution records. Safe to apply repeatedly.
CREATE TABLE IF NOT EXISTS sales_agent_jobs (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), run_id UUID NOT NULL UNIQUE REFERENCES sales_agent_runs(id) ON DELETE CASCADE,
 payload JSONB NOT NULL DEFAULT '{}'::jsonb, status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','running','completed','failed')),
 attempts INTEGER NOT NULL DEFAULT 0, available_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), locked_at TIMESTAMPTZ, locked_by TEXT,
 last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), finished_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS sales_agent_jobs_claim_idx ON sales_agent_jobs(status,available_at,created_at);
CREATE TABLE IF NOT EXISTS sales_followups (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID NOT NULL REFERENCES sales_leads(id) ON DELETE CASCADE,
 title TEXT NOT NULL, details TEXT, due_at TIMESTAMPTZ NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','processing','completed','cancelled','needs_approval')),
 source_run_id UUID REFERENCES sales_agent_runs(id) ON DELETE SET NULL, completed_at TIMESTAMPTZ, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS sales_followups_due_idx ON sales_followups(status,due_at);
CREATE TABLE IF NOT EXISTS sales_outreach_drafts (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID NOT NULL REFERENCES sales_leads(id) ON DELETE CASCADE,
 subject TEXT NOT NULL, body TEXT NOT NULL, personalization_evidence TEXT,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','sent','rejected','failed')),
 approved_by TEXT, approved_at TIMESTAMPTZ, sent_at TIMESTAMPTZ, provider_message_id TEXT, last_error TEXT, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE sales_outreach_drafts ADD COLUMN IF NOT EXISTS followup_id UUID REFERENCES sales_followups(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS sales_outreach_status_idx ON sales_outreach_drafts(status,created_at DESC);
CREATE TABLE IF NOT EXISTS sales_inbound_replies (
 id UUID PRIMARY KEY DEFAULT gen_random_uuid(), lead_id UUID REFERENCES sales_leads(id) ON DELETE SET NULL,
 from_email TEXT NOT NULL, subject TEXT, body TEXT NOT NULL, provider_message_id TEXT UNIQUE,
 received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), classification TEXT NOT NULL DEFAULT 'unclassified'
);
CREATE INDEX IF NOT EXISTS sales_replies_received_idx ON sales_inbound_replies(received_at DESC);
ALTER TABLE sales_autopilot_config ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;
ALTER TABLE sales_autopilot_config DROP CONSTRAINT IF EXISTS sales_autopilot_config_interval_hours_check;
ALTER TABLE sales_autopilot_config ADD CONSTRAINT sales_autopilot_config_interval_hours_check CHECK(interval_hours BETWEEN 1 AND 168);
