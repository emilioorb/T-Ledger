import { tanstackRouter } from '@tanstack/router-plugin/vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import { defineConfig } from 'vite'

export default defineConfig({
  // tanstackRouter() va antes que react(): al revés, la generación del árbol de rutas
  // y el code splitting fallan en silencio.
  plugins: [tanstackRouter({ target: 'react', autoCodeSplitting: true }), react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: { proxy: { '/api': 'http://localhost:3000' } },
})
