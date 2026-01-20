-- Outcomes (what customers pay for)
CREATE TABLE IF NOT EXISTS outcomes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  execution_id UUID REFERENCES executions(id) ON DELETE CASCADE,
  outcome_type TEXT NOT NULL,
  status TEXT CHECK (status IN ('success', 'failed')) NOT NULL,
  summary TEXT,
  created_at TIMESTAMP DEFAULT now()
);

-- Billing events (outcome-based pricing)
CREATE TABLE IF NOT EXISTS billing_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  outcome_id UUID REFERENCES outcomes(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMP DEFAULT now()
);