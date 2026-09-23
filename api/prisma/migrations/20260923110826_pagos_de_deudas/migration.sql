-- CreateTable
CREATE TABLE "debt_payments" (
    "id" TEXT NOT NULL,
    "bookId" TEXT NOT NULL,
    "debtId" TEXT NOT NULL,
    "installmentNumber" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "movementId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_payments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "debt_payments_bookId_debtId_idx" ON "debt_payments"("bookId", "debtId");

-- CreateIndex
CREATE UNIQUE INDEX "debt_payments_debtId_installmentNumber_key" ON "debt_payments"("debtId", "installmentNumber");

-- AddForeignKey
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_debtId_fkey" FOREIGN KEY ("debtId") REFERENCES "debts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Hasta acá el saldo de una deuda propia salía del calendario: toda cuota vencida contaba como
-- pagada. Desde acá sale de los pagos registrados. Para que ninguna deuda existente cambie de
-- saldo al migrar, sus cuotas ya vencidas quedan pagadas sin movimiento, igual que al cargar
-- una deuda ya empezada. Las fechas siguen la misma regla que `addMonths`: el mes se suma a la
-- fecha de inicio y el día se ajusta al último del mes si no existe.
INSERT INTO "debt_payments" ("id", "bookId", "debtId", "installmentNumber", "date", "movementId")
SELECT gen_random_uuid()::text, d."bookId", d."id", n, (d."startDate" + make_interval(months => n))::date, NULL
FROM "debts" d
CROSS JOIN LATERAL generate_series(1, d."termMonths") AS n
WHERE d."direction" = 'BORROWED'
  AND (d."startDate" + make_interval(months => n))::date <= CURRENT_DATE;
