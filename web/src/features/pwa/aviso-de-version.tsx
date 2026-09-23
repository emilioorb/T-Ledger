import { useEffect } from 'react'
import { toast } from 'sonner'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { copy } from './copy'

const ID_DEL_AVISO = 'version-nueva'

// Registra el service worker y, cuando un deploy deja una versión nueva esperando, lo dice y
// espera a que la persona toque «Actualizar»: recargar sola haría perder lo que esté a medio
// escribir. El aviso no se cierra con el tiempo, así no pasa inadvertido.
export const AvisoDeVersion = () => {
  const {
    needRefresh: [hayVersionNueva],
    updateServiceWorker,
  } = useRegisterSW()

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
