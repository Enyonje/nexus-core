-- CreateEnum
CREATE TYPE "PipelineStage" AS ENUM ('IDLE', 'PARSING', 'AUDITING', 'CALCULATING', 'READY_FOR_PAYMENT', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "DiscrepancySeverity" AS ENUM ('INFO', 'WARNING', 'ERROR', 'CRITICAL');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateTable
CREATE TABLE "CargoDeclaration" (
    "id" TEXT NOT NULL,
    "importerName" TEXT NOT NULL,
    "importerTaxId" TEXT NOT NULL,
    "exporterName" TEXT NOT NULL,
    "originCountry" TEXT NOT NULL DEFAULT 'UG',
    "portOfDischarge" TEXT NOT NULL DEFAULT 'Nairobi ICD',
    "incoterm" TEXT NOT NULL DEFAULT 'CIF',
    "grossWeightKg" DOUBLE PRECISION NOT NULL,
    "totalUnits" INTEGER NOT NULL,
    "cifValueUsd" DOUBLE PRECISION NOT NULL,
    "exchangeRateKe" DOUBLE PRECISION NOT NULL DEFAULT 130.0,
    "pipelineStage" "PipelineStage" NOT NULL DEFAULT 'IDLE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CargoDeclaration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CargoItem" (
    "id" TEXT NOT NULL,
    "cargoDeclarationId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "hsCode" TEXT NOT NULL,
    "totalPriceUsd" DOUBLE PRECISION NOT NULL,
    "cetRate" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CargoItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditFlag" (
    "id" TEXT NOT NULL,
    "cargoDeclarationId" TEXT NOT NULL,
    "severity" "DiscrepancySeverity" NOT NULL DEFAULT 'WARNING',
    "field" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditFlag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DutyAssessment" (
    "id" TEXT NOT NULL,
    "cargoDeclarationId" TEXT NOT NULL,
    "cifValueUsd" DOUBLE PRECISION NOT NULL,
    "cifValueKes" DOUBLE PRECISION NOT NULL,
    "importDutyKes" DOUBLE PRECISION NOT NULL,
    "idfKes" DOUBLE PRECISION NOT NULL,
    "rdlKes" DOUBLE PRECISION NOT NULL,
    "vatKes" DOUBLE PRECISION NOT NULL,
    "totalCustomsTaxKes" DOUBLE PRECISION NOT NULL,
    "generatedXml" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DutyAssessment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MpesaTransaction" (
    "id" TEXT NOT NULL,
    "cargoDeclarationId" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "accountReference" TEXT NOT NULL DEFAULT 'KRA-DUTY-DECL',
    "checkoutRequestId" TEXT,
    "merchantRequestId" TEXT,
    "mpesaReceiptNumber" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "resultDesc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MpesaTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "DutyAssessment_cargoDeclarationId_key" ON "DutyAssessment"("cargoDeclarationId");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaTransaction_cargoDeclarationId_key" ON "MpesaTransaction"("cargoDeclarationId");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaTransaction_checkoutRequestId_key" ON "MpesaTransaction"("checkoutRequestId");

-- CreateIndex
CREATE UNIQUE INDEX "MpesaTransaction_mpesaReceiptNumber_key" ON "MpesaTransaction"("mpesaReceiptNumber");

-- AddForeignKey
ALTER TABLE "CargoItem" ADD CONSTRAINT "CargoItem_cargoDeclarationId_fkey" FOREIGN KEY ("cargoDeclarationId") REFERENCES "CargoDeclaration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditFlag" ADD CONSTRAINT "AuditFlag_cargoDeclarationId_fkey" FOREIGN KEY ("cargoDeclarationId") REFERENCES "CargoDeclaration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DutyAssessment" ADD CONSTRAINT "DutyAssessment_cargoDeclarationId_fkey" FOREIGN KEY ("cargoDeclarationId") REFERENCES "CargoDeclaration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MpesaTransaction" ADD CONSTRAINT "MpesaTransaction_cargoDeclarationId_fkey" FOREIGN KEY ("cargoDeclarationId") REFERENCES "CargoDeclaration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
