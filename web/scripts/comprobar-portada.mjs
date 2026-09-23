import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'
import { chromium } from 'playwright-core'

// Uso: node scripts/prerender.mjs, después de `npm run build`.
// Sirve dist/ como Vercel (cabeceras de vercel.json, primero los archivos, el resto a
// app.html) y comprueba en Chrome lo que la spec del prerender promete. Sale con 1 si algo falla.
const DIST = path.resolve(import.meta.dirname, '..', 'dist')
const vercel = JSON.parse(readFileSync(path.resolve(import.meta.dirname, '..', 'vercel.json'), 'utf8'))
const CABECERAS = Object.fromEntries(vercel.headers[0].headers.map(({ key, value }) => [key, value]))
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.webmanifest': 'application/manifest+json', '.json': 'application/json' }

const archivoPara = (url) => {
  const ruta = decodeURIComponent(new URL(url, 'http://x').pathname)
  const directo = path.join(DIST, ruta === '/' ? 'index.html' : ruta)
  if (directo.startsWith(DIST) && existsSync(directo) && statSync(directo).isFile()) return directo
  return path.join(DIST, 'app.html')
}

const servidor = createServer((pedido, respuesta) => {
  if (pedido.url.startsWith('/api/')) {
    respuesta.writeHead(404, { 'content-type': 'application/json' }).end('{}')
    return
  }
  const archivo = archivoPara(pedido.url)
  respuesta.writeHead(200, { ...CABECERAS, 'content-type': TIPOS[path.extname(archivo)] ?? 'application/octet-stream' })
  createReadStream(archivo).pipe(respuesta)
})
await new Promise((listo) => servidor.listen(0, listo))
const base = `http://localhost:${servidor.address().port}`

// Lo que dice la consola cuando la hidratación no calza o la CSP bloquea algo.
const GRAVE = /hydrat|did not match|#418|#423|#425|Content Security Policy|violates|mismatch/i
const fallas = []
const revisar = (condicion, mensaje) => {
  console.log(`${condicion ? 'ok   ' : 'FALLA'} ${mensaje}`)
  if (!condicion) fallas.push(mensaje)
}

// Guarda, antes de que corra el JavaScript de la app, el <h1> y cada tema que tomó el documento.
// Corre cuando todavía no existe <html>: por eso observa `document` y no `documentElement`.
const ESPIA = () => {
  window.__temas = []
  new MutationObserver(() => window.__temas.push(document.documentElement.dataset.theme)).observe(
    document,
    { attributes: true, attributeFilter: ['data-theme'], subtree: true },
  )
  document.addEventListener('readystatechange', () => {
    if (document.readyState !== 'interactive') return
    window.__temaInicial = document.documentElement.dataset.theme
    window.__titular = document.querySelector('h1')
  })
}

const abrir = async (navegador, { ruta, almacenamiento = {} }) => {
  const contexto = await navegador.newContext({ serviceWorkers: 'block' })
  await contexto.addInitScript((datos) => {
    for (const [clave, valor] of Object.entries(datos)) localStorage.setItem(clave, valor)
  }, almacenamiento)
  await contexto.addInitScript(ESPIA)
  const pagina = await contexto.newPage()
  const consola = []
  pagina.on('console', (mensaje) => consola.push(mensaje.text()))
  pagina.on('pageerror', (error) => consola.push(error.message))
  await pagina.goto(`${base}${ruta}`, { waitUntil: 'networkidle' })
  await pagina.waitForTimeout(1500)
  return { contexto, pagina, consola }
}

const navegador = await chromium.launch({ channel: 'chrome' })
try {
  const html = await (await fetch(`${base}/`)).text()
  revisar(html.includes('<h1'), 'el HTML de / trae la portada escrita')

  const claro = await abrir(navegador, { ruta: '/' })
  revisar(!claro.consola.some((m) => GRAVE.test(m)), `sin errores de hidratación ni de CSP en / (${claro.consola.filter((m) => GRAVE.test(m)).join(' | ') || 'limpio'})`)
  revisar(await claro.pagina.evaluate(() => window.__titular !== null && window.__titular === document.querySelector('h1')), 'la hidratación conserva el mismo <h1>: nada se redibuja')
  revisar(await claro.pagina.evaluate(() => window.__temaInicial === 'light' && !window.__temas.includes('dark')), 'la portada abre en claro y no pasa por oscuro')
  revisar(await claro.pagina.evaluate(() => document.querySelector('canvas') !== null), 'el fondo de puntos se monta después de hidratar')
  await claro.contexto.close()

  const oscuro = await abrir(navegador, { ruta: '/', almacenamiento: { 'finanzas.theme.entrada': 'dark' } })
  revisar(await oscuro.pagina.evaluate(() => window.__temaInicial === 'dark' && !window.__temas.includes('light')), 'con el tema oscuro guardado, nunca pasa por claro')
  revisar(!oscuro.consola.some((m) => GRAVE.test(m)), 'sin errores de hidratación en oscuro')
  await oscuro.contexto.close()

  const conSesion = await abrir(navegador, { ruta: '/', almacenamiento: { 't-ledger:hubo-sesion': '1' } })
  revisar(new URL(conSesion.pagina.url()).pathname !== '/', `quien tuvo sesión no se queda en la portada (terminó en ${new URL(conSesion.pagina.url()).pathname})`)
  await conSesion.contexto.close()

  const tablero = await (await fetch(`${base}/tablero`)).text()
  revisar(!tablero.includes('<h1'), '/tablero recibe app.html, sin la portada')
} finally {
  await navegador.close()
  servidor.close()
}

process.exit(fallas.length === 0 ? 0 : 1)
