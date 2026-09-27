/*
  Warnings:

  - The primary key for the `audit` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `executions` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `goal_payload` on the `executions` table. All the data in the column will be lost.
  - The primary key for the `goals` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - The primary key for the `objectives` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - Made the column `goal_id` on table `executions` required. This step will fail if there are existing NULL values in that column.
  - Made the column `objective_id` on table `executions` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "executions" DROP CONSTRAINT "executions_goal_id_fkey";

-- DropForeignKey
ALTER TABLE "executions" DROP CONSTRAINT "executions_objective_id_fkey";

-- DropForeignKey
ALTER TABLE "objectives" DROP CONSTRAINT "objectives_goal_id_fkey";

-- AlterTable
ALTER TABLE "audit" DROP CONSTRAINT "audit_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "audit_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "audit_id_seq";

-- AlterTable
ALTER TABLE "executions" DROP CONSTRAINT "executions_pkey",
DROP COLUMN "goal_payload",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "goal_id" SET NOT NULL,
ALTER COLUMN "goal_id" SET DATA TYPE TEXT,
ALTER COLUMN "objective_id" SET NOT NULL,
ALTER COLUMN "objective_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "executions_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "executions_id_seq";

-- AlterTable
ALTER TABLE "goals" DROP CONSTRAINT "goals_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ADD CONSTRAINT "goals_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "goals_id_seq";

-- AlterTable
ALTER TABLE "objectives" DROP CONSTRAINT "objectives_pkey",
ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "id" SET DATA TYPE TEXT,
ALTER COLUMN "goal_id" SET DATA TYPE TEXT,
ADD CONSTRAINT "objectives_pkey" PRIMARY KEY ("id");
DROP SEQUENCE "objectives_id_seq";

-- AddForeignKey
ALTER TABLE "objectives" ADD CONSTRAINT "objectives_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executions" ADD CONSTRAINT "executions_goal_id_fkey" FOREIGN KEY ("goal_id") REFERENCES "goals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "executions" ADD CONSTRAINT "executions_objective_id_fkey" FOREIGN KEY ("objective_id") REFERENCES "objectives"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
