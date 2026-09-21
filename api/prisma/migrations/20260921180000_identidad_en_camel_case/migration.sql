-- Better Auth no compara sus tablas contra el nombre del modelo de Prisma sino contra la
-- propiedad del cliente: su adaptador lee el modelo de datos y convierte `AuthUser` en
-- `authUser` antes de comparar. Con los nombres en PascalCase la comparación no coincide
-- nunca y la aplicación arranca diciendo que faltan tablas que sí existen, y toda operación
-- de sesión responde 500.
--
-- Por eso los modelos de Better Auth quedan en camelCase mientras los del dominio siguen en
-- PascalCase con su @@map a snake_case. La inconsistencia es visible a propósito: en el
-- esquema se distingue de un vistazo qué tablas son de la librería y cuáles del dominio.
ALTER TABLE "AuthUser" RENAME TO "authUser";
ALTER TABLE "AuthSession" RENAME TO "authSession";
ALTER TABLE "AuthAccount" RENAME TO "authAccount";
ALTER TABLE "AuthVerification" RENAME TO "authVerification";
ALTER TABLE "Book" RENAME TO "book";
ALTER TABLE "BookMember" RENAME TO "bookMember";
ALTER TABLE "BookInvitation" RENAME TO "bookInvitation";
