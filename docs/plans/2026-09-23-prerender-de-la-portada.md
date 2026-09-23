# Spec: la portada llega escrita en el HTML

## Objetivo

Hoy la portada (`/`) no pinta nada hasta bajar y evaluar el JavaScript de entrada (~177 KB
gzip, la mayor parte React DOM): el HTML que manda Vercel es un `<div id="root">` vacío. En
PageSpeed móvil eso da un LCP de 2,6 a 4,4 s, y el LCP es el titular «Vos anotás una cosa. El
libro escribe dos.», que es texto fijo.

Se quiere que el HTML de `/` ya traiga la portada renderizada al compilar, para que el
navegador la muestre apenas llegan el HTML y el CSS, y que React después **hidrate** ese HTML
en vez de reemplazarlo.

Para quién: quien abre el enlace por primera vez. Quien ya tiene sesión no tiene por qué
notar nada.

## Criterios de éxito

1. **LCP ≤ 2,5 s** en PageSpeed móvil de producción, en las tres corridas (`?psi=1..3`).
   Hoy: 2,6 / 4,2 / 4,4 s.
2. **Sin salto a la vista.** Las animaciones de entrada (renglones que salen de la pata,
   totales que corren) no arrancan dos veces cuando llega el JavaScript. Cero errores de
   hidratación en la consola.
3. **La CSP no se afloja.** `script-src 'self'` sigue igual: nada de scripts inline ni hashes.
4. **Quien vuelve con sesión** no ve la portada: igual que hoy, va al tablero.
5. **Quien eligió el tema oscuro** en la portada la ve oscura desde el primer cuadro, sin un
   destello claro.
6. **Ninguna otra ruta muestra la portada**, ni un instante: `/tablero`, `/entrar`, una ruta
   profunda recargada, y lo mismo sin red, servido por el service worker.
7. Sin regresiones: 122 tests del front en verde, `check:full` limpio (axe sin violaciones
   graves, bundle dentro del presupuesto).

## Cómo

Revisado con doubt-driven-development (revisor adversarial con contexto nuevo): lo de abajo ya
incorpora los 14 hallazgos. La tabla de conciliación está al final.

- **Render al compilar.** Primero un build de Vite en modo SSR (`vite build --ssr`, salida en
  `.prerender/`, sin el plugin de PWA) con una entrada `src/prerender.tsx` que arma el router
  con historia en memoria en `/`, espera `router.load()` y hace
  `renderToString(<RouterProvider />)`. Después el build de cliente, cuyo `transformIndexHtml`
  mete ese HTML en el `#root` de `index.html` **antes** de que la PWA arme el precache.
  `app.html` es una segunda entrada HTML de Vite, sin portada. Sin dependencias nuevas.
- **Hidratar sin el estado del servidor.** La hidratación oficial de TanStack Router
  (`RouterServer`/`RouterClient`) es experimental fuera de TanStack Start y serializa el estado
  en un `<script>` inline, que la CSP bloquea. `/` no tiene loaders: el cliente hace
  `await router.load()` y después `hydrateRoot` en vez de `createRoot`, solo cuando `#root`
  trae contenido. Así el primer render del cliente es igual al del servidor.
- **Dos HTML.** `index.html` con la portada y `app.html` vacío, que sirve a todas las demás
  rutas (reescritura de Vercel y `navigateFallback` del service worker).
- **Tema y sesión antes de pintar**, con un `public/antes-de-pintar.js` externo y chiquito en
  el `<head>` de `index.html` (bloquea el pintado, pero pesa unos cientos de bytes y queda en
  el caché). Pone el `data-theme` de la portada y, si este navegador tuvo sesión, **redirige a
  `/tablero`** antes de pintar. Cambio visible: a quien se le venció la sesión y vuelve a `/`
  ya no le aparece la portada; va a `/tablero` y de ahí a `/entrar`. `localStorage` va dentro
  de `try/catch`.
- **El tema no se pisa al hidratar.** `MarcoPublico` aplica el tema guardado, no la instantánea
  de servidor, y `main.tsx` no pinta el tema de adentro de la app cuando hidrata la portada. El
  botón del tema renderiza los dos íconos y el CSS muestra el del tema puesto.
- **Lo que en el servidor no existe** (`window`, `document`, `matchMedia`, `navigator`) no se
  lee durante el render: la sumadora arranca en 0 en los dos lados, `useCurrentTheme` y
  `useEnLinea` llevan instantánea de servidor, y el cliente de Better Auth no toca `window` al
  importarse.
- **Lo que llega tarde no salta.** El fondo 3D se monta después de hidratar (ya entra con un
  fundido). La fila de totales ocupa su lugar pero queda invisible hasta hidratar, y la
  sumadora cuenta desde el inicio de la página, no desde el montaje: si el JavaScript llega
  cuando la cuenta ya terminó, aparece el total final sin animar.
- **Hidratar o crear.** `main.tsx` hidrata solo si `#root` trae un elemento
  (`firstElementChild`), el router terminó en `/` sin redirección ni error y la ubicación
  coincide. En cualquier otro caso vacía el contenedor y usa `createRoot`.
- **Un chequeo del build real.** `web/scripts/prerender.mjs` abre `index.html` servido con las
  cabeceras de producción y falla si la consola trae errores de hidratación o violaciones de
  CSP. Se suma a `check:full`.

## Riesgos

| Riesgo | Qué se hace |
|---|---|
| Que la hidratación sin estado serializado no calce con TanStack Router | La tarea 1 es una prueba de concepto con el criterio 2 como go/no-go. Si falla, se para y se vuelve a hablar antes de escribir el resto. |
| Que un componente de la raíz (aviso de versión, sin conexión, Toaster) pinte distinto en el servidor | Se ve en la consola como error de hidratación: se arregla con instantánea de servidor, o renderizándolo después del montaje. |
| Que el script del `<head>` retrase el primer pintado | Se mide en la traza: si pesa más que el CSS, se replantea. |
| Que la fuente cambie después del primer pintado y el LCP se mueva | Se mira en el desglose de LCP de PageSpeed. |

## Tareas

1. **Prueba de concepto.** `src/prerender.tsx`, el build SSR y la hidratación en `main.tsx`.
   Verificación: preview local, cero errores de hidratación, las animaciones no se repiten
   (chrome-devtools). Go/no-go.
2. **Dos HTML y rutas.** `app.html`, la reescritura en `vercel.json` y el `navigateFallback`.
   Verificación: los criterios 6 y 3 en el preview con las cabeceras de producción.
3. **Antes de pintar.** `antes-de-pintar.js` para el tema y la sesión. Verificación: los
   criterios 4 y 5.
4. **Medir.** Deploy, PageSpeed tres veces (criterio 1), `check:full` (criterio 7). Si el LCP
   no mejora más que la varianza, se revierte.
5. **Novedades.** Una nota en `Mejorado` de la próxima versión.

## Límites

- Siempre: TDD en lo que tenga lógica (el script que inyecta el HTML, la decisión de hidratar
  o crear), `check:task` al cerrar cada tarea y `check:full` antes del push.
- Preguntar antes: cualquier dependencia nueva, o cambiar la CSP.
- Nunca: `dangerouslySetInnerHTML` con un script, `'unsafe-inline'` en `script-src`, ni una
  segunda copia de la portada escrita a mano que se desincronice de la de React.

## Preguntas abiertas

Ninguna. El prerender tiene que andar sin cambiar lo que ve quien ya usa la app.

## Conciliación de la revisión adversarial

| # | Hallazgo | Clase | Resolución |
|---|---|---|---|
| 1 | `app.html` inyectado después del precache | Accionable | Inyección en `transformIndexHtml`; `app.html` como entrada de Vite |
| 2 | Destello de tema al hidratar y por `applyTheme` | Accionable | Tema guardado en `MarcoPublico`; sin `applyTheme` al hidratar |
| 3 | Nadie destapa la portada oculta | Accionable | Redirección a `/tablero` en vez de ocultar |
| 4 | `window`/`document` en render (sumadora, `useCurrentTheme`) | Accionable | Render sin APIs del navegador |
| 5 | Sumadora distinta con movimiento reducido | Accionable | 0 en los dos lados; lo reducido en el efecto |
| 6 | Totales desfasados de las animaciones CSS | Accionable | Fila invisible hasta hidratar; reloj desde el inicio de la página |
| 7 | `lazy` del fondo rompe la hidratación | Accionable | Fondo montado después de hidratar |
| 8 | Redirección antes de montar | Cubierto por 3 | Chequeo de estado del router, verificado en la tarea 1 |
| 9 | `router.isServer` en Node | Sin verificar | La tarea 1 comprueba que no haya `<script>` ni errores |
| 10 | El build SSR pisa `dist` | Accionable | `.prerender/`, sin PWA, antes del build de cliente |
| 11 | Ícono del tema equivocado al hidratar | Accionable | Los dos íconos, el CSS elige |
| 12 | Cascada antes de hidratar | Compromiso | No toca el LCP; `modulepreload` si pesa |
| 13 | Script bloqueante en el `<head>` | Compromiso | Se mide en la traza; `try/catch` |
| 14 | Nada prueba el camino nuevo | Accionable | `web/scripts/prerender.mjs` en `check:full` |
| — | `routes` con `rewrites` en `vercel.json` | Ruido | En producción desde hoy y responde bien |
