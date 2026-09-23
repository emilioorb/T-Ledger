const SCRIPT_DE_ENTRADA = /<script type="module" crossorigin src=/
const PRECARGA = /\s*<link rel="modulepreload"[^>]*>/g

// En index.html la portada ya viene escrita: lo que pinta es el CSS, y el JavaScript solo hidrata.
// Con la red lenta, las precargas de módulos y el script de entrada le quitaban ancho de banda al
// CSS, y el primer pintado esperaba. Acá el JavaScript va detrás: sin precargas (el navegador
// pide los módulos al leer las importaciones) y con prioridad baja. app.html no pasa por acá,
// porque ahí el JavaScript sí es lo que pinta.
// https://web.dev/articles/fetch-priority
export const postergarJavaScript = (index: string): string => {
  if (!SCRIPT_DE_ENTRADA.test(index)) {
    throw new Error('index.html no tiene el <script type="module"> de entrada que había que postergar')
  }
  return index
    .replace(PRECARGA, '')
    .replace(SCRIPT_DE_ENTRADA, '<script type="module" crossorigin fetchpriority="low" src=')
}
