-- Se va el default vacío que la migración anterior había puesto, y con él su CHECK.
--
-- Ese default existía para que TypeScript no exigiera `bookId` en cada `create`, apoyado en
-- que una extensión de Prisma lo rellenaba en tiempo de ejecución. Era un valor centinela que
-- no significaba nada y un CHECK haciendo de muleta para que no se guardara. La
-- documentación de Prisma confirma que una extensión no puede cambiar los tipos de entrada,
-- así que el truco no estaba resolviendo el problema: lo estaba escondiendo.
--
-- El libro ahora va explícito en cada escritura, que es el patrón que pide la guía de
-- control de acceso: la pertenencia se ve en el código, no la pone una capa invisible.

ALTER TABLE "debts" DROP CONSTRAINT "debts_bookId_no_vacio";
ALTER TABLE "debts" ALTER COLUMN "bookId" DROP DEFAULT;
ALTER TABLE "accounts" DROP CONSTRAINT "accounts_bookId_no_vacio";
ALTER TABLE "accounts" ALTER COLUMN "bookId" DROP DEFAULT;
ALTER TABLE "journal_entries" DROP CONSTRAINT "journal_entries_bookId_no_vacio";
ALTER TABLE "journal_entries" ALTER COLUMN "bookId" DROP DEFAULT;
ALTER TABLE "journal_lines" DROP CONSTRAINT "journal_lines_bookId_no_vacio";
ALTER TABLE "journal_lines" ALTER COLUMN "bookId" DROP DEFAULT;
ALTER TABLE "categories" DROP CONSTRAINT "categories_bookId_no_vacio";
ALTER TABLE "categories" ALTER COLUMN "bookId" DROP DEFAULT;
ALTER TABLE "movements" DROP CONSTRAINT "movements_bookId_no_vacio";
ALTER TABLE "movements" ALTER COLUMN "bookId" DROP DEFAULT;
ALTER TABLE "accounting_periods" DROP CONSTRAINT "accounting_periods_bookId_no_vacio";
ALTER TABLE "accounting_periods" ALTER COLUMN "bookId" DROP DEFAULT;
ALTER TABLE "budget_models" DROP CONSTRAINT "budget_models_bookId_no_vacio";
ALTER TABLE "budget_models" ALTER COLUMN "bookId" DROP DEFAULT;
ALTER TABLE "budget_buckets" DROP CONSTRAINT "budget_buckets_bookId_no_vacio";
ALTER TABLE "budget_buckets" ALTER COLUMN "bookId" DROP DEFAULT;
ALTER TABLE "budget_income" DROP CONSTRAINT "budget_income_bookId_no_vacio";
ALTER TABLE "budget_income" ALTER COLUMN "bookId" DROP DEFAULT;
ALTER TABLE "goals" DROP CONSTRAINT "goals_bookId_no_vacio";
ALTER TABLE "goals" ALTER COLUMN "bookId" DROP DEFAULT;
ALTER TABLE "goal_contributions" DROP CONSTRAINT "goal_contributions_bookId_no_vacio";
ALTER TABLE "goal_contributions" ALTER COLUMN "bookId" DROP DEFAULT;
ALTER TABLE "investments" DROP CONSTRAINT "investments_bookId_no_vacio";
ALTER TABLE "investments" ALTER COLUMN "bookId" DROP DEFAULT;
ALTER TABLE "investment_contributions" DROP CONSTRAINT "investment_contributions_bookId_no_vacio";
ALTER TABLE "investment_contributions" ALTER COLUMN "bookId" DROP DEFAULT;
ALTER TABLE "import_profiles" DROP CONSTRAINT "import_profiles_bookId_no_vacio";
ALTER TABLE "import_profiles" ALTER COLUMN "bookId" DROP DEFAULT;
ALTER TABLE "bank_accounts" DROP CONSTRAINT "bank_accounts_bookId_no_vacio";
ALTER TABLE "bank_accounts" ALTER COLUMN "bookId" DROP DEFAULT;
ALTER TABLE "bank_statements" DROP CONSTRAINT "bank_statements_bookId_no_vacio";
ALTER TABLE "bank_statements" ALTER COLUMN "bookId" DROP DEFAULT;
ALTER TABLE "bank_lines" DROP CONSTRAINT "bank_lines_bookId_no_vacio";
ALTER TABLE "bank_lines" ALTER COLUMN "bookId" DROP DEFAULT;
