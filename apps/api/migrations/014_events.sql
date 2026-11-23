-- Bring the existing event-bus table (created by 006_event_bus.sql)
-- forward to the schema used by the current event consumers.
-- Preserve existing rows and retain the legacy event_type column.

CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE events ADD COLUMN IF NOT EXISTS type TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS payload JSONB DEFAULT '{}'::jsonb;
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
ALTER TABLE events ADD COLUMN IF NOT EXISTS processed_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE events ADD COLUMN IF NOT EXISTS locked_by TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE events ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS result JSONB;
ALTER TABLE events ADD COLUMN IF NOT EXISTS last_error TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS execution_id TEXT;

-- 006_event_bus.sql used event_type; newer application code uses type.
-- Copy the legacy value without overwriting any already-populated type.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'events'
      AND column_name = 'event_type'
  ) THEN
    EXECUTE 'UPDATE events SET type = event_type WHERE type IS NULL';
  END IF;
END $$;

-- Keep old rows valid while ensuring newly inserted rows have a usable type.
UPDATE events SET type = 'UNKNOWN' WHERE type IS NULL;
ALTER TABLE events ALTER COLUMN type SET DEFAULT 'UNKNOWN';
ALTER TABLE events ALTER COLUMN type SET NOT NULL;

UPDATE events SET payload = '{}'::jsonb WHERE payload IS NULL;
ALTER TABLE events ALTER COLUMN payload SET DEFAULT '{}'::jsonb;
ALTER TABLE events ALTER COLUMN payload SET NOT NULL;

UPDATE events SET created_at = now() WHERE created_at IS NULL;
ALTER TABLE events ALTER COLUMN created_at SET DEFAULT now();
ALTER TABLE events ALTER COLUMN created_at SET NOT NULL;

UPDATE events SET status = 'pending' WHERE status IS NULL;
ALTER TABLE events ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE events ALTER COLUMN status SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_status_created ON events(status, created_at);
