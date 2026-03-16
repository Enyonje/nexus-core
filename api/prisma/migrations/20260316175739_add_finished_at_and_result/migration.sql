-- AlterTable
ALTER TABLE "executions" ADD COLUMN     "duration_ms" INTEGER,
ADD COLUMN     "finished_at" TIMESTAMP(3),
ADD COLUMN     "goal_payload" JSONB NOT NULL DEFAULT '{}',
ADD COLUMN     "result" JSONB;
