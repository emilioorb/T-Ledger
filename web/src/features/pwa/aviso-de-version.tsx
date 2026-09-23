import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { copy } from './copy'

const ID_DEL_AVISO = 'version-nueva'
const CADA_HORA = 60 * 60 * 1000

// Una SPA no vuelve a navegar, así que el navegador casi nunca busca un service worker nuevo
// por su cuenta: la app instalada podía pasar días sin enterarse de un deploy, incluido uno
// que corrige algo de seguridad. Se busca cada hora y cada vez que la app vuelve a primer
// plano, que en el teléfono es lo que más pasa.
// Patrón de https://vite-pwa-org.netlify.app/guide/periodic-sw-updates
const buscarVersionNueva = (registro: ServiceWorkerRegistration) => {
  if (registro.installing || !navigator.onLine) return
  registro.update().catch(() => {
    // Sin respuesta ahora; la próxima vuelta lo intenta de nuevo.
  })
}

const vigilarVersiones = (_url: string, registro: ServiceWorkerRegistration | undefined) => {
  if (!registro) return
  setInterval(() => buscarVersionNueva(registro), CADA_HORA)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') buscarVersionNueva(registro)
  })
}

// Registra el service worker y, cuando un deploy deja una versión nueva esperando, lo dice y
// espera a que la persona toque «Actualizar»: recargar sola haría perder lo que esté a medio
// escribir. El aviso no se cierra con el tiempo, así no pasa inadvertido.
export const AvisoDeVersion = () => {
  const {
    needRefresh: [hayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW({ onRegisteredSW: vigilarVersiones })

  useEffect(() => {
    if (!hayVersionNueva) return
    toast(copy.versionNueva, {
      id: ID_DEL_AVISO,
      duration: Infinity,
      action: { label: copy.actualizar, onClick: () => void updateServiceWorker(true) },
    })
  }, [hayVersionNueva, updateServiceWorker])

  return null
}
