CREATE TABLE IF NOT EXISTS sales_leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  email TEXT,
  phone TEXT,
  source TEXT,
  stage TEXT NOT NULL DEFAULT 'new'
    CHECK (stage IN ('new','qualified','demo','proposal','negotiation','won','lost')),
  estimated_value_cents BIGINT NOT NULL DEFAULT 0 CHECK (estimated_value_cents >= 0),
  currency TEXT NOT NULL DEFAULT 'usd',
  is_enterprise BOOLEAN NOT NULL DEFAULT FALSE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sales_leads_stage_idx ON sales_leads(stage);
CREATE INDEX IF NOT EXISTS sales_leads_created_idx ON sales_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS sales_leads_email_idx ON sales_leads(LOWER(email));

CREATE TABLE IF NOT EXISTS sales_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL REFERENCES sales_leads(id) ON DELETE CASCADE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('call','email','demo','proposal','meeting','note')),
  title TEXT NOT NULL,
  details TEXT,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sales_activities_lead_idx ON sales_activities(lead_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS sales_activities_type_idx ON sales_activities(activity_type, occurred_at DESC);

-- This ledger is populated only from verified Stripe invoice.paid webhook events.
CREATE TABLE IF NOT EXISTS sales_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_invoice_id TEXT NOT NULL UNIQUE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  organization_id TEXT,
  amount_paid_cents BIGINT NOT NULL CHECK (amount_paid_cents >= 0),
  currency TEXT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS sales_payments_paid_at_idx ON sales_payments(paid_at DESC);
CREATE INDEX IF NOT EXISTS sales_payments_org_idx ON sales_payments(organization_id);
