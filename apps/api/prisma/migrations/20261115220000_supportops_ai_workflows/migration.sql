CREATE TABLE "ai_action_proposals" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "ticket_id" TEXT NOT NULL,
  "user_id" TEXT,
  "agent_name" TEXT NOT NULL DEFAULT 'SupportOps AI',
  "action_type" TEXT NOT NULL DEFAULT 'DRAFT_REPLY',
  "summary" TEXT NOT NULL,
  "payload" JSONB NOT NULL DEFAULT '{}',
  "confidence_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "risk_level" TEXT NOT NULL DEFAULT 'low',
  "status" TEXT NOT NULL DEFAULT 'pending',
  "reviewed_by" TEXT,
  "reviewed_at" TIMESTAMP(3),
  "rejection_reason" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_action_proposals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_action_proposals_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ai_action_proposals_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "ai_action_proposals_org_id_status_created_at_idx" ON "ai_action_proposals"("org_id", "status", "created_at");
CREATE INDEX "ai_action_proposals_ticket_id_created_at_idx" ON "ai_action_proposals"("ticket_id", "created_at");

CREATE TABLE "ai_usage" (
  "id" TEXT NOT NULL,
  "org_id" TEXT NOT NULL,
  "ticket_id" TEXT,
  "user_id" TEXT,
  "provider" TEXT NOT NULL DEFAULT 'openai',
  "model" TEXT NOT NULL,
  "prompt_tokens" INTEGER NOT NULL DEFAULT 0,
  "completion_tokens" INTEGER NOT NULL DEFAULT 0,
  "total_tokens" INTEGER NOT NULL DEFAULT 0,
  "cost_usd" DOUBLE PRECISION NOT NULL DEFAULT 0,
  "action" TEXT NOT NULL DEFAULT 'ticket_draft',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ai_usage_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ai_usage_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ai_usage_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "support_tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX "ai_usage_org_id_created_at_idx" ON "ai_usage"("org_id", "created_at");
CREATE INDEX "ai_usage_org_id_action_created_at_idx" ON "ai_usage"("org_id", "action", "created_at");
