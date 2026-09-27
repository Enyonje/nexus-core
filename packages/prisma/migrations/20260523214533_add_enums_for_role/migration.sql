/*
  Warnings:

  - The `status` column on the `executions` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `goals` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `role` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `subscription` column on the `users` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[goal_id,user_id,created_at]` on the table `executions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');

-- CreateEnum
CREATE TYPE "SubscriptionType" AS ENUM ('free', 'pro', 'enterprise');

-- CreateEnum
CREATE TYPE "ExecutionStatus" AS ENUM ('pending', 'running', 'completed', 'failed');

-- CreateEnum
CREATE TYPE "GoalStatus" AS ENUM ('active', 'archived', 'completed');

-- AlterTable
ALTER TABLE "execution_steps" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "executions" ADD COLUMN     "deleted_at" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "ExecutionStatus" NOT NULL DEFAULT 'pending';

-- AlterTable
ALTER TABLE "goals" ADD COLUMN     "deleted_at" TIMESTAMP(3),
DROP COLUMN "status",
ADD COLUMN     "status" "GoalStatus" NOT NULL DEFAULT 'active';

-- AlterTable
ALTER TABLE "objectives" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "organizations" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "deleted_at" TIMESTAMP(3),
DROP COLUMN "role",
ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'user',
DROP COLUMN "subscription",
ADD COLUMN     "subscription" "SubscriptionType" NOT NULL DEFAULT 'free';

-- CreateIndex
CREATE INDEX "audit_user_id_idx" ON "audit"("user_id");

-- CreateIndex
CREATE INDEX "audit_created_at_idx" ON "audit"("created_at");

-- CreateIndex
CREATE INDEX "execution_audit_execution_id_idx" ON "execution_audit"("execution_id");

-- CreateIndex
CREATE INDEX "execution_audit_created_at_idx" ON "execution_audit"("created_at");

-- CreateIndex
CREATE INDEX "execution_steps_execution_id_idx" ON "execution_steps"("execution_id");

-- CreateIndex
CREATE INDEX "execution_steps_user_id_idx" ON "execution_steps"("user_id");

-- CreateIndex
CREATE INDEX "execution_steps_created_at_idx" ON "execution_steps"("created_at");

-- CreateIndex
CREATE INDEX "executions_user_id_idx" ON "executions"("user_id");

-- CreateIndex
CREATE INDEX "executions_goal_id_idx" ON "executions"("goal_id");

-- CreateIndex
CREATE INDEX "executions_org_id_idx" ON "executions"("org_id");

-- CreateIndex
CREATE INDEX "executions_created_at_idx" ON "executions"("created_at");

-- CreateIndex
CREATE INDEX "executions_status_idx" ON "executions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "executions_goal_id_user_id_created_at_key" ON "executions"("goal_id", "user_id", "created_at");

-- CreateIndex
CREATE INDEX "goals_user_id_idx" ON "goals"("user_id");

-- CreateIndex
CREATE INDEX "goals_org_id_idx" ON "goals"("org_id");

-- CreateIndex
CREATE INDEX "goals_created_at_idx" ON "goals"("created_at");

-- CreateIndex
CREATE INDEX "objectives_goal_id_idx" ON "objectives"("goal_id");

-- CreateIndex
CREATE INDEX "objectives_created_at_idx" ON "objectives"("created_at");

-- CreateIndex
CREATE INDEX "users_org_id_idx" ON "users"("org_id");

-- CreateIndex
CREATE INDEX "users_created_at_idx" ON "users"("created_at");
