import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react'

export interface PrimaryAction {
  label: string
  run: () => void
}

// Dos contextos y no uno: el valor cambia en cada pantalla, el setter nunca. Juntos harían
// que el efecto que registra la acción se dispare contra sí mismo en bucle.
const ActionContext = createContext<PrimaryAction | null>(null)
const SetActionContext = createContext<Dispatch<SetStateAction<PrimaryAction | null>>>(() => {})

export const PrimaryActionProvider = ({ children }: { children: ReactNode }) => {
  const [action, setAction] = useState<PrimaryAction | null>(null)

  return (
    <SetActionContext.Provider value={setAction}>
      <ActionContext.Provider value={action}>{children}</ActionContext.Provider>
    </SetActionContext.Provider>
  )
}

export const usePrimaryActionValue = (): PrimaryAction | null => useContext(ActionContext)

// La pantalla declara cuál es su acción principal; el atajo la ejecuta sin saber cuál es.
export const usePrimaryAction = (label: string, run: () => void): void => {
  const setAction = useContext(SetActionContext)
  const latest = useRef(run)
  latest.current = run

  useEffect(() => {
    setAction({ label, run: () => latest.current() })
    return () => setAction(null)
  }, [label, setAction])
}
