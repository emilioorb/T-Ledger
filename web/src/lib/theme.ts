export type Theme = 'dark' | 'light'

const STORAGE_KEY = 'finanzas.theme'

// Oscuro por defecto: DESIGN.md lo fija como el tema que abre, no como una variante.
export const readTheme = (): Theme => {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'light' || stored === 'dark' ? stored : 'dark'
}

export const applyTheme = (theme: Theme): void => {
  document.documentElement.dataset.theme = theme
  localStorage.setItem(STORAGE_KEY, theme)
}

// Una pantalla puede correr en un tema propio —la de entrar es papel blanco con tinta negra—
// y al salir el documento vuelve a la preferencia de la persona, que nunca se tocó.
//
// El atributo va en el <html> y no en la pantalla: los tokens que consume shadcn se arman en
// `@theme inline`, donde `--color-foreground: var(--text)` se computa una sola vez contra el
// `--text` del documento. Redefinir `--text` más abajo no los recalcula, y el resultado es
// una pantalla clara con el texto del tema oscuro encima: invisible.
export const forceTheme = (theme: Theme): (() => void) => {
  document.documentElement.dataset.theme = theme
  return () => {
    document.documentElement.dataset.theme = readTheme()
  }
}
