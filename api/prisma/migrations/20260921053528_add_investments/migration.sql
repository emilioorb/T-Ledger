-- CreateEnum
CREATE TYPE "InvestmentKind" AS ENUM ('FIXED_TERM', 'OPEN');

-- CreateTable
CREATE TABLE "investments" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "principalMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "annualRate" DECIMAL(9,6) NOT NULL,
    "compounding" "Compounding" NOT NULL,
    "openedAt" DATE NOT NULL,
    "kind" "InvestmentKind" NOT NULL,
    "maturesAt" DATE,
    "accountCode" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "investments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "investment_contributions" (
    "id" TEXT NOT NULL,
    "investmentId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,

    CONSTRAINT "investment_contributions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "investments_maturesAt_idx" ON "investments"("maturesAt");

-- CreateIndex
CREATE INDEX "investment_contributions_investmentId_idx" ON "investment_contributions"("investmentId");

-- AddForeignKey
ALTER TABLE "investment_contributions" ADD CONSTRAINT "investment_contributions_investmentId_fkey" FOREIGN KEY ("investmentId") REFERENCES "investments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
