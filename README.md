# T-Ledger

Finanzas personales con contabilidad de partida doble. Vos anotás una cosa; el libro escribe dos.

Anotás un gasto en segundos y el sistema arma el asiento. Con eso responde lo que una lista de montos no puede: en qué mes se libera cada cuota, cuánto interés se ahorra abonando de más, si una meta llega a su fecha y si el mes cierra.

## Qué hace

- **Registrar**: movimientos que arman su propio asiento, con comprobante adjunto.
- **Decidir**: deudas con amortización y plan de pago, metas, inversiones y proyección de flujo de caja.
- **Chequear**: tablero del mes, presupuesto por cubetas y patrimonio en una sola moneda.
- **Cuadrar**: mayor, comprobación, situación, resultados, cierre mensual y conciliación bancaria.
- **Compartir**: varios libros por persona, con invitaciones, tres roles y registro de auditoría.

## Stack

| Parte | Tecnología |
|---|---|
| `api/` | Node 24, NestJS, Prisma, PostgreSQL 18, Better Auth |
| `web/` | React 19, TanStack Router y Query, Vite, Tailwind 4, shadcn/ui |
| Servicios | BCCR (tipo de cambio), Cloudflare R2 (comprobantes), Sentry (errores) |

## Arranque local

Requisitos: Node 24 o más nuevo, y Docker.

```bash
cp .env.example .env              # completar AUTH_SECRET; el resto trae valores locales
docker compose up -d              # PostgreSQL en el puerto 5433

cd api
npm install
npx prisma migrate deploy
npx tsx scripts/crear-primer-usuario.ts vos@ejemplo.com "una contraseña larga" "Tu nombre"
npm run build && node --env-file=../.env dist/main.js     # API en :3000

cd ../web
npm install
npm run dev                       # app en :5173, con /api apuntando a la API
```

La primera cuenta se crea con el script: las demás entran por invitación. Al crear el primer libro, el plan de cuentas se siembra solo.

## Scripts

| Dónde | Comando | Qué hace |
|---|---|---|
| `api` | `npm test` · `npm run typecheck` · `npm run lint` | Pruebas, tipos y lint |
| `api` | `npm run datos:prueba` | Siembra tres meses de movimientos; `-- --borrar` los saca |
| `web` | `npm test` · `npm run typecheck` · `npm run build` | Pruebas, tipos y build de producción |
| `web` | `npm run api:types` | Regenera los tipos del front desde el contrato OpenAPI |

## Documentación

- [`PRODUCT.md`](PRODUCT.md): para quién es, qué resuelve y qué no es.
- [`DESIGN.md`](DESIGN.md): el sistema visual, «la cinta de la sumadora».
- [`docs/decisions/`](docs/decisions/): las decisiones de arquitectura (ADR).
- [`novedades.md`](web/src/features/shell/novedades.md): qué cambió en cada entrega. Es el mismo archivo que muestra la app.

## Licencia

Código publicado solo para consulta. Todos los derechos reservados; ver [`LICENSE`](LICENSE).
