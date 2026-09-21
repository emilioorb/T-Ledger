-- El libro de Emilio: todo lo que hay hoy en la base le pertenece.
INSERT INTO "Book" (id, name, slug, "createdAt")
VALUES ('lib_personal_emilio', 'Personal', 'personal', NOW());

-- En tres tiempos y no de una: la columna es obligatoria y ya hay filas, así que primero
-- entra admitiendo nulos, después se rellena, y recién entonces se exige. Hacerlo de una
-- falla contra cualquier base que no esté vacía.

ALTER TABLE "debts" ADD COLUMN "bookId" TEXT;
UPDATE "debts" SET "bookId" = 'lib_personal_emilio';
ALTER TABLE "debts" ALTER COLUMN "bookId" SET NOT NULL;
ALTER TABLE "debts" ADD CONSTRAINT "debts_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON DELETE CASCADE;

ALTER TABLE "accounts" ADD COLUMN "bookId" TEXT;
UPDATE "accounts" SET "bookId" = 'lib_personal_emilio';
ALTER TABLE "accounts" ALTER COLUMN "bookId" SET NOT NULL;
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON DELETE CASCADE;

ALTER TABLE "journal_entries" ADD COLUMN "bookId" TEXT;
UPDATE "journal_entries" SET "bookId" = 'lib_personal_emilio';
ALTER TABLE "journal_entries" ALTER COLUMN "bookId" SET NOT NULL;
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON DELETE CASCADE;

ALTER TABLE "journal_lines" ADD COLUMN "bookId" TEXT;
UPDATE "journal_lines" SET "bookId" = 'lib_personal_emilio';
ALTER TABLE "journal_lines" ALTER COLUMN "bookId" SET NOT NULL;
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON DELETE CASCADE;

ALTER TABLE "categories" ADD COLUMN "bookId" TEXT;
UPDATE "categories" SET "bookId" = 'lib_personal_emilio';
ALTER TABLE "categories" ALTER COLUMN "bookId" SET NOT NULL;
ALTER TABLE "categories" ADD CONSTRAINT "categories_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON DELETE CASCADE;

ALTER TABLE "movements" ADD COLUMN "bookId" TEXT;
UPDATE "movements" SET "bookId" = 'lib_personal_emilio';
ALTER TABLE "movements" ALTER COLUMN "bookId" SET NOT NULL;
ALTER TABLE "movements" ADD CONSTRAINT "movements_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON DELETE CASCADE;

ALTER TABLE "accounting_periods" ADD COLUMN "bookId" TEXT;
UPDATE "accounting_periods" SET "bookId" = 'lib_personal_emilio';
ALTER TABLE "accounting_periods" ALTER COLUMN "bookId" SET NOT NULL;
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON DELETE CASCADE;

ALTER TABLE "budget_models" ADD COLUMN "bookId" TEXT;
UPDATE "budget_models" SET "bookId" = 'lib_personal_emilio';
ALTER TABLE "budget_models" ALTER COLUMN "bookId" SET NOT NULL;
ALTER TABLE "budget_models" ADD CONSTRAINT "budget_models_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON DELETE CASCADE;

ALTER TABLE "budget_buckets" ADD COLUMN "bookId" TEXT;
UPDATE "budget_buckets" SET "bookId" = 'lib_personal_emilio';
ALTER TABLE "budget_buckets" ALTER COLUMN "bookId" SET NOT NULL;
ALTER TABLE "budget_buckets" ADD CONSTRAINT "budget_buckets_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON DELETE CASCADE;

ALTER TABLE "budget_income" ADD COLUMN "bookId" TEXT;
UPDATE "budget_income" SET "bookId" = 'lib_personal_emilio';
ALTER TABLE "budget_income" ALTER COLUMN "bookId" SET NOT NULL;
ALTER TABLE "budget_income" ADD CONSTRAINT "budget_income_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON DELETE CASCADE;

ALTER TABLE "goals" ADD COLUMN "bookId" TEXT;
UPDATE "goals" SET "bookId" = 'lib_personal_emilio';
ALTER TABLE "goals" ALTER COLUMN "bookId" SET NOT NULL;
ALTER TABLE "goals" ADD CONSTRAINT "goals_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON DELETE CASCADE;

ALTER TABLE "goal_contributions" ADD COLUMN "bookId" TEXT;
UPDATE "goal_contributions" SET "bookId" = 'lib_personal_emilio';
ALTER TABLE "goal_contributions" ALTER COLUMN "bookId" SET NOT NULL;
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON DELETE CASCADE;

ALTER TABLE "investments" ADD COLUMN "bookId" TEXT;
UPDATE "investments" SET "bookId" = 'lib_personal_emilio';
ALTER TABLE "investments" ALTER COLUMN "bookId" SET NOT NULL;
ALTER TABLE "investments" ADD CONSTRAINT "investments_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON DELETE CASCADE;

ALTER TABLE "investment_contributions" ADD COLUMN "bookId" TEXT;
UPDATE "investment_contributions" SET "bookId" = 'lib_personal_emilio';
ALTER TABLE "investment_contributions" ALTER COLUMN "bookId" SET NOT NULL;
ALTER TABLE "investment_contributions" ADD CONSTRAINT "investment_contributions_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON DELETE CASCADE;

ALTER TABLE "import_profiles" ADD COLUMN "bookId" TEXT;
UPDATE "import_profiles" SET "bookId" = 'lib_personal_emilio';
ALTER TABLE "import_profiles" ALTER COLUMN "bookId" SET NOT NULL;
ALTER TABLE "import_profiles" ADD CONSTRAINT "import_profiles_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON DELETE CASCADE;

ALTER TABLE "bank_accounts" ADD COLUMN "bookId" TEXT;
UPDATE "bank_accounts" SET "bookId" = 'lib_personal_emilio';
ALTER TABLE "bank_accounts" ALTER COLUMN "bookId" SET NOT NULL;
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON DELETE CASCADE;

ALTER TABLE "bank_statements" ADD COLUMN "bookId" TEXT;
UPDATE "bank_statements" SET "bookId" = 'lib_personal_emilio';
ALTER TABLE "bank_statements" ALTER COLUMN "bookId" SET NOT NULL;
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON DELETE CASCADE;

ALTER TABLE "bank_lines" ADD COLUMN "bookId" TEXT;
UPDATE "bank_lines" SET "bookId" = 'lib_personal_emilio';
ALTER TABLE "bank_lines" ALTER COLUMN "bookId" SET NOT NULL;
ALTER TABLE "bank_lines" ADD CONSTRAINT "bank_lines_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "Book"(id) ON DELETE CASCADE;


-- Las claves primarias naturales. `accounts.code` era la clave: dos libros tienen los dos su
-- cuenta 1101, así que la identidad pasa a ser el libro más el código. Primero caen las dos
-- llaves foráneas que apuntan a la cuenta, porque no se puede cambiar una clave primaria con
-- referencias colgando.
ALTER TABLE "journal_lines" DROP CONSTRAINT "journal_lines_accountCode_fkey";
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_parentCode_fkey";

ALTER TABLE "accounts" DROP CONSTRAINT "accounts_pkey";
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_pkey" PRIMARY KEY ("bookId", "code");

ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_bookId_accountCode_fkey"
  FOREIGN KEY ("bookId", "accountCode") REFERENCES "accounts"("bookId", "code");
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_bookId_parentCode_fkey"
  FOREIGN KEY ("bookId", "parentCode") REFERENCES "accounts"("bookId", "code");

-- Cada libro cierra sus propios meses, así que «2026-09» existe una vez por libro.
ALTER TABLE "accounting_periods" DROP CONSTRAINT "accounting_periods_pkey";
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_pkey" PRIMARY KEY ("bookId", "period");

ALTER TABLE "budget_income" DROP CONSTRAINT "budget_income_pkey";
ALTER TABLE "budget_income" ADD CONSTRAINT "budget_income_pkey" PRIMARY KEY ("bookId", "period");

-- Sin el libro adentro, dos familias no podrían tener las dos una categoría «Comida».
DROP INDEX IF EXISTS "categories_name_kind_key";
CREATE UNIQUE INDEX "categories_bookId_name_kind_key" ON "categories"("bookId", "name", "kind");

-- Los índices llevan el libro adelante porque toda consulta va a filtrar por él primero, y
-- un índice que no empiece por ahí no lo usa nadie.
DROP INDEX IF EXISTS "debts_direction_idx";
CREATE INDEX "debts_bookId_direction_idx" ON "debts"("bookId", "direction");
DROP INDEX IF EXISTS "accounts_parentCode_idx";
CREATE INDEX "accounts_bookId_parentCode_idx" ON "accounts"("bookId", "parentCode");
DROP INDEX IF EXISTS "accounts_accountClass_idx";
CREATE INDEX "accounts_bookId_accountClass_idx" ON "accounts"("bookId", "accountClass");
DROP INDEX IF EXISTS "journal_entries_date_idx";
CREATE INDEX "journal_entries_bookId_date_idx" ON "journal_entries"("bookId", "date");
DROP INDEX IF EXISTS "journal_entries_sourceMovementId_idx";
CREATE INDEX "journal_entries_bookId_sourceMovementId_idx" ON "journal_entries"("bookId", "sourceMovementId");
DROP INDEX IF EXISTS "journal_lines_accountCode_currency_idx";
CREATE INDEX "journal_lines_bookId_accountCode_currency_idx" ON "journal_lines"("bookId", "accountCode", "currency");
DROP INDEX IF EXISTS "movements_date_idx";
CREATE INDEX "movements_bookId_date_idx" ON "movements"("bookId", "date");
DROP INDEX IF EXISTS "movements_categoryId_idx";
CREATE INDEX "movements_bookId_categoryId_idx" ON "movements"("bookId", "categoryId");
DROP INDEX IF EXISTS "movements_status_idx";
CREATE INDEX "movements_bookId_status_idx" ON "movements"("bookId", "status");
DROP INDEX IF EXISTS "goals_priority_idx";
CREATE INDEX "goals_bookId_priority_idx" ON "goals"("bookId", "priority");
DROP INDEX IF EXISTS "goal_contributions_goalId_idx";
CREATE INDEX "goal_contributions_bookId_goalId_idx" ON "goal_contributions"("bookId", "goalId");
DROP INDEX IF EXISTS "investments_maturesAt_idx";
CREATE INDEX "investments_bookId_maturesAt_idx" ON "investments"("bookId", "maturesAt");
DROP INDEX IF EXISTS "investment_contributions_investmentId_idx";
CREATE INDEX "investment_contributions_bookId_investmentId_idx" ON "investment_contributions"("bookId", "investmentId");
DROP INDEX IF EXISTS "bank_statements_bankAccountId_idx";
CREATE INDEX "bank_statements_bookId_bankAccountId_idx" ON "bank_statements"("bookId", "bankAccountId");
DROP INDEX IF EXISTS "bank_lines_bankAccountId_status_idx";
CREATE INDEX "bank_lines_bookId_bankAccountId_status_idx" ON "bank_lines"("bookId", "bankAccountId", "status");
DROP INDEX IF EXISTS "bank_lines_date_idx";
CREATE INDEX "bank_lines_bookId_date_idx" ON "bank_lines"("bookId", "date");

-- Las tablas sin índice propio igual llevan uno del libro: sin él, cada consulta suya es un
-- recorrido completo en cuanto haya más de un libro.
CREATE INDEX "budget_models_bookId_idx" ON "budget_models"("bookId");
CREATE INDEX "budget_buckets_bookId_idx" ON "budget_buckets"("bookId");
CREATE INDEX "import_profiles_bookId_idx" ON "import_profiles"("bookId");
CREATE INDEX "bank_accounts_bookId_idx" ON "bank_accounts"("bookId");
