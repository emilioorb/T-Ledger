const ANTES_DE_PINTAR = /\s*<!--[^>]*?-->\s*<script src="\/antes-de-pintar\.js"><\/script>|\s*<script src="\/antes-de-pintar\.js"><\/script>/
const ETIQUETA_HTML = /<html lang="es" data-theme="[a-z]+">/

// app.html, el HTML de todas las rutas menos `/`, sale del index.html ya compilado: los mismos
// assets, sin el script que decide el tema de la portada (en otra ruta mandaría al tablero en
// bucle) y en el tema de adentro de la app. Si la plantilla cambió y no encuentra qué tocar,
// falla el build: publicar app.html a medias se vería recién en producción.
export const aplicacionDesde = (index: string): string => {
  if (!ANTES_DE_PINTAR.test(index)) {
    throw new Error('index.html ya no carga /antes-de-pintar.js: revisá qué tiene que sacar app.html')
  }
  if (!ETIQUETA_HTML.test(index)) {
    throw new Error('index.html ya no abre con <html lang="es" data-theme="…">: app.html no sabe dónde poner su tema')
  }
  return index.replace(ANTES_DE_PINTAR, '').replace(ETIQUETA_HTML, '<html lang="es" data-theme="dark">')
}
