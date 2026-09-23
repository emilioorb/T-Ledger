import { createRoot, hydrateRoot } from 'react-dom/client'
import { App } from './app'
import { iniciarObservabilidad, reportar } from './lib/observability'
import { applyTheme, seguirAlSistema, tema } from './lib/theme'
import { modoDeArranque, type Arranque } from './prerender/modo-de-arranque'
import { queryClient, router } from './router'
import './styles.css'

const estadoDelRouter = (): Arranque['estado'] =>
  router.state.matches.find((match) => match.status !== 'success')?.status ?? 'success'

// Cargar el router antes de hidratar. Si falla, la portada no se puede hidratar: se crea desde
// cero, y el error queda reportado en vez de dejar una portada quieta sin app detrás.
const cargarParaHidratar = async (): Promise<boolean> => {
  try {
    await router.load()
    return true
  } catch (error) {
    reportar(error)
    return false
  }
}

// index.html trae la portada ya escrita; app.html, el resto de las rutas, llega vacío. La
// portada no tiene loaders: con el router cargado, el primer render es igual al del prerender
// y se puede hidratar sin serializar estado, que la CSP no dejaría pasar como script inline.
// Sin top-level await: en la entrada, Rolldown parte el bundle en decenas de chunks.
const arrancar = async (raiz: HTMLElement) => {
  const traePortada = raiz.firstElementChild !== null && (await cargarParaHidratar())

  const modo = modoDeArranque({
    traePortada,
    ruta: router.state.location.pathname,
    estado: estadoDelRouter(),
  })

  // La preferencia guardada, pintada antes del primer render. Y si esa preferencia es «la del
  // sistema», se queda escuchando: cambiar el modo del sistema operativo con la app abierta
  // tiene que verse en el momento, no en la próxima recarga. La portada hidratada no la pinta:
  // ya viene en su propio tema, puesto antes del primer pintado.
  if (modo === 'crear') applyTheme(tema.leer())
  seguirAlSistema()

  const app = <App router={router} queryClient={queryClient} />

  if (modo === 'hidratar') {
    // Lo mismo que hace la hidratación oficial del router (router-core, load-client.js): con
    // `ssr` puesto, la raíz no se envuelve en un Suspense que el HTML del prerender no tiene.
    router.ssr = { manifest: undefined }
    // Una hidratación que no calza (Chrome traduciendo la página, una extensión que toca el
    // DOM) se recupera redibujando: que quede en Sentry, porque en pantalla no se ve.
    hydrateRoot(raiz, app, { onRecoverableError: reportar })
  } else {
    raiz.replaceChildren()
    createRoot(raiz).render(app)
  }
}

// public/antes-de-pintar.js marca el documento cuando manda a quien tuvo sesión al tablero: esa
// página ya viene en camino, y arrancar acá sería pedir la sesión dos veces para nada.
const redirigiendo = document.documentElement.dataset.redirigiendo !== undefined

if (!redirigiendo) {
  // Antes del render: un error durante el primer montaje también tiene que reportarse, y es
  // justo cuando más se rompe.
  iniciarObservabilidad()

  const container = document.getElementById('root')
  if (!container) throw new Error('Falta el contenedor #root en index.html')
  void arrancar(container)
}
