-- Create events table
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Optional: index for faster lookups by type
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

-- Optional: index for querying by created_at
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);