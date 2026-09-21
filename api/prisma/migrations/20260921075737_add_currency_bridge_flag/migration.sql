-- AlterTable
ALTER TABLE "accounts" ADD COLUMN     "isCurrencyBridge" BOOLEAN NOT NULL DEFAULT false;

-- La cuenta semilla 1190 ya era el puente entre monedas: lo decía su nombre y un comentario,
-- no un dato. Marcarla acá es lo que evita que una instalación existente quede con el puente
-- sin declarar y el patrimonio consolidado mal valuado.
UPDATE "accounts" SET "isCurrencyBridge" = true WHERE "code" = '1190';
