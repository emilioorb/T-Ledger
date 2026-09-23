import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright-core'

// Uso: node scripts/comprobar-portada.mjs, después de `vite build`.
// Sirve dist/ como Vercel (cabeceras de vercel.json, primero los archivos, el resto a app.html)
// y comprueba en Chrome lo que promete la spec del prerender
// (docs/plans/2026-09-23-prerender-de-la-portada.md). Sale con 1 si algo falla.
const DIST = path.resolve(import.meta.dirname, '..', 'dist')
const vercel = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '..', 'vercel.json'), 'utf8'))
const CABECERAS = Object.fromEntries(vercel.headers[0].headers.map(({ key, value }) => [key, value]))
const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.webmanifest': 'application/manifest+json',
  '.json': 'application/json',
}

const archivoPara = (url) => {
  let ruta
  try {
    ruta = decodeURIComponent(new URL(url, 'http://x').pathname)
  } catch {
    return null
  }
  const directo = path.join(DIST, ruta === '/' ? 'index.html' : ruta)
  const relativa = path.relative(DIST, directo)
  const adentro = relativa !== '' && !relativa.startsWith('..') && !path.isAbsolute(relativa)
  if (adentro && existsSync(directo) && statSync(directo).isFile()) return directo
  return path.join(DIST, 'app.html')
}

// /api no existe acá: sin sesión, que es lo que ve un visitante nuevo o una sesión vencida.
const servidor = createServer((pedido, respuesta) => {
  if (pedido.url.startsWith('/api/')) {
    respuesta.writeHead(404, { 'content-type': 'application/json' }).end('{}')
    return
  }
  const archivo = archivoPara(pedido.url)
  if (!archivo) {
    respuesta.writeHead(400).end()
    return
  }
  respuesta.writeHead(200, { ...CABECERAS, 'content-type': TIPOS[path.extname(archivo)] ?? 'application/octet-stream' })
  createReadStream(archivo).pipe(respuesta)
})
await new Promise((listo) => servidor.listen(0, '127.0.0.1', listo))
const base = `http://127.0.0.1:${servidor.address().port}`

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
  servidor.close()
}

process.exit(fallas.length === 0 ? 0 : 1)
