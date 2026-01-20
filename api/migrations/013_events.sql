-- Create events table
CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Optional: index for faster lookups by type
CREATE INDEX idx_events_type ON events(type);

-- Optional: index for querying by created_at
CREATE INDEX idx_events_created_at ON events(created_at);