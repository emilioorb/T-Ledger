import { QueryClient } from '@tanstack/react-query'
import { createMemoryHistory } from '@tanstack/react-router'
import { renderToString } from 'react-dom/server'
import { App } from '@/app'
import { crearRouter } from '@/router'

// La portada renderizada al compilar. La usa el build de cliente para escribirla adentro del
// #root de index.html, y así el navegador la muestra antes de bajar el JavaScript.
export const renderizarPortada = async (): Promise<string> => {
  const queryClient = new QueryClient()
  const router = crearRouter({
    queryClient,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  return renderToString(<App router={router} queryClient={queryClient} />)
}
