-- DropForeignKey
ALTER TABLE "accounting_periods" DROP CONSTRAINT "accounting_periods_bookId_fkey";

-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_bookId_fkey";

-- DropForeignKey
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_bookId_parentCode_fkey";

-- DropForeignKey
ALTER TABLE "bank_accounts" DROP CONSTRAINT "bank_accounts_bookId_fkey";

-- DropForeignKey
ALTER TABLE "bank_lines" DROP CONSTRAINT "bank_lines_bookId_fkey";

-- DropForeignKey
ALTER TABLE "bank_statements" DROP CONSTRAINT "bank_statements_bookId_fkey";

-- DropForeignKey
ALTER TABLE "budget_buckets" DROP CONSTRAINT "budget_buckets_bookId_fkey";

-- DropForeignKey
ALTER TABLE "budget_income" DROP CONSTRAINT "budget_income_bookId_fkey";

-- DropForeignKey
ALTER TABLE "budget_models" DROP CONSTRAINT "budget_models_bookId_fkey";

-- DropForeignKey
ALTER TABLE "categories" DROP CONSTRAINT "categories_bookId_fkey";

-- DropForeignKey
ALTER TABLE "debts" DROP CONSTRAINT "debts_bookId_fkey";

-- DropForeignKey
ALTER TABLE "goal_contributions" DROP CONSTRAINT "goal_contributions_bookId_fkey";

-- DropForeignKey
ALTER TABLE "goals" DROP CONSTRAINT "goals_bookId_fkey";

-- DropForeignKey
ALTER TABLE "import_profiles" DROP CONSTRAINT "import_profiles_bookId_fkey";

-- DropForeignKey
ALTER TABLE "investment_contributions" DROP CONSTRAINT "investment_contributions_bookId_fkey";

-- DropForeignKey
ALTER TABLE "investments" DROP CONSTRAINT "investments_bookId_fkey";

-- DropForeignKey
ALTER TABLE "journal_entries" DROP CONSTRAINT "journal_entries_bookId_fkey";

-- DropForeignKey
ALTER TABLE "journal_lines" DROP CONSTRAINT "journal_lines_bookId_accountCode_fkey";

-- DropForeignKey
ALTER TABLE "journal_lines" DROP CONSTRAINT "journal_lines_bookId_fkey";

-- DropForeignKey
ALTER TABLE "movements" DROP CONSTRAINT "movements_bookId_fkey";

-- AlterTable
ALTER TABLE "authAccount" RENAME CONSTRAINT "AuthAccount_pkey" TO "authAccount_pkey";

-- AlterTable
ALTER TABLE "authSession" RENAME CONSTRAINT "AuthSession_pkey" TO "authSession_pkey";

-- AlterTable
ALTER TABLE "authUser" RENAME CONSTRAINT "AuthUser_pkey" TO "authUser_pkey";

-- AlterTable
ALTER TABLE "authVerification" RENAME CONSTRAINT "AuthVerification_pkey" TO "authVerification_pkey";

-- AlterTable
ALTER TABLE "book" RENAME CONSTRAINT "Book_pkey" TO "book_pkey";

-- AlterTable
ALTER TABLE "bookInvitation" RENAME CONSTRAINT "BookInvitation_pkey" TO "bookInvitation_pkey";

-- AlterTable
ALTER TABLE "bookMember" RENAME CONSTRAINT "BookMember_pkey" TO "bookMember_pkey";

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "userId" TEXT,
    "entity" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "changes" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_bookId_createdAt_idx" ON "audit_log"("bookId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_log_bookId_entity_entityId_idx" ON "audit_log"("bookId", "entity", "entityId");

-- RenameForeignKey
ALTER TABLE "authAccount" RENAME CONSTRAINT "AuthAccount_userId_fkey" TO "authAccount_userId_fkey";

-- RenameForeignKey
ALTER TABLE "authSession" RENAME CONSTRAINT "AuthSession_userId_fkey" TO "authSession_userId_fkey";

-- RenameForeignKey
ALTER TABLE "bookInvitation" RENAME CONSTRAINT "BookInvitation_inviterId_fkey" TO "bookInvitation_inviterId_fkey";

-- RenameForeignKey
ALTER TABLE "bookInvitation" RENAME CONSTRAINT "BookInvitation_organizationId_fkey" TO "bookInvitation_organizationId_fkey";

-- RenameForeignKey
ALTER TABLE "bookMember" RENAME CONSTRAINT "BookMember_organizationId_fkey" TO "bookMember_organizationId_fkey";

-- RenameForeignKey
ALTER TABLE "bookMember" RENAME CONSTRAINT "BookMember_userId_fkey" TO "bookMember_userId_fkey";

-- AddForeignKey
ALTER TABLE "debts" ADD CONSTRAINT "debts_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_bookId_parentCode_fkey" FOREIGN KEY ("bookId", "parentCode") REFERENCES "accounts"("bookId", "code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_bookId_accountCode_fkey" FOREIGN KEY ("bookId", "accountCode") REFERENCES "accounts"("bookId", "code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movements" ADD CONSTRAINT "movements_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_models" ADD CONSTRAINT "budget_models_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_buckets" ADD CONSTRAINT "budget_buckets_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budget_income" ADD CONSTRAINT "budget_income_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goals" ADD CONSTRAINT "goals_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investments" ADD CONSTRAINT "investments_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "investment_contributions" ADD CONSTRAINT "investment_contributions_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_profiles" ADD CONSTRAINT "import_profiles_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_lines" ADD CONSTRAINT "bank_lines_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_userId_fkey" FOREIGN KEY ("userId") REFERENCES "authUser"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "AuthAccount_userId_idx" RENAME TO "authAccount_userId_idx";

-- RenameIndex
ALTER INDEX "AuthSession_token_key" RENAME TO "authSession_token_key";

-- RenameIndex
ALTER INDEX "AuthSession_userId_idx" RENAME TO "authSession_userId_idx";

-- RenameIndex
ALTER INDEX "AuthUser_email_key" RENAME TO "authUser_email_key";

-- RenameIndex
ALTER INDEX "AuthVerification_identifier_idx" RENAME TO "authVerification_identifier_idx";

-- RenameIndex
ALTER INDEX "Book_slug_key" RENAME TO "book_slug_key";

-- RenameIndex
ALTER INDEX "BookInvitation_email_idx" RENAME TO "bookInvitation_email_idx";

-- RenameIndex
ALTER INDEX "BookInvitation_organizationId_idx" RENAME TO "bookInvitation_organizationId_idx";

-- RenameIndex
ALTER INDEX "BookMember_organizationId_idx" RENAME TO "bookMember_organizationId_idx";

-- RenameIndex
ALTER INDEX "BookMember_userId_idx" RENAME TO "bookMember_userId_idx";
