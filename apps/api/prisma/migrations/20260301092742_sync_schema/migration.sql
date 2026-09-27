-- AlterTable
ALTER TABLE "executions" ADD COLUMN     "started_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "goals" ADD COLUMN     "goal_type" TEXT;
