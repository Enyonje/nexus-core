CREATE TABLE IF NOT EXISTS "incidents" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "org_id" TEXT NOT NULL,
  "ticket_id" TEXT,
  "execution_id" TEXT,
  "reported_by" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL DEFAULT '',
  "category" TEXT NOT NULL DEFAULT 'general',
  "severity" TEXT NOT NULL DEFAULT 'medium',
  "status" TEXT NOT NULL DEFAULT 'open',
  "assigned_to" TEXT,
  "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
  "resolution_summary" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolved_at" TIMESTAMP(3),
  CONSTRAINT "incidents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "incidents_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "incidents_org_id_status_created_at_idx" ON "incidents"("org_id", "status", "created_at");
CREATE INDEX IF NOT EXISTS "incidents_org_id_severity_idx" ON "incidents"("org_id", "severity");
