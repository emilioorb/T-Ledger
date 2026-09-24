# Constraints

La vara de T-Ledger: qué tiene que cumplir un cambio para entregarse, con el comando que lo
decide. Si un número no tiene comando al lado, es un deseo y no una regla.

Última revisión: 2026-09-23, Emilio Rodríguez.

## Piso (siempre bloquea)

- Nada de comentarios que apagan un chequeo: `@ts-ignore`, `@ts-nocheck`, `@ts-expect-error`,
  `eslint-disable`, `oxlint-disable`, `istanbul`/`v8`/`c8 ignore`, `nosemgrep`, `gitleaks:allow`.
- Nada sin terminar en código: `TODO`, `FIXME`, `catch {}` vacío, `throw new Error('Not implemented')`.
- Ningún test saltado (`.skip`, `.todo`, `.only`), borrado ni con aserciones quitadas.
- Ningún secreto en lo que git ve. Los `.env` están en `.gitignore` y ahí se quedan.
- Cero errores de tipos, cero errores de lint, y todos los tests en verde.
- Este archivo no se afloja para que un cambio pase. Se aprieta en silencio; aflojarlo es una
  decisión que se discute, y el guardia la marca.

Lo revisa `node scripts/guardia-del-piso.mjs` sobre el diff contra `origin/main`, más `tsc`, el
lint y la suite. Lo marcado se arregla en el código o entra en la tabla de excepciones.

## Con números

Hasta el **2026-10-07** lo que no es piso **avisa** sin cortar la cadena. Desde esa fecha
también bloquea: se sacan los `|| echo AVISO` de `package.json`.

| Dimensión | Regla | Por qué este número | Lo decide | Corre en |
|---|---|---|---|---|
| Tipos | Cero errores | Un error de tipos es un bug que todavía no se ejecutó | `tsc -b --noEmit` (web), `tsc --noEmit --incremental` (api) | tarea |
| Lint | Cero errores (los avisos no cuentan) | `rules-of-hooks` en web y la config de ESLint de la api | `oxlint src` (web), `eslint --cache .` (api) | edición, tarea |
| Secretos | Ninguno en lo sin commitear ni en lo que va a subir | El repo es público: un secreto que llega a GitHub está filtrado | `gitleaks git --pre-commit --redact` y `gitleaks git --redact --log-opts=origin/main..HEAD` | edición, completo |
| Cobertura de lo nuevo | ≥ 80 % de las líneas ejecutables que cambiaron | Obliga a un test sin exigirlo para una línea de config | `node scripts/cobertura-de-lo-nuevo.mjs` sobre el lcov de `vitest --coverage` | tarea |
| Dependencias | Ninguna vulnerabilidad conocida sin excepción anotada | osv-scanner no filtra por severidad; la excepción obliga a leer cada caso | `osv-scanner scan source -r .` | completo |
| Bundle | JS de entrada ≤ 131,3 kB, CSS ≤ 17,7 kB, fondo 3D ≤ 195,6 kB (brotli; no sube) | Lo de hoy más 0,5 %: el JS de entrada es lo que la portada evalúa antes de pintar | `npx size-limit` (en `web`, después de `vite build`) | completo |
| Portada prerenderizada | `/` llega escrita en el HTML, hidrata sin errores ni violaciones de CSP, conserva el mismo `<h1>`, respeta el tema guardado, y ninguna otra ruta la trae | Si la hidratación no calza, React redibuja la portada y las animaciones arrancan dos veces; es un bug, no un aviso | `node web/scripts/comprobar-portada.mjs` (después del build) | completo |
| Accesibilidad | Cero violaciones críticas o serias en `/` y `/entrar`, claro y oscuro | Las moderadas suelen ser discutibles; las graves dejan a alguien afuera | `node web/scripts/accesibilidad.mjs` sobre el `dist` local; con una URL, contra ese sitio (axe-core, WCAG 2.2 AA) | completo |

Las pantallas con sesión quedan fuera de axe: pedirían credenciales en el script.

## Medido, todavía sin bloquear

| Métrica | Hoy | Dirección | Cómo se mide |
|---|---|---|---|
| Cobertura de líneas (api) | 85.72 | no baja | `node scripts/cobertura-del-proyecto.mjs` tras la suite completa |
| Cobertura de líneas (web) | 29.11 | no baja | ídem |
| Portada en 4G lento y CPU 4×, LCP | 2440 ms | no sube (avisa sobre 2900) | `node web/scripts/comprobar-portada.mjs`, mediana de tres cargas con la red y la CPU de PageSpeed móvil |
| Portada en 4G lento y CPU 4×, hasta hidratar | 6571 ms | no sube (avisa sobre 6900) | ídem, con la marca `portada-hidratada` de `main.tsx` |
| PageSpeed móvil de la portada, TBT | 20 ms | no sube | PageSpeed Insights (la web, no la API ni Lighthouse local), tres corridas, se anota la peor |
| PageSpeed móvil de la portada, LCP | 4,4 s | no sube | ídem; la meta es 2,5 s. Con el prerender, lo que frenaba el primer pintado era el JavaScript quitándole ancho de banda al CSS: en `index.html` ahora va sin precargas y con prioridad baja |

Tolerancia del trinquete: 0,5 puntos, para que un archivo ajeno que se mueve no dispare el aviso.
Cuando un valor mejora, se anota el nuevo. PageSpeed cachea la misma URL unos minutos: para
repetir, `?psi=2`, `?psi=3`.

## Dónde corre cada cosa

| Etapa | Comando | Qué incluye | Tiempo en esta máquina |
|---|---|---|---|
| Edición | `npm run check:fast` | guardia del piso, gitleaks, oxlint | ~9 s (medido) |
| Fin de tarea | `npm run check:task` | lo anterior, tipos, lint de la api, tests relacionados con el diff y su cobertura | ~85 s con un cambio de código (medido); si el diff toca configs o `package.json`, Vitest corre las suites enteras y son ~7 min |
| Antes del push | `npm run check:full` | tipos, suites completas, trinquete, seguridad, bundle, accesibilidad | ~13 min (medido) |

`gitleaks` y `osv-scanner` están instalados con winget (`Gitleaks.Gitleaks`, `Google.OSVScanner`).
No hay CI: `check:full` corre a mano antes de cada push. Estos scripts reflejan esta tabla; si
difieren, manda este archivo.

## Excepciones

| ID | Regla | Dónde | Motivo | Dueño | Vence |
|---|---|---|---|---|---|
| E1 | Dependencias | `api`: `deepmerge-ts` 7.1.5 (GHSA-ggr8-5vv4-36mx, alta) | La fija `@prisma/config` y solo mezcla nuestro `prisma.config.ts`, que no es entrada de terceros. El arreglo es la 8.0.0, fuera del rango de Prisma 7. Anotada también en `api/osv-scanner.toml`. | Emilio | 2026-12-22 |
| E2 | PageSpeed móvil de la portada, TBT (anotado 20 ms, no sube) | `/` | Con el prerender, el primer pintado pasó de ~4 s a ~1,5 s y la evaluación del JavaScript quedó dentro de la ventana del TBT (antes corría con la pantalla en blanco): 120 / 50 / 490 ms. Traza del 2026-09-23 con CPU 4×, exceso sobre 50 ms después del FCP: fondo 3D ~690 ms, bundle de entrada ~750 ms, hidratación ~410 ms. | Emilio | 2026-12-22 |
| E3 | Aserciones quitadas (11, guardia del piso) | `api/.../identity/infrastructure/{registro,auth.config.e2e}.spec.ts`, `web/src/features/datos/{dar-acceso,enlace-de-invitacion}.spec.*` | Reescritas, no quitadas: cambió la firma de `puedeRegistrarse` (del correo al token del enlace) y el formato del enlace (`#token=`). Cada archivo quedó con más aserciones que antes (9→22, 8→22, 2→4, 4→5), y el borde «vence en este instante» que se había perdido se restituyó. Aceptada por Emilio el 2026-09-23. Deja de aplicar cuando la rama entre a `main`. | Emilio | 2026-10-07 |
