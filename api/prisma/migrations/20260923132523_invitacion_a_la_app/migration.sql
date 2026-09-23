-- CreateTable
CREATE TABLE "access_invitations" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "usedAt" TIMESTAMPTZ(3),
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "access_invitations_email_idx" ON "access_invitations"("email");
