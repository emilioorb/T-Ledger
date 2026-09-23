// Corre bloqueando, antes de que se pinte la portada prerenderizada de index.html. Sin módulos
// ni dependencias, y lo más chico posible: está en el camino del primer pintado. Las claves son
// las de recuerdo-de-sesion.ts y theme.ts (lo verifica antes-de-pintar.spec.ts).
;(function () {
  // Solo en la portada. En desarrollo index.html sirve todas las rutas, y redirigir al tablero
  // desde el tablero sería un bucle.
  if (location.pathname !== '/') return
  var raiz = document.documentElement
  try {
    // Quien tuvo sesión va al tablero sin ver la portada; si la sesión venció, el tablero lo
    // manda a entrar. El documento se oculta, porque el navegador sigue leyendo el HTML mientras
    // llega la otra página, y la marca le dice a main.tsx que no arranque.
    if (localStorage.getItem('t-ledger:hubo-sesion') === '1') {
      raiz.style.visibility = 'hidden'
      raiz.dataset.redirigiendo = ''
      location.replace('/tablero')
      return
    }
    raiz.dataset.theme = localStorage.getItem('finanzas.theme.entrada') === 'dark' ? 'dark' : 'light'
  } catch (error) {
    // Sin almacenamiento (Safari privado, cookies bloqueadas): la portada en su tema de siempre.
    raiz.dataset.theme = 'light'
  }
})()
