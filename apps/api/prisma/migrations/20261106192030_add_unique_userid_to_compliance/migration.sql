-- CreateIndex
CREATE INDEX "app_access_org_id_app_id_app_role_idx" ON "app_access"("org_id", "app_id", "app_role");

-- CreateIndex
CREATE INDEX "conversations_org_id_assignee_id_idx" ON "conversations"("org_id", "assignee_id");

-- CreateIndex
CREATE INDEX "support_tickets_org_id_assignee_id_idx" ON "support_tickets"("org_id", "assignee_id");

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_assignee_id_fkey" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
