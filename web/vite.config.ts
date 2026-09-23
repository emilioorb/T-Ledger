import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import { build, type Plugin } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import pkg from './package.json' with { type: 'json' }
import { aplicacionDesde } from './src/prerender/aplicacion-desde.ts'
import { inyectarPortada } from './src/prerender/inyectar-portada.ts'
import { postergarJavaScript } from './src/prerender/postergar-javascript.ts'

// Arma las dos puertas sobre el index.html ya compilado: index.html, con la portada
// renderizada, para `/`; y app.html, sin portada, para el resto de las rutas (lo reescribe
// vercel.json). La portada sale de un build SSR que este mismo plugin corre en cada build, así
// nunca se cuela una de un build anterior. En generateBundle, antes de que la PWA arme el
// precache. https://vite.dev/guide/ssr#pre-rendering-ssg
const SALIDA_DEL_PRERENDER = path.resolve(import.meta.dirname, '.prerender')

const portadaPrerenderizada = (): Plugin => ({
  name: 't-ledger:portada-prerenderizada',
  apply: 'build',
  enforce: 'post',
  async generateBundle(_, bundle) {
    const index = bundle['index.html']
    if (index?.type !== 'asset') throw new Error('El build no emitió index.html')
    await build({
      configFile: path.resolve(import.meta.dirname, 'vite.config.ts'),
      logLevel: 'warn',
      build: {
        ssr: 'src/prerender/entrada.tsx',
        outDir: SALIDA_DEL_PRERENDER,
        emptyOutDir: true,
        copyPublicDir: false,
      },
    })
    // Con `?v=`: Node guarda los módulos importados, y en `vite build --watch` serviría la portada
    // del primer build.
    const entrada = `${pathToFileURL(path.join(SALIDA_DEL_PRERENDER, 'entrada.js')).href}?v=${Date.now()}`
    const { renderizarPortada } = (await import(entrada)) as {
      renderizarPortada: () => Promise<string>
    }
    const plantilla = String(index.source)
    index.source = postergarJavaScript(inyectarPortada(plantilla, await renderizarPortada()))
    this.emitFile({ type: 'asset', fileName: 'app.html', source: aplicacionDesde(plantilla) })
  },
})

export default defineConfig(({ isSsrBuild }) => ({
  // La versión y el año, para que el pie de página no los repita a mano.
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __BUILD_YEAR__: JSON.stringify(String(new Date().getFullYear())),
  },
  // tanstackRouter() va antes que react(): al revés, la generación del árbol de rutas
  // y el code splitting fallan en silencio.
  plugins: [
    tanstackRouter({ target: 'react', autoCodeSplitting: true }),
    react(),
    tailwindcss(),
    !isSsrBuild && portadaPrerenderizada(),
    // El build SSR solo renderiza la portada: el service worker es cosa del build de cliente.
    !isSsrBuild &&
    VitePWA({
      // Avisa y espera: recargar sola haría perder un formulario a medio llenar.
      registerType: 'prompt',
      // Los íconos salen de pwa-assets.config.ts. El theme-color va a mano en index.html, uno
      // por tema del sistema.
      pwaAssets: { config: true, injectThemeColor: false },
      manifest: {
        // La identidad de la app instalada: fija, para que cambiar start_url no la duplique.
        id: '/',
        name: 'T-Ledger',
        short_name: 'T-Ledger',
        description: 'Finanzas personales con contabilidad de partida doble.',
        lang: 'es',
        // Quien instala la app es quien la usa: abre en el tablero y no pasa por la portada, que
        // con sesión solo redirigiría.
        start_url: '/tablero',
        display: 'standalone',
        background_color: '#0e0c0a',
        theme_color: '#0e0c0a',
      },
      // Solo la interfaz queda en el dispositivo. Sin runtimeCaching, nada de /api se guarda, y
      // el denylist evita que una navegación a /api reciba el index.html del caché.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // La imagen para compartir en redes: la app nunca la muestra.
        globIgnores: ['og.png'],
        navigateFallbackDenylist: [/^\/api(\/|$)/],
        // Sin red, cualquier ruta abre app.html, que llega vacío. index.html trae la portada
        // escrita y solo corresponde a `/`, que el precache ya sirve por su cuenta.
        navigateFallback: 'app.html',
        // `/?ref=…` tiene que abrir index.html, con su portada, y no caer en app.html. Los assets
        // llevan hash en el nombre: ninguno depende de su query.
        ignoreURLParametersMatching: [/.*/],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, 'src'),
      // En el build SSR no hay plugin de PWA que resuelva su módulo virtual.
      ...(isSsrBuild && {
        'virtual:pwa-register/react': path.resolve(import.meta.dirname, 'src/features/pwa/registro-en-servidor.ts'),
      }),
    },
  },
  // API_URL permite apuntar a otro puerto sin tocar el archivo, cuando el 3000 está tomado.
  server: { proxy: { '/api': process.env.API_URL ?? 'http://localhost:3000' } },
  test: {
    // globals: true es lo que habilita el cleanup automático de Testing Library;
    // sin él, el DOM se acumula entre tests del mismo archivo.
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.spec.{ts,tsx}'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.spec.{ts,tsx}', 'src/generated/**', 'src/routeTree.gen.ts', 'src/test/**'],
      reporter: ['text-summary', 'json-summary', 'lcov'],
    },
  },
}))
