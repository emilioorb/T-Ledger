import { useEffect, useState } from 'react'

// Lo que se escribe se ve al instante; lo que se consulta espera a que la mano pare. Sin
// esto, buscar «supermercado» son trece consultas al servidor y doce listas que nadie leyó.
export const useDebounced = <T,>(value: T, delay = 300): T => {
  const [settled, setSettled] = useState(value)

  useEffect(() => {
    const timer = setTimeout(() => setSettled(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return settled
}
