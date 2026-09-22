import { useEffect, useRef } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { DESTINATIONS } from './destinations'
import { usePrimaryActionValue } from './primary-action'

const PREFIX = 'g'
// Si la segunda tecla no llega en un segundo y medio, la primera no era un prefijo.
const PREFIX_TIMEOUT = 1500

// Escribir «g» en un campo de texto no es pedir ir a ninguna parte.
const isTyping = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  return ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

// Con un diálogo abierto, el teclado le pertenece al diálogo: navegar por detrás dejaría
// al usuario en otra pantalla con el diálogo todavía encima.
const hasOpenDialog = (): boolean =>
  document.querySelector(
    '[role="dialog"][data-state="open"], [role="alertdialog"][data-state="open"]',
  ) !== null

// `ayudaAbierta` no se deduce del DOM aunque la hoja esté ahí: el diálogo abierto puede ser
// cualquiera, y «?» solo tiene que cerrar el de la ayuda.
export const useShortcuts = (ayudaAbierta: boolean, alternarAyuda: () => void): void => {
  const navigate = useNavigate()
  const primary = usePrimaryActionValue()
  const prefixedAt = useRef<number | null>(null)

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return
      if (isTyping(event.target)) return

      // La misma tecla que la abrió la cierra. Va antes de la guarda de diálogos porque la
      // hoja de ayuda es uno: si se respetara la guarda, «?» con la ayuda abierta no haría
      // nada y habría que ir a buscar la Escape o la equis.
      if (event.key === '?' && ayudaAbierta) {
        event.preventDefault()
        alternarAyuda()
        return
      }

      if (hasOpenDialog()) return

      const pending =
        prefixedAt.current !== null && Date.now() - prefixedAt.current < PREFIX_TIMEOUT
      prefixedAt.current = null

      if (pending) {
        const destination = DESTINATIONS.find((candidate) => candidate.key === event.key)
        if (destination) {
          event.preventDefault()
          void navigate({ to: destination.to })
        }
        return
      }

      if (event.key === PREFIX) {
        prefixedAt.current = Date.now()
        return
      }

      if (event.key === '?') {
        event.preventDefault()
        alternarAyuda()
        return
      }

      if (event.key === 'n' && primary) {
        event.preventDefault()
        primary.run()
      }
    }

    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [alternarAyuda, ayudaAbierta, navigate, primary])
}
