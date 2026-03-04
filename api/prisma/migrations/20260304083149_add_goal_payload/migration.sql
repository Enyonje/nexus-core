-- AlterTable
ALTER TABLE "executions" ADD COLUMN     "goal_payload" JSONB;

-- AlterTable
ALTER TABLE "goals" ADD COLUMN     "goal_payload" JSONB;

-- AlterTable
ALTER TABLE "objectives" ADD COLUMN     "goal_payload" JSONB;
