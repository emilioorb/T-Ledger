import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // tanstackRouter() va antes que react(): al revés, la generación del árbol de rutas
  // y el code splitting fallan en silencio.
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
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
  },
})
