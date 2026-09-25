import { useEffect, useRef, useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
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
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ApiError } from '@/lib/api'
import type { NombreDeGesto } from '@/features/shell/bloub'
import { copy } from './copy'
import { NimboDice } from './nimbo-dice'
import { Bancos } from './pasos/bancos'
import { Categorias } from './pasos/categorias'
import { Cierre } from './pasos/cierre'
import { FORM_ID } from './pasos/intro'
import { Ingreso } from './pasos/ingreso'
import { Monedas, type EleccionDeMonedas } from './pasos/monedas'
import { Saldos } from './pasos/saldos'
import type { BancoCreado, CategoriaCreada, IngresoDeclarado, Moneda, SaldosCargados } from './types'
import { useEmpezarBienvenida, useOnboardingStatus, usePasoDeBienvenida } from './use-onboarding'

const PASOS = ['intro', 'monedas', 'bancos', 'saldos', 'categorias', 'ingreso', 'cierre'] as const
type Paso = (typeof PASOS)[number]

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
  const [abierta, setAbierta] = useState(false)
  const [confirmarCierre, setConfirmarCierre] = useState(false)
  const [paso, setPaso] = useState<Paso>('intro')
  const [monedas, setMonedas] = useState<EleccionDeMonedas>('CRC')
  const [hechos, setHechos] = useState<Hechos>({})
  const [error, setError] = useState<string | null>(null)
  const titulo = useRef<HTMLHeadingElement>(null)
  const navegar = useNavigate()

  const bookId = estado.data?.bookId ?? ''
  const { bancos, saldos, categorias, ingreso } = usePasos(bookId)

  // Se abre una vez y se marca en el acto: aunque se cierre la pestaña a mitad, no vuelve.
  useEffect(() => {
    if (!estado.data?.pending || abierta) return
    const pasos = estado.data.steps as Record<string, unknown>
    setHechos({
      bancos: pasos.banks as BancoCreado[] | undefined,
      saldos: pasos['opening-balances'] as SaldosCargados | undefined,
      categorias: pasos.categories as CategoriaCreada[] | undefined,
      ingreso: pasos.income as IngresoDeclarado | undefined,
    })
    setAbierta(true)
    empezar.mutate(estado.data.bookId)
  }, [estado.data, abierta, empezar])

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
      setError(causa instanceof ApiError ? causa.message : copy.botones.reintentar)
    }
  }

  const listaDeMonedas: Moneda[] = monedas === 'CRC' ? ['CRC'] : ['CRC', 'USD']
  const ocupado = bancos.isPending || saldos.isPending || categorias.isPending || ingreso.isPending
  const conFormulario = ['bancos', 'saldos', 'categorias', 'ingreso'].includes(paso) && !hechoDe(paso, hechos)

  const cerrar = () => setAbierta(false)
  const ir = (to: '/guia' | '/presupuesto/modelos') => {
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
        <DialogContent
          aria-describedby={`dice-${paso}`}
          className="max-sm:h-svh max-sm:max-w-none max-sm:rounded-none sm:max-w-xl"
        >
          <DialogHeader>
            <p className="text-xs text-muted-foreground">{copy.pasoDe(indice + 1, PASOS.length)}</p>
            <DialogTitle ref={titulo} tabIndex={-1} className="outline-none">
              {copy[paso].title}
            </DialogTitle>
          </DialogHeader>

          <NimboDice gesto={GESTO[paso]} id={`dice-${paso}`}>
            {copy[paso].nimbo}
          </NimboDice>

          <div className="min-h-0 flex-1 overflow-y-auto">
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

          <DialogFooter className="gap-2">
            {paso === 'intro' ? (
              <Button onClick={avanzar}>{copy.botones.empezar}</Button>
            ) : paso === 'cierre' ? (
              <>
                <Button variant="outline" onClick={() => ir('/presupuesto/modelos')}>
                  {copy.cierre.modelos}
                </Button>
                <Button onClick={() => ir('/guia')}>{copy.cierre.guia}</Button>
              </>
            ) : (
              <>
                <Button variant="ghost" onClick={retroceder} disabled={ocupado}>
                  {copy.botones.atras}
                </Button>
                {conFormulario ? (
                  <Button variant="outline" onClick={avanzar} disabled={ocupado}>
                    {copy.botones.saltear}
                  </Button>
                ) : null}
                {conFormulario ? (
                  <Button type="submit" form={FORM_ID} disabled={ocupado}>
                    {error ? copy.botones.reintentar : copy.botones.siguiente}
                  </Button>
                ) : (
                  <Button onClick={avanzar}>{copy.botones.siguiente}</Button>
                )}
              </>
            )}
          </DialogFooter>
        </DialogContent>
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
