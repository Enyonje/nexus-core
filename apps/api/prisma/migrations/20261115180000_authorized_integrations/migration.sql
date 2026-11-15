CREATE TABLE IF NOT EXISTS "integration_credentials" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "token_prefix" TEXT NOT NULL,
  "token_hash" TEXT NOT NULL,
  "scopes" TEXT[] NOT NULL DEFAULT ARRAY['events:write']::TEXT[],
  "created_by" TEXT,
  "last_used_at" TIMESTAMPTZ(6),
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "integration_credentials_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "integration_credentials_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "integration_credentials_token_hash_key" ON "integration_credentials"("token_hash");
CREATE INDEX IF NOT EXISTS "integration_credentials_org_id_created_at_idx" ON "integration_credentials"("org_id", "created_at");
CREATE INDEX IF NOT EXISTS "integration_credentials_org_id_revoked_at_idx" ON "integration_credentials"("org_id", "revoked_at");
