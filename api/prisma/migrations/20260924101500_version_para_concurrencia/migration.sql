-- 6b: control optimista y una conciliación por movimiento. Solo agrega (expand): el código
-- viejo ignora las columnas nuevas. En Postgres 11+ una columna con default constante no
-- reescribe la tabla. El índice se crea sin CONCURRENTLY porque las migraciones de Prisma corren
-- en transacción; bank_lines está vacía en producción (medido el 2026-09-24).
--
-- Para volver atrás (probado en local):
--   DROP INDEX "bank_lines_movimiento_conciliado_una_vez";
--   ALTER TABLE <cada tabla> DROP COLUMN "version";

-- AlterTable
ALTER TABLE "accounting_periods" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "bank_lines" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "budget_income" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "budget_models" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "categories" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "debts" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "goals" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "import_profiles" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "investments" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "movements" ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "bank_lines_movimiento_conciliado_una_vez" ON "bank_lines"("movementId") WHERE (status = 'MATCHED');

