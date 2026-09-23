import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'
import pkg from './package.json' with { type: 'json' }

export default defineConfig({
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
        start_url: '/',
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
      },
    }),
  ],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
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
})
