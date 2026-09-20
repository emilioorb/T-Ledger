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
