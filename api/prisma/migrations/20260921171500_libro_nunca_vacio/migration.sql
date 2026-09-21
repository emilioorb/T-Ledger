-- El `bookId` lleva un default vacío en el esquema por una razón de tipos, no de datos: sin
-- él, TypeScript exige el campo en cada `create` y habría que escribirlo a mano en los
-- catorce repositorios, justo lo que la extensión de Prisma existe para evitar.
--
-- Ese default nunca debe llegar a la base: la extensión lo pisa siempre con el libro del
-- contexto, y si no hay contexto tira en vez de escribir. Este CHECK es la red debajo de esa
-- red. Sin él, un fallo de la extensión guardaría filas con libro vacío, invisibles para
-- todos los libros y sin que nada avise, que es la peor forma de perder datos.

ALTER TABLE "debts" ADD CONSTRAINT "debts_bookId_no_vacio" CHECK ("bookId" <> '');
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_bookId_no_vacio" CHECK ("bookId" <> '');
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_bookId_no_vacio" CHECK ("bookId" <> '');
ALTER TABLE "journal_lines" ADD CONSTRAINT "journal_lines_bookId_no_vacio" CHECK ("bookId" <> '');
ALTER TABLE "categories" ADD CONSTRAINT "categories_bookId_no_vacio" CHECK ("bookId" <> '');
ALTER TABLE "movements" ADD CONSTRAINT "movements_bookId_no_vacio" CHECK ("bookId" <> '');
ALTER TABLE "accounting_periods" ADD CONSTRAINT "accounting_periods_bookId_no_vacio" CHECK ("bookId" <> '');
ALTER TABLE "budget_models" ADD CONSTRAINT "budget_models_bookId_no_vacio" CHECK ("bookId" <> '');
ALTER TABLE "budget_buckets" ADD CONSTRAINT "budget_buckets_bookId_no_vacio" CHECK ("bookId" <> '');
ALTER TABLE "budget_income" ADD CONSTRAINT "budget_income_bookId_no_vacio" CHECK ("bookId" <> '');
ALTER TABLE "goals" ADD CONSTRAINT "goals_bookId_no_vacio" CHECK ("bookId" <> '');
ALTER TABLE "goal_contributions" ADD CONSTRAINT "goal_contributions_bookId_no_vacio" CHECK ("bookId" <> '');
ALTER TABLE "investments" ADD CONSTRAINT "investments_bookId_no_vacio" CHECK ("bookId" <> '');
ALTER TABLE "investment_contributions" ADD CONSTRAINT "investment_contributions_bookId_no_vacio" CHECK ("bookId" <> '');
ALTER TABLE "import_profiles" ADD CONSTRAINT "import_profiles_bookId_no_vacio" CHECK ("bookId" <> '');
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_bookId_no_vacio" CHECK ("bookId" <> '');
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_bookId_no_vacio" CHECK ("bookId" <> '');
ALTER TABLE "bank_lines" ADD CONSTRAINT "bank_lines_bookId_no_vacio" CHECK ("bookId" <> '');
