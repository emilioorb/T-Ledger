-- CreateTable
CREATE TABLE "exchange_rates" (
    "id" TEXT NOT NULL,
    "indicator" CHAR(3) NOT NULL,
    "value" DECIMAL(14,6) NOT NULL,
    "publishedAt" DATE NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "exchange_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "exchange_rates_indicator_publishedAt_idx" ON "exchange_rates"("indicator", "publishedAt" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "exchange_rates_indicator_publishedAt_key" ON "exchange_rates"("indicator", "publishedAt");
