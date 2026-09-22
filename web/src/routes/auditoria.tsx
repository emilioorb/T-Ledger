import { createFileRoute } from '@tanstack/react-router'
import { Fragment, useMemo, useState } from 'react'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Pager } from '@/components/pager'
import { SearchInput } from '@/components/search-input'
import { SortButton } from '@/components/sort-button'
import { TableFrame } from '@/components/table-frame'
import { TableSkeleton } from '@/components/table-skeleton'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { copy } from '@/features/auditoria/copy'
import { DetalleCompleto, DetalleEnLinea, QuePaso } from '@/features/auditoria/entrada'
import type { EntidadAuditada, EntradaDeRastro } from '@/features/auditoria/types'
import {
  PAGE_SIZE,
  useRastro,
  type ColumnaDeRastro,
  type OrdenDeRastro,
} from '@/features/auditoria/use-auditoria'
import { useCategories } from '@/features/accounting/use-accounting'
import { useDebounced } from '@/lib/use-debounced'
import { cn } from '@/lib/utils'
import { ChevronDownIcon } from 'lucide-react'

const ENTIDADES = Object.keys(copy.audit.entities) as EntidadAuditada[]

// La hora importa tanto como el día: dos cambios del mismo martes se distinguen por eso, y es
// justo cuando alguien viene a mirar quién tocó qué. En veinticuatro horas, que se comparan de
// un vistazo y no gastan media columna en «a. m.».
const cuando = (iso: string) => {
  const fecha = new Date(iso)
  const dia = fecha.toLocaleDateString('es-CR', { day: '2-digit', month: '2-digit' })
  const hora = fecha.toLocaleTimeString('es-CR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  return `${dia} ${hora}`
}

// Sin autor es una cuenta que ya no existe: sus entradas no se borran con ella, porque serían
// agujeros en la historia justo donde alguien querría mirar. Se dice, en vez de dejar el hueco:
// un cambio sin responsable se lee como un error de la aplicación.
const Quien = ({ entrada }: { entrada: EntradaDeRastro }) => (
  <span className={cn(!entrada.autor && 'text-muted-foreground italic')}>
    {entrada.autor?.nombre ?? copy.audit.deletedUser}
  </span>
)

const AuditoriaScreen = () => {
  const [entidad, setEntidad] = useState<EntidadAuditada | null>(null)
  const [busqueda, setBusqueda] = useState('')
  // El servidor ordena y el servidor busca: las entradas vienen paginadas, y hacerlo sobre las
  // veinticinco visibles diría «ordenado por quién» mientras miente sobre las otras.
  const [orden, setOrden] = useState<OrdenDeRastro>({ key: 'cuando', direction: 'desc' })
  const [page, setPage] = useState(1)
  // Una sola fila abierta por vez: con varias, la tabla vuelve a la escalera que esto evita.
  const [abierta, setAbierta] = useState<string | null>(null)
  const busquedaFirme = useDebounced(busqueda.trim())
  const { data, isPending, isError, refetch } = useRastro({
    entidad,
    busqueda: busquedaFirme,
    orden,
    page,
  })
  // El catálogo de categorías, para que el rastro muestre «Mercado» donde guardó un
  // identificador. Ya está en la caché si la persona pasó por movimientos, así que casi nunca
  // cuesta una consulta.
  const { data: categorias } = useCategories()
  const nombres = useMemo(
    () => new Map((categorias ?? []).map((categoria) => [categoria.id, categoria.name])),
    [categorias],
  )

  // Un segundo clic sobre la misma columna invierte; uno sobre otra empieza por lo más
  // reciente, que es como se lee un registro.
  const ordenarPor = (key: ColumnaDeRastro) => {
    setOrden((actual) =>
      actual.key === key
        ? { key, direction: actual.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'desc' },
    )
    setPage(1)
  }

  const buscar = (texto: string) => {
    setBusqueda(texto)
    setPage(1)
  }

  const elegir = (siguiente: EntidadAuditada | null) => {
    setEntidad(siguiente)
    // Volver a la primera página al cambiar el filtro: quedarse en la página cuatro de otra
    // cosa deja la pantalla vacía sin explicar por qué.
    setPage(1)
  }

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{copy.audit.title}</h1>
        <p className="mt-1 max-w-[70ch] text-sm text-balance text-muted-foreground">
          {copy.audit.description}
        </p>
      </header>

      <SearchInput
        value={busqueda}
        onChange={buscar}
        label={copy.audit.search.label}
        placeholder={copy.audit.search.placeholder}
      />

      {/* Botones y no un desplegable: son ocho opciones, se ven todas de una y cambiar de una
          a otra es un clic en vez de tres. */}
      <div className="flex flex-wrap gap-1.5" role="group" aria-label={copy.audit.filterEntity}>
        <Button
          size="sm"
          variant={entidad === null ? 'secondary' : 'ghost'}
          onClick={() => elegir(null)}
        >
          {copy.audit.allEntities}
        </Button>
        {ENTIDADES.map((nombre) => (
          <Button
            key={nombre}
            size="sm"
            variant={entidad === nombre ? 'secondary' : 'ghost'}
            onClick={() => elegir(nombre)}
          >
            {copy.audit.entities[nombre]}
          </Button>
        ))}
      </div>

      {isError ? (
        <ErrorState
          title={copy.audit.error.title}
          description={copy.audit.error.description}
          retryLabel={copy.audit.error.retry}
          onRetry={() => void refetch()}
        />
      ) : null}

      {isPending ? <TableSkeleton rows={8} label={copy.audit.loading} /> : null}

      {/* Sin resultados no es lo mismo que sin registro: decirle a alguien que todavía no hay
          nada anotado, cuando lo que pasa es que su búsqueda no encontró, es informarle algo
          falso sobre su propio libro. */}
      {data && data.data.length === 0 ? (
        busquedaFirme || entidad ? (
          <EmptyState
            title={copy.audit.noResults.title}
            description={copy.audit.noResults.description}
          />
        ) : (
          <EmptyState title={copy.audit.empty.title} description={copy.audit.empty.description} />
        )
      ) : null}

      {data && data.data.length > 0 ? (
        <div className="space-y-4">
          <TableFrame className="hidden @3xl:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">
                    <SortButton
                      label={copy.audit.columns.when}
                      active={orden.key === 'cuando'}
                      direction={orden.direction}
                      onClick={() => ordenarPor('cuando')}
                    />
                  </TableHead>
                  <TableHead>
                    <SortButton
                      label={copy.audit.columns.who}
                      active={orden.key === 'quien'}
                      direction={orden.direction}
                      onClick={() => ordenarPor('quien')}
                    />
                  </TableHead>
                  <TableHead className="whitespace-nowrap">
                    <SortButton
                      label={copy.audit.columns.what}
                      active={orden.key === 'que'}
                      direction={orden.direction}
                      onClick={() => ordenarPor('que')}
                    />
                  </TableHead>
                  <TableHead className="w-full">{copy.audit.columns.changes}</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.data.map((entrada) => {
                  const estaAbierta = abierta === entrada.id

                  return (
                    <Fragment key={entrada.id}>
                      {/* Altura fija y no la que resulte del contenido: la fila sin cambios no
                          lleva botón para abrirla y quedaba ocho píxeles más baja que el
                          resto. Una tabla con renglones desparejos se lee como una escalera y
                          el ojo pierde la columna de la izquierda. */}
                      <TableRow className="h-12">
                        <TableCell className="num text-xs whitespace-nowrap text-muted-foreground">
                          {cuando(entrada.createdAt)}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <Quien entrada={entrada} />
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          <QuePaso entrada={entrada} />
                        </TableCell>
                        {/* `w-0` con la columna al 100 %: la celda no empuja la tabla, así que
                            el texto largo se corta en vez de estirar el renglón. */}
                        <TableCell className="w-0 max-w-0">
                          <DetalleEnLinea cambios={entrada.changes} nombres={nombres} />
                        </TableCell>
                        <TableCell className="w-0">
                          {entrada.changes.length > 0 ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              aria-expanded={estaAbierta}
                              aria-label={estaAbierta ? copy.audit.collapse : copy.audit.expand}
                              onClick={() => setAbierta(estaAbierta ? null : entrada.id)}
                            >
                              <ChevronDownIcon
                                aria-hidden="true"
                                className={cn(
                                  'transition-transform duration-(--duration-dropdown) ease-(--ease-out-quart)',
                                  estaAbierta && 'rotate-180',
                                )}
                              />
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>

                      {estaAbierta ? (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-muted/40 pt-0">
                            <DetalleCompleto cambios={entrada.changes} nombres={nombres} />
                          </TableCell>
                        </TableRow>
                      ) : null}
                    </Fragment>
                  )
                })}
              </TableBody>
            </Table>
          </TableFrame>

          {/* Abajo de `@3xl` la tabla no entra: cuatro columnas en un teléfono dejan el detalle
              en una tira de dos caracteres. Cada entrada pasa a ser una ficha con la misma
              información, en el orden en que se lee. */}
          <TableFrame className="@3xl:hidden">
            <ul className="divide-y divide-border">
              {data.data.map((entrada) => (
                <li key={entrada.id} className="px-3 py-2.5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-sm">
                      <Quien entrada={entrada} /> <QuePaso entrada={entrada} />
                    </span>
                    <span className="num shrink-0 text-xs text-muted-foreground">
                      {cuando(entrada.createdAt)}
                    </span>
                  </div>
                  <div className="mt-1">
                    <DetalleCompleto cambios={entrada.changes} nombres={nombres} />
                  </div>
                </li>
              ))}
            </ul>
          </TableFrame>

          <Pager
            page={page}
            pageSize={PAGE_SIZE}
            totalItems={data.pagination.totalItems}
            labels={copy.audit.pager}
            onPage={setPage}
          />
        </div>
      ) : null}
    </div>
  )
}

export const Route = createFileRoute('/auditoria')({ component: AuditoriaScreen })
