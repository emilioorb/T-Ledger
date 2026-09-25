ALTER TABLE "authUser" ADD COLUMN "bienvenidaVistaEn" TIMESTAMPTZ(3);

-- Quien ya usa la app no la ve: se marca con su alta, no con la hora del despliegue.
UPDATE "authUser" SET "bienvenidaVistaEn" = "createdAt";

CREATE TABLE "onboarding_steps" (
    "bookId" TEXT NOT NULL,
    "step" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "onboarding_steps_pkey" PRIMARY KEY ("bookId","step")
);

ALTER TABLE "onboarding_steps" ADD CONSTRAINT "onboarding_steps_bookId_fkey"
  FOREIGN KEY ("bookId") REFERENCES "book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
