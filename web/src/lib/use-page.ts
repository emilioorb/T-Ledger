import { useEffect, useState } from 'react'

// Cambiar un filtro cambia el conjunto: quedarse en la página siete del conjunto anterior
// mostraría un vacío que no existe. La clave de reinicio es la firma de los filtros.
export const usePage = (resetKey: string): [number, (page: number) => void] => {
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [resetKey])

  return [page, setPage]
}
