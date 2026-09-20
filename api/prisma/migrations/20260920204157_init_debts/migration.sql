-- CreateEnum
CREATE TYPE "DebtKind" AS ENUM ('FRENCH', 'FIXED_PRINCIPAL', 'INTEREST_FREE');

-- CreateEnum
CREATE TYPE "Compounding" AS ENUM ('MONTHLY', 'ANNUAL');

-- CreateEnum
CREATE TYPE "DebtDirection" AS ENUM ('BORROWED', 'LENT');

-- CreateTable
CREATE TABLE "debts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "counterparty" TEXT NOT NULL,
    "principalMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "annualRate" DECIMAL(9,6) NOT NULL,
    "compounding" "Compounding" NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "startDate" DATE NOT NULL,
    "kind" "DebtKind" NOT NULL,
    "direction" "DebtDirection" NOT NULL DEFAULT 'BORROWED',
    "budgetBucket" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "debts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "debts_direction_idx" ON "debts"("direction");
