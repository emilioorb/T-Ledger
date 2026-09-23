import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import path from 'node:path'

// Sirve dist/ como Vercel: cabeceras de vercel.json, primero los archivos y el resto a app.html.
// Solo en 127.0.0.1. /api no existe: sin sesión, como un visitante nuevo o una sesión vencida.
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

export const servirDist = async () => {
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
  return { base: `http://127.0.0.1:${servidor.address().port}`, cerrar: () => servidor.close() }
}
