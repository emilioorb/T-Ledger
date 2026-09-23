// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import { renderizarPortada } from './entrada'

// El mismo reemplazo que usa el build SSR (vite.config.ts): el módulo virtual es del plugin de PWA.
vi.mock('virtual:pwa-register/react', () => import('@/features/pwa/registro-en-servidor'))

// En Node, como en el build: sin window ni document. Si algo de la raíz o de la portada vuelve a
// leer una API del navegador durante el render, falla acá y no en el deploy.
describe('renderizarPortada', () => {
  it('renderiza la portada entera en Node, con el titular', async () => {
    const html = await renderizarPortada()

    expect(html).toContain('<h1')
    expect(html).toContain('Vos anotás')
  })

  it('no trae scripts: la CSP no los dejaría correr, y la hidratación no los necesita', async () => {
    expect(await renderizarPortada()).not.toContain('<script')
  })
})
