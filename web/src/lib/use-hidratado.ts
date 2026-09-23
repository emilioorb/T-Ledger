import { useSyncExternalStore } from 'react'

const sinCambios = () => () => {}

// `false` en el prerender y mientras React hidrata ese HTML; `true` apenas termina, y desde el
// primer render cuando la página se creó en el navegador. Para lo que solo existe del lado del
// cliente y no puede estar en el HTML sin romper la hidratación.
// https://react.dev/reference/react/useSyncExternalStore#adding-support-for-server-rendering
export const useHidratado = (): boolean =>
  useSyncExternalStore(
    sinCambios,
    () => true,
    () => false,
  )
