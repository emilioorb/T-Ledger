-- CreateEnum
CREATE TYPE "TipoDeEnlace" AS ENUM ('LIBRO', 'APP');

-- CreateTable
CREATE TABLE "enlaces_de_invitacion" (
    "id" TEXT NOT NULL,
    "tipo" "TipoDeEnlace" NOT NULL,
    "email" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "accessInvitationId" TEXT,
    "bookInvitationId" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enlaces_de_invitacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "enlaces_de_invitacion_tokenHash_key" ON "enlaces_de_invitacion"("tokenHash");

-- CreateIndex
CREATE INDEX "enlaces_de_invitacion_accessInvitationId_idx" ON "enlaces_de_invitacion"("accessInvitationId");

-- CreateIndex
CREATE INDEX "enlaces_de_invitacion_bookInvitationId_idx" ON "enlaces_de_invitacion"("bookInvitationId");

-- AddForeignKey
ALTER TABLE "enlaces_de_invitacion" ADD CONSTRAINT "enlaces_de_invitacion_accessInvitationId_fkey" FOREIGN KEY ("accessInvitationId") REFERENCES "access_invitations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "enlaces_de_invitacion" ADD CONSTRAINT "enlaces_de_invitacion_bookInvitationId_fkey" FOREIGN KEY ("bookInvitationId") REFERENCES "bookInvitation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Cada enlace pertenece a exactamente una invitación, la de su tipo.
ALTER TABLE "enlaces_de_invitacion" ADD CONSTRAINT "enlaces_de_invitacion_una_invitacion" CHECK (
  ("tipo" = 'APP' AND "accessInvitationId" IS NOT NULL AND "bookInvitationId" IS NULL)
  OR ("tipo" = 'LIBRO' AND "bookInvitationId" IS NOT NULL AND "accessInvitationId" IS NULL)
);

-- Las invitaciones a la app que no se usaron no tienen enlace con token, y su enlace viejo ya no
-- deja registrarse: se borran y quien administra invita otra vez. En producción no había
-- ninguna vigente al escribir esto (2026-09-23).
DELETE FROM "access_invitations" WHERE "usedAt" IS NULL;
