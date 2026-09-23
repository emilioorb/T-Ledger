import AxeBuilder from '@axe-core/playwright'
import { chromium } from 'playwright-core'
import { servirDist } from './servir-dist.mjs'

// Uso: node scripts/accesibilidad.mjs [url-base], o con A11Y_URL. Sin ninguno revisa el dist/ local
// servido como Vercel: lo que se va a publicar, y sin depender de la red.
// Corre axe sobre las pantallas públicas, en claro y en oscuro, y falla con cualquier
// violación crítica o seria. Las pantallas con sesión quedan afuera: pedirían credenciales.
const externa = process.argv[2] ?? process.env.A11Y_URL
const local = externa ? undefined : await servirDist()
const base = externa ?? local.base
const PANTALLAS = ['/', '/entrar']
const TEMAS = ['light', 'dark']
const GRAVES = new Set(['critical', 'serious'])

// El Chrome instalado en la máquina: playwright-core no descarga navegadores.
const navegador = await chromium.launch({ channel: 'chrome' })
let graves = 0

try {
  for (const tema of TEMAS) {
    const contexto = await navegador.newContext({ colorScheme: tema })
    // La portada guarda el tema elegido; se siembra para revisar los dos.
    await contexto.addInitScript((t) => localStorage.setItem('finanzas.theme.entrada', t), tema)
    const pagina = await contexto.newPage()
    for (const ruta of PANTALLAS) {
      await pagina.goto(new URL(ruta, base).href, { waitUntil: 'networkidle' })
      const { violations } = await new AxeBuilder({ page: pagina })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze()
      const encontradas = violations.filter((v) => GRAVES.has(v.impact ?? ''))
      graves += encontradas.length
      console.log(`${tema.padEnd(5)} ${ruta.padEnd(8)} ${encontradas.length} graves, ${violations.length} en total`)
      for (const v of encontradas) console.log(`  [${v.impact}] ${v.id}: ${v.nodes.length} nodos — ${v.helpUrl}`)
    }
    await contexto.close()
  }
} finally {
  await navegador.close()
  local?.cerrar()
}

process.exit(graves === 0 ? 0 : 1)
