import { chromium } from 'playwright-core'
import { servirDist } from './servir-dist.mjs'

// Uso: node scripts/comprobar-portada.mjs, después de `vite build`.
// Sirve dist/ como Vercel y comprueba en Chrome lo que promete la spec del prerender
// (docs/plans/2026-09-23-prerender-de-la-portada.md). Sale con 1 si algo falla.
const { base, cerrar } = await servirDist()

// Lo que dice la consola cuando la hidratación no calza o la CSP bloquea algo.
const GRAVE = /hydrat|did not match|#418|#423|#425|Content Security Policy|violates/i
const fallas = []
const revisar = (condicion, mensaje) => {
  console.log(`${condicion ? 'ok   ' : 'FALLA'} ${mensaje}`)
  if (!condicion) fallas.push(mensaje)
}
const graves = (consola) => consola.filter((mensaje) => GRAVE.test(mensaje))

// Guarda, antes de que corra el JavaScript de la app, el <h1> y cada tema que tomó el documento.
// Corre cuando todavía no existe <html>: por eso observa `document` y no `documentElement`.
const ESPIA = () => {
  window.__temas = []
  new MutationObserver(() => window.__temas.push(document.documentElement.dataset.theme)).observe(document, {
    attributes: true,
    attributeFilter: ['data-theme'],
    subtree: true,
  })
  document.addEventListener('readystatechange', () => {
    if (document.readyState !== 'interactive') return
    window.__temaInicial = document.documentElement.dataset.theme
    window.__titular = document.querySelector('h1')
  })
}

// Cambia el titular antes de que llegue el JavaScript: la hidratación ya no calza, y el chequeo
// tiene que darse cuenta. Si esto no falla, el resto de las comprobaciones no dice nada.
const CANARIO = () => {
  document.addEventListener('readystatechange', () => {
    if (document.readyState !== 'interactive') return
    const titular = document.querySelector('h1 span')
    if (titular) titular.textContent = 'canario'
  })
}

const HIDRATADA = () => document.querySelector('canvas') !== null

const abrir = async (navegador, { ruta = '/', almacenamiento = {}, opciones = {}, canario = false }) => {
  const contexto = await navegador.newContext({ serviceWorkers: 'block', ...opciones })
  // Una sola vez por pestaña: los init scripts corren en cada navegación, y volver a sembrar la
  // marca de sesión taparía que la app la borró.
  await contexto.addInitScript((datos) => {
    if (sessionStorage.getItem('__sembrado')) return
    for (const [clave, valor] of Object.entries(datos)) localStorage.setItem(clave, valor)
    sessionStorage.setItem('__sembrado', '1')
  }, almacenamiento)
  await contexto.addInitScript(ESPIA)
  if (canario) await contexto.addInitScript(CANARIO)
  const pagina = await contexto.newPage()
  const consola = []
  pagina.on('console', (mensaje) => consola.push(mensaje.text()))
  pagina.on('pageerror', (error) => consola.push(error.message))
  await pagina.goto(`${base}${ruta}`, { waitUntil: 'networkidle' })
  return { contexto, pagina, consola }
}

const navegador = await chromium.launch({ channel: 'chrome' })
try {
  const html = await (await fetch(`${base}/`)).text()
  revisar(html.includes('<h1'), 'el HTML de / trae la portada escrita')

  const canario = await abrir(navegador, { canario: true })
  await canario.pagina.waitForFunction(HIDRATADA)
  revisar(graves(canario.consola).length > 0, 'el canario: un titular alterado antes del JavaScript se reporta como error de hidratación')
  await canario.contexto.close()

  for (const tema of ['light', 'dark']) {
    const otro = tema === 'light' ? 'dark' : 'light'
    const { contexto, pagina, consola } = await abrir(navegador, {
      almacenamiento: tema === 'dark' ? { 'finanzas.theme.entrada': 'dark' } : {},
    })
    await pagina.waitForFunction(HIDRATADA)
    revisar(graves(consola).length === 0, `${tema}: sin errores de hidratación ni de CSP (${graves(consola).join(' | ') || 'limpio'})`)
    revisar(await pagina.evaluate(() => window.__titular !== null && window.__titular === document.querySelector('h1')), `${tema}: la hidratación conserva el mismo <h1>`)
    revisar(await pagina.evaluate(([esperado, contrario]) => window.__temaInicial === esperado && !window.__temas.includes(contrario), [tema, otro]), `${tema}: abre en su tema y nunca pasa por el otro`)
    await contexto.close()
  }

  // Después de hidratar, el router sigue navegando: a entrar y de vuelta a la portada, que esta
  // vez se crea en el navegador y hace su coreografía entera.
  const navegacion = await abrir(navegador, {})
  await navegacion.pagina.waitForFunction(HIDRATADA)
  await navegacion.pagina.getByRole('link', { name: 'Entrar' }).click()
  await navegacion.pagina.waitForURL('**/entrar')
  revisar(await navegacion.pagina.getByRole('button', { name: 'Entrar' }).isVisible(), 'navegar a /entrar después de hidratar muestra el formulario')
  await navegacion.pagina.goBack()
  await navegacion.pagina.waitForFunction(() => document.body.innerText.replace(/\s/g, '').includes('920000'))
  revisar(graves(navegacion.consola).length === 0, 'volver a la portada la crea en el navegador, con los totales, sin errores')
  await navegacion.contexto.close()

  // Con sesión, la portada hidratada salta sola al tablero, y de ahí se navega por el interior
  // de la app: todo con `router.ssr` puesto, que es como queda la sesión que entró por `/`.
  // Las cifras dan 404 (no hay API): lo que se mira es que el router y la hidratación no se
  // quejen y que la app se arme.
  const conSesion = await navegador.newContext({ serviceWorkers: 'block' })
  await conSesion.route('**/api/auth/get-session', (pedido) =>
    pedido.fulfill({
      json: {
        session: { id: 's', userId: 'u', token: 't', expiresAt: '2099-01-01T00:00:00.000Z', activeOrganizationId: 'l' },
        user: { id: 'u', email: 'prueba@t-ledger.local', name: 'Prueba', emailVerified: true, createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z' },
      },
    }),
  )
  const adentro = await conSesion.newPage()
  const consolaAdentro = []
  adentro.on('console', (mensaje) => consolaAdentro.push(mensaje.text()))
  adentro.on('pageerror', (error) => consolaAdentro.push(error.message))
  await adentro.goto(`${base}/`)
  await adentro.waitForURL('**/tablero')
  await adentro.getByRole('navigation', { name: 'Navegación' }).waitFor()
  await adentro.getByRole('link', { name: 'Deudas' }).first().click()
  await adentro.waitForURL('**/deudas')
  revisar(graves(consolaAdentro).length === 0, `con sesión, de la portada hidratada al tablero y a deudas sin errores (${graves(consolaAdentro).join(' | ') || 'limpio'})`)
  await conSesion.close()

  const calma = await abrir(navegador, { opciones: { reducedMotion: 'reduce' } })
  await calma.pagina.waitForFunction(HIDRATADA)
  revisar(await calma.pagina.evaluate(() => document.body.innerText.replace(/\s/g, '').includes('920000')), 'con movimiento reducido, los totales muestran el final apenas hidrata')
  revisar(graves(calma.consola).length === 0, 'con movimiento reducido, sin errores de hidratación')
  await calma.contexto.close()

  // Sesión vencida: la marca manda al tablero, el tablero a entrar, y la marca queda borrada.
  const vencida = await abrir(navegador, { almacenamiento: { 't-ledger:hubo-sesion': '1' } })
  await vencida.pagina.waitForURL('**/entrar**')
  revisar(new URL(vencida.pagina.url()).pathname === '/entrar', 'con la sesión vencida, la marca lleva a /entrar')
  revisar(await vencida.pagina.evaluate(() => localStorage.getItem('t-ledger:hubo-sesion') === null), 'y la marca queda borrada')
  await vencida.pagina.goto(`${base}/`, { waitUntil: 'networkidle' })
  revisar(new URL(vencida.pagina.url()).pathname === '/', 'volver a / muestra la portada: no hay bucle')
  await vencida.contexto.close()

  for (const ruta of ['/tablero', '/entrar', '/deudas/abc']) {
    const html = await (await fetch(`${base}${ruta}`)).text()
    revisar(!html.includes('<h1') && !html.includes('antes-de-pintar') && html.includes('data-theme="dark"'), `${ruta} recibe app.html: sin portada, sin el script del <head> y en oscuro`)
  }

  // Rendimiento con la red y la CPU de PageSpeed móvil (4G lento: 150 ms y 1,6 Mbps; CPU 4×).
  // Mediana de tres cargas: avisa si pasa del presupuesto de CONSTRAINTS.md, no corta la cadena.
  const medir = async () => {
    const contexto = await navegador.newContext({ viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true, serviceWorkers: 'block' })
    const pagina = await contexto.newPage()
    let pidioElFondo = false
    pagina.on('request', (pedido) => { if (pedido.url().includes('fondo-de-puntos')) pidioElFondo = true })
    const cdp = await contexto.newCDPSession(pagina)
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 })
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 })
    await pagina.goto(`${base}/`, { waitUntil: 'load' })
    await pagina.waitForFunction(() => performance.getEntriesByName('portada-hidratada').length > 0, null, { timeout: 60_000 })
    const medida = await pagina.evaluate(() => new Promise((listo) => {
      new PerformanceObserver((lista) => listo({
        lcp: lista.getEntries().at(-1)?.startTime ?? Infinity,
        hidratada: performance.getEntriesByName('portada-hidratada')[0]?.startTime ?? Infinity,
      })).observe({ type: 'largest-contentful-paint', buffered: true })
    }))
    await contexto.close()
    return { ...medida, pidioElFondo }
  }
  const medidas = [await medir(), await medir(), await medir()]
  const mediana = (valores) => Math.round([...valores].sort((a, b) => a - b)[1])
  revisar(medidas.every((m) => !m.pidioElFondo), 'en una pantalla táctil no se baja three.js (lleva-fondo.ts)')
  const lcp = mediana(medidas.map((m) => m.lcp))
  const hidratada = mediana(medidas.map((m) => m.hidratada))
  // Medidos el 2026-09-23 con este mismo método (CONSTRAINTS.md): el peor LCP de cinco cargas fue
  // 2828 ms, y hasta hidratar 6571 ms de mediana, más un 5 %.
  const PRESUPUESTO = { lcp: 2900, hidratada: 6900 }
  for (const [nombre, valor] of [['LCP', lcp], ['hasta hidratar', hidratada]]) {
    const tope = nombre === 'LCP' ? PRESUPUESTO.lcp : PRESUPUESTO.hidratada
    console.log(`${valor <= tope ? 'ok   ' : 'AVISO'} ${nombre} en 4G lento y CPU 4×: ${valor} ms (mediana de 3, presupuesto ${tope} ms)`)
  }

  // Sin red, lo sirve el service worker: app.html para las rutas, index.html para la portada
  // aunque traiga query.
  const sinRed = await navegador.newContext({ serviceWorkers: 'allow' })
  const pagina = await sinRed.newPage()
  await pagina.goto(`${base}/`, { waitUntil: 'networkidle' })
  await pagina.evaluate(() => navigator.serviceWorker.ready)
  await sinRed.setOffline(true)
  const tablero = await pagina.goto(`${base}/tablero`)
  revisar(tablero.fromServiceWorker() && !(await tablero.text()).includes('<h1'), 'sin red, /tablero sale del service worker sin la portada')
  const conQuery = await pagina.goto(`${base}/?ref=x`)
  revisar(conQuery.fromServiceWorker() && (await conQuery.text()).includes('<h1'), 'sin red, /?ref=x sale del service worker con la portada escrita')
  await sinRed.close()
} finally {
  await navegador.close()
  cerrar()
}

process.exit(fallas.length === 0 ? 0 : 1)
