-- Per-product sessions: every refresh session now records which product issued it.
ALTER TABLE "Session" ADD COLUMN IF NOT EXISTS "product" TEXT NOT NULL DEFAULT 'nexus-core';
CREATE INDEX IF NOT EXISTS "Session_userId_product_idx" ON "Session"("userId", "product");
CREATE INDEX IF NOT EXISTS "Session_familyId_idx" ON "Session"("familyId");

-- Every product needs an apps row so access grants and subscriptions can reference it.
INSERT INTO "apps" ("id", "slug", "name", "roles", "default_role", "active", "created_at") VALUES
  (gen_random_uuid()::text, 'nexus-core', 'Nexus Core', ARRAY['owner','admin','member','billing'], 'owner', true, NOW()),
  (gen_random_uuid()::text, 'supportops', 'SupportOps', ARRAY['admin','management','agent','investor'], 'admin', true, NOW()),
  (gen_random_uuid()::text, 'compliance', 'Cross-Border Compliance', ARRAY['owner','broker','viewer'], 'owner', true, NOW())
ON CONFLICT ("slug") DO NOTHING;
