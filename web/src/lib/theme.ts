import { crearAjuste } from './ajuste-local'

// Lo que termina escrito en el documento. Son dos: el sistema no es un tema, es de dónde
// sacarlo.
export type Theme = 'dark' | 'light'

// Y lo que la persona eligió, que puede ser «el que tenga el sistema».
export type Preferencia = Theme | 'system'

const STORAGE_KEY = 'finanzas.theme'

const CONSULTA = '(prefers-color-scheme: dark)'

export const temaDelSistema = (): Theme => (window.matchMedia(CONSULTA).matches ? 'dark' : 'light')

export const resolver = (preferencia: Preferencia): Theme =>
  preferencia === 'system' ? temaDelSistema() : preferencia

const pintar = (preferencia: Preferencia): void => {
  document.documentElement.dataset.theme = resolver(preferencia)
}

// Oscuro por defecto: DESIGN.md lo fija como el tema que abre, no como una variante. Quien
// quiera seguir al sistema lo pide; no se asume, porque un sistema en claro abriría un libro
// contable en un tema que el producto no eligió.
export const tema = crearAjuste<Preferencia>(
  STORAGE_KEY,
  (guardado) =>
    guardado === 'light' || guardado === 'dark' || guardado === 'system' ? guardado : 'dark',
  (valor) => valor,
  pintar,
)

export const readTheme = (): Theme => resolver(tema.leer())

export const applyTheme = (preferencia: Preferencia): void => tema.poner(preferencia)

// Mientras la preferencia sea «el del sistema», hay que seguirlo: alguien que cambia el modo
// del sistema operativo con la app abierta espera que la app cambie, no que espere a la
// próxima recarga.
export const seguirAlSistema = (): (() => void) => {
  const consulta = window.matchMedia(CONSULTA)
  const alCambiar = () => {
    if (tema.leer() === 'system') pintar('system')
  }
  consulta.addEventListener('change', alCambiar)
  return () => consulta.removeEventListener('change', alCambiar)
}

// Exportada porque public/antes-de-pintar.js la lee antes de que exista la app.
export const CLAVE_DEL_TEMA_DE_ENTRADA = `${STORAGE_KEY}.entrada`

// El tema de las pantallas de antes de entrar —la landing, entrar y crear cuenta—, aparte del
// de adentro: abren en papel blanco y no en el oscuro de la app, y quien lo cambia en la
// landing espera que el formulario de entrar lo siga. No pinta el documento al cambiar: cada
// pantalla lo aplica con `forceTheme`, que al salir devuelve la preferencia de adentro.
export const temaDeEntrada = crearAjuste<Theme>(
  CLAVE_DEL_TEMA_DE_ENTRADA,
  (guardado) => (guardado === 'dark' ? 'dark' : 'light'),
  (valor) => valor,
)

// Una pantalla puede correr en un tema propio —la de entrar es papel blanco con tinta negra—
// y al salir el documento vuelve a la preferencia de la persona, que nunca se tocó.
//
// El atributo va en el <html> y no en la pantalla: los tokens que consume shadcn se arman en
// `@theme inline`, donde `--color-foreground: var(--text)` se computa una sola vez contra el
// `--text` del documento. Redefinir `--text` más abajo no los recalcula, y el resultado es
// una pantalla clara con el texto del tema oscuro encima: invisible.
export const forceTheme = (theme: Theme): (() => void) => {
  document.documentElement.dataset.theme = theme
  return () => pintar(tema.leer())
}
