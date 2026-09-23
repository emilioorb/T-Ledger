import type { useRegisterSW as UseRegisterSW } from 'virtual:pwa-register/react'

// Lo que ve `AvisoDeVersion` cuando la portada se renderiza al compilar: no hay service worker
// que registrar ni versión nueva que avisar. Es lo mismo que devuelve el hook real en el primer
// render del navegador, así que la hidratación coincide.
const nada = () => {}

export const useRegisterSW: typeof UseRegisterSW = () => ({
  needRefresh: [false, nada],
  offlineReady: [false, nada],
  updateServiceWorker: async () => {},
})
