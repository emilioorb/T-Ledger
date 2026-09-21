-- CreateEnum
CREATE TYPE "BankLineStatus" AS ENUM ('PENDING', 'MATCHED', 'IGNORED');

-- CreateTable
CREATE TABLE "import_profiles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "delimiter" CHAR(1) NOT NULL,
    "encoding" TEXT NOT NULL,
    "headerRows" INTEGER NOT NULL DEFAULT 1,
    "dateColumn" INTEGER NOT NULL,
    "dateFormat" TEXT NOT NULL,
    "descriptionColumn" INTEGER NOT NULL,
    "referenceColumn" INTEGER,
    "amountColumn" INTEGER,
    "debitColumn" INTEGER,
    "creditColumn" INTEGER,
    "decimalSeparator" CHAR(1) NOT NULL,
    "thousandsSeparator" CHAR(1),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "accountCode" TEXT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "profileId" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_statements" (
    "id" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "importedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lineCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "bank_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_lines" (
    "id" TEXT NOT NULL,
    "statementId" TEXT NOT NULL,
    "bankAccountId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "description" TEXT NOT NULL,
    "reference" TEXT,
    "amountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,
    "hash" TEXT NOT NULL,
    "status" "BankLineStatus" NOT NULL DEFAULT 'PENDING',
    "movementId" TEXT,

    CONSTRAINT "bank_lines_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_statements_bankAccountId_idx" ON "bank_statements"("bankAccountId");

-- CreateIndex
CREATE INDEX "bank_lines_bankAccountId_status_idx" ON "bank_lines"("bankAccountId", "status");

-- CreateIndex
CREATE INDEX "bank_lines_date_idx" ON "bank_lines"("date");

-- CreateIndex
CREATE UNIQUE INDEX "bank_lines_bankAccountId_hash_key" ON "bank_lines"("bankAccountId", "hash");

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_profileId_fkey" FOREIGN KEY ("profileId") REFERENCES "import_profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_lines" ADD CONSTRAINT "bank_lines_statementId_fkey" FOREIGN KEY ("statementId") REFERENCES "bank_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_lines" ADD CONSTRAINT "bank_lines_bankAccountId_fkey" FOREIGN KEY ("bankAccountId") REFERENCES "bank_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
