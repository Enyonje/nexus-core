/*
  Warnings:

  - The primary key for the `execution_audit` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Made the column `execution_id` on table `execution_audit` required. This step will fail if there are existing NULL values in that column.
  - Made the column `created_at` on table `execution_audit` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "execution_audit" DROP CONSTRAINT "execution_audit_pkey",
ADD COLUMN     "event" TEXT NOT NULL DEFAULT 'unknown',
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "execution_id" SET NOT NULL,
ALTER COLUMN "execution_id" SET DATA TYPE TEXT,
ALTER COLUMN "created_at" SET NOT NULL,
ALTER COLUMN "created_at" SET DATA TYPE TIMESTAMP(3),
ADD CONSTRAINT "execution_audit_pkey" PRIMARY KEY ("id");

-- CreateTable
CREATE TABLE "execution_steps" (
    "id" TEXT NOT NULL,
    "execution_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "org_id" TEXT,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "output" JSONB,
    "error" TEXT,

    CONSTRAINT "execution_steps_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "execution_steps" ADD CONSTRAINT "execution_steps_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_steps" ADD CONSTRAINT "execution_steps_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "execution_audit" ADD CONSTRAINT "execution_audit_execution_id_fkey" FOREIGN KEY ("execution_id") REFERENCES "executions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
