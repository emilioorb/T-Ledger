-- Renombrar y no borrar-y-crear. Prisma propuso `DROP COLUMN` + `ADD COLUMN`, que acá no
-- perdía nada —la columna estaba vacía en los 55 movimientos— pero en cualquier otra base
-- se habría llevado los comprobantes puestos, y la migración se corre en todas.
--
-- El campo cambia de nombre porque cambió de contenido: antes guardaba un enlace escrito a
-- mano y ahora guarda la clave del objeto en el almacenamiento. Un `receiptUrl` con una clave
-- adentro es un nombre que miente.
ALTER TABLE "movements" RENAME COLUMN "receiptUrl" TO "receiptKey";
