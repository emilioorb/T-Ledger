-- CreateTable
CREATE TABLE "budget_models" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "budget_models_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_buckets" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "bucketKey" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "percentage" DECIMAL(6,3) NOT NULL,
    "isSavings" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "accountCodes" TEXT[],

    CONSTRAINT "budget_buckets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budget_income" (
    "period" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" CHAR(3) NOT NULL,

    CONSTRAINT "budget_income_pkey" PRIMARY KEY ("period")
);

-- CreateIndex
CREATE UNIQUE INDEX "budget_buckets_modelId_bucketKey_key" ON "budget_buckets"("modelId", "bucketKey");

-- AddForeignKey
ALTER TABLE "budget_buckets" ADD CONSTRAINT "budget_buckets_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "budget_models"("id") ON DELETE CASCADE ON UPDATE CASCADE;
