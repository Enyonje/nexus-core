-- AlterTable
ALTER TABLE "executions" ALTER COLUMN "objective_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "failed_attempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "locked_until" TIMESTAMPTZ(6),
ADD COLUMN     "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "mfa_secret" TEXT,
ADD COLUMN     "reset_token" TEXT,
ADD COLUMN     "reset_token_expires" TIMESTAMPTZ(6);

-- CreateTable
CREATE TABLE "execution_audit" (
    "id" UUID NOT NULL,
    "execution_id" UUID,
    "status" TEXT,
    "meta" JSONB,
    "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "execution_audit_pkey" PRIMARY KEY ("id")
);
