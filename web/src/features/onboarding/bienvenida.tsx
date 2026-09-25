import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { Dialog } from '@/components/ui/dialog'
import { ApiError } from '@/lib/api'
import { queryKeys } from '@/lib/query-keys'
import type { NombreDeGesto } from '@/features/shell/bloub'
import { copy } from './copy'
import { ENTRADA } from './entrada'
import { Marco } from './marco'
import { NimboDice } from './nimbo-dice'
import { PASOS, type Paso } from './orden'
import { Pie, type Destino } from './pie'
import { Bancos } from './pasos/bancos'
import { Categorias } from './pasos/categorias'
import { Cierre } from './pasos/cierre'
import { Ingreso } from './pasos/ingreso'
import { Monedas, type EleccionDeMonedas } from './pasos/monedas'
import { Saldos } from './pasos/saldos'
import type { BancoCreado, CategoriaCreada, IngresoDeclarado, Moneda, OnboardingStatus, SaldosCargados } from './types'
import { useEmpezarBienvenida, useOnboardingStatus, usePasoDeBienvenida } from './use-onboarding'

const GESTO: Record<Paso, NombreDeGesto> = {
  intro: 'contento',
  monedas: 'neutro',
  bancos: 'neutro',
  saldos: 'desconfiado',
  categorias: 'neutro',
  ingreso: 'neutro',
  cierre: 'orgulloso',
}

interface Hechos {
  bancos?: BancoCreado[]
  saldos?: SaldosCargados
  categorias?: CategoriaCreada[]
  ingreso?: IngresoDeclarado
}

// Las cuatro mutaciones de los pasos con formulario, agrupadas: `Bienvenida` ya tenía demasiadas
// líneas para el lint de funciones chicas.
const usePasos = (bookId: string) => ({
  bancos: usePasoDeBienvenida<object, BancoCreado[]>(bookId, 'banks'),
  saldos: usePasoDeBienvenida<object, SaldosCargados>(bookId, 'opening-balances'),
  categorias: usePasoDeBienvenida<object, CategoriaCreada[]>(bookId, 'categories'),
  ingreso: usePasoDeBienvenida<object, IngresoDeclarado>(bookId, 'income'),
})

const hechoDe = (paso: Paso, hechos: Hechos): boolean =>
  (paso === 'bancos' && hechos.bancos !== undefined) ||
  (paso === 'saldos' && hechos.saldos !== undefined) ||
  (paso === 'categorias' && hechos.categorias !== undefined) ||
  (paso === 'ingreso' && hechos.ingreso !== undefined)

export default function Bienvenida() {
  const estado = useOnboardingStatus()
  const empezar = useEmpezarBienvenida()
  const queryClient = useQueryClient()
  const [abierta, setAbierta] = useState(false)
  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const [paso, setPaso] = useState<Paso>('intro')
  const [monedas, setMonedas] = useState<EleccionDeMonedas>('CRC')
  const [hechos, setHechos] = useState<Hechos>({})
  const [error, setError] = useState<string | null>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  const yaAbrio = useRef(false)
  const navegar = useNavigate()

  const bookId = estado.data?.bookId ?? ''
  const { bancos, saldos, categorias, ingreso } = usePasos(bookId)

  // Se abre una vez y se marca en el acto, con una ref y no con `abierta`: si dependiera de ese
  // estado, cerrar el modal (que lo vuelve a `false`) haría que el efecto lo abriera de nuevo.
  useEffect(() => {
    if (!estado.data?.pending || yaAbrio.current) return
    yaAbrio.current = true
    const pasos = estado.data.steps as Record<string, unknown>
    setHechos({
      bancos: pasos.banks as BancoCreado[] | undefined,
      saldos: pasos['opening-balances'] as SaldosCargados | undefined,
      categorias: pasos.categories as CategoriaCreada[] | undefined,
      ingreso: pasos.income as IngresoDeclarado | undefined,
    })
    setAbierta(true)
    empezar.mutate(estado.data.bookId)
  }, [estado.data, empezar])

  useEffect(() => titulo.current?.focus(), [paso])

  const indice = PASOS.indexOf(paso)
  const avanzar = () => {
    setError(null)
    setPaso(PASOS[Math.min(indice + 1, PASOS.length - 1)] ?? paso)
  }
  const retroceder = () => {
    setError(null)
    setPaso(PASOS[Math.max(indice - 1, 0)] ?? paso)
  }

  const mandar = async <R,>(mutacion: { mutateAsync: (e: object) => Promise<R> }, pedido: object | null, guardar: (r: R) => void) => {
    if (pedido === null) return avanzar()
    try {
      guardar(await mutacion.mutateAsync(pedido))
      avanzar()
    } catch (causa) {
      setError(causa instanceof ApiError ? causa.message : copy.errorDeRed)
    }
  }

  const listaDeMonedas: Moneda[] = monedas === 'CRC' ? ['CRC'] : ['CRC', 'USD']
  const ocupado = bancos.isPending || saldos.isPending || categorias.isPending || ingreso.isPending
  const conFormulario = ['bancos', 'saldos', 'categorias', 'ingreso'].includes(paso) && !hechoDe(paso, hechos)

  // Marca el estado como no pendiente además de cerrar: `BienvenidaSiHaceFalta` lee esa misma
  // consulta, así que deja de montar el modal y no hay forma de que reaparezca.
  const cerrar = () => {
    setAbierta(false)
    queryClient.setQueryData<OnboardingStatus>(queryKeys.onboarding.status(), (actual) =>
      actual ? { ...actual, pending: false } : actual,
    )
  }
  const ir = (to: Destino) => {
    cerrar()
    void navegar({ to })
  }

  return (
    <>
      <Dialog
        open={abierta}
        onOpenChange={(abrir) => {
          if (!abrir) setConfirmarCierre(true)
        }}
      >
        <Marco
          actual={indice + 1}
          total={PASOS.length}
          titulo={copy[paso].title}
          tituloRef={titulo}
          describedBy={`dice-${paso}`}
          onFuera={() => setConfirmarCierre(true)}
        >
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
            <NimboDice gesto={GESTO[paso]} id={`dice-${paso}`}>
              {copy[paso].nimbo}
            </NimboDice>
            <div key={paso} className={ENTRADA}>
              {paso === 'monedas' ? <Monedas valor={monedas} onCambio={setMonedas} /> : null}
              {paso === 'bancos' ? (
                <Bancos hecho={hechos.bancos} monedas={listaDeMonedas} onListo={(p) => void mandar(bancos, p, (r) => setHechos({ ...hechos, bancos: r }))} />
              ) : null}
              {paso === 'saldos' ? (
                <Saldos
                  hecho={hechos.saldos}
                  monedas={listaDeMonedas}
                  bancos={hechos.bancos ?? []}
                  onListo={(p) => void mandar(saldos, p, (r) => setHechos({ ...hechos, saldos: r }))}
                />
              ) : null}
              {paso === 'categorias' ? (
                <Categorias hecho={hechos.categorias} onListo={(p) => void mandar(categorias, p, (r) => setHechos({ ...hechos, categorias: r }))} />
              ) : null}
              {paso === 'ingreso' ? (
                <Ingreso hecho={hechos.ingreso} onListo={(p) => void mandar(ingreso, p, (r) => setHechos({ ...hechos, ingreso: r }))} />
              ) : null}
              {paso === 'cierre' ? (
                <Cierre
                  resumen={{
                    bancos: hechos.bancos?.length ?? 0,
                    categorias: hechos.categorias?.length ?? 0,
                    saldos: (hechos.saldos?.entries.length ?? 0) > 0,
                    ingreso: hechos.ingreso !== undefined,
                  }}
                />
              ) : null}
              {error ? (
                <p role="alert" className="mt-3 text-sm text-destructive">
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          <Pie
            paso={paso}
            conFormulario={conFormulario}
            ocupado={ocupado}
            conError={error !== null}
            onAvanzar={avanzar}
            onRetroceder={retroceder}
            onIr={ir}
          />
        </Marco>
      </Dialog>

      <AlertDialog open={confirmarCierre} onOpenChange={setConfirmarCierre}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{copy.cerrar.title}</AlertDialogTitle>
            <AlertDialogDescription>{copy.cerrar.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{copy.cerrar.seguir}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setConfirmarCierre(false)
                cerrar()
              }}
            >
              {copy.cerrar.confirmar}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
