import { HandCoins, Undo2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { FormDialog } from '@/components/form-dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Amount } from '@/features/accounting/amount'
import { useCategories, usePostableAssets } from '@/features/accounting/use-accounting'
import { useBudgetModels } from '@/features/budget/use-budget'
import { formatIsoDate, today } from '@/lib/dates'
import { categoriaSugerida } from './categoria-sugerida'
import { copy } from './copy'
import type { Debt, DebtInstallment } from './types'
import { useDeshacerPago, usePagarCuota, useSaldarCuota } from './use-debts'

type Dialogo = 'pagar' | 'saldar' | 'deshacer' | null

interface Props {
  debt: Debt
  installments: DebtInstallment[]
}

// Los pagos van en orden, así que la sección habla siempre de una sola cuota: la siguiente sin
// pagar. Registrar su pago escribe el gasto; «ya estaba pagada» la salda sin gasto, para lo
// anterior al libro; deshacer devuelve la última.
export const PagosDeLaDeuda = ({ debt, installments }: Props) => {
  const [dialogo, setDialogo] = useState<Dialogo>(null)
  const [fecha, setFecha] = useState(today())
  const [cuenta, setCuenta] = useState('')
  const [categoria, setCategoria] = useState<string | null>(null)

  const cuentas = usePostableAssets()
  const categorias = useCategories()
  const modelos = useBudgetModels()
  const pagar = usePagarCuota(debt.id)
  const saldar = useSaldarCuota(debt.id)
  const deshacer = useDeshacerPago(debt.id)

  const siguiente = installments.find((cuota) => cuota.status !== 'PAID')
  const hayPagos = installments.some((cuota) => cuota.status === 'PAID')

  const cubeta = modelos.data
    ?.find((modelo) => modelo.active)
    ?.buckets.find((bucket) => bucket.id === debt.budgetBucket)
  const sugerida = categoriaSugerida(categorias.data ?? [], cubeta?.accountCodes ?? [])
  // Lo elegido gana; mientras no se elija nada, manda la sugerida, que puede llegar después
  // de abrir el diálogo porque sale de dos consultas.
  const categoriaElegida = categoria ?? sugerida
  const deGasto = (categorias.data ?? []).filter((c) => c.kind === 'EXPENSE' && c.active)

  const cerrar = () => {
    setDialogo(null)
    setFecha(today())
    setCategoria(null)
  }

  const confirmarPago = (evento: FormEvent) => {
    evento.preventDefault()
    pagar.mutate(
      { date: fecha, paymentAccountCode: cuenta, categoryId: categoriaElegida },
      { onSuccess: cerrar },
    )
  }

  const confirmarSaldo = (evento: FormEvent) => {
    evento.preventDefault()
    saldar.mutate(fecha, { onSuccess: cerrar })
  }

  return (
    <section aria-labelledby="pagos" className="space-y-3">
      <h2 id="pagos" className="flex items-center gap-2 text-base font-medium tracking-tight">
        <HandCoins className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        {copy.pagos.title}
      </h2>

      {siguiente ? (
        <p className="text-sm">
          {copy.pagos.next(siguiente.number, formatIsoDate(siguiente.dueDate))}{' '}
          <Amount money={siguiente.payment} emphasis="strong" />
          {siguiente.status === 'OVERDUE' ? (
            <span className="ml-2 font-medium text-warning">{copy.pagos.overdue}</span>
          ) : null}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">{copy.pagos.done}</p>
      )}

      <div className="flex flex-wrap gap-2">
        {siguiente ? (
          <>
            <Button type="button" size="sm" onClick={() => setDialogo('pagar')}>
              {copy.pagos.pay}
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => setDialogo('saldar')}>
              {copy.pagos.settle}
            </Button>
          </>
        ) : null}
        {hayPagos ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => setDialogo('deshacer')}>
            <Undo2 className="size-4" aria-hidden="true" />
            {copy.pagos.undo}
          </Button>
        ) : null}
      </div>

      {siguiente ? (
        <FormDialog
          open={dialogo === 'pagar'}
          onOpenChange={(abierto) => (abierto ? setDialogo('pagar') : cerrar())}
          title={copy.pagos.payTitle(siguiente.number)}
          description={copy.pagos.payHint}
          icon={HandCoins}
        >
          <form onSubmit={confirmarPago} className="grid gap-4">
            <p className="text-sm">
              <Amount money={siguiente.payment} emphasis="strong" />
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="pago-fecha">{copy.pagos.fields.date}</Label>
              <Input
                id="pago-fecha"
                type="date"
                value={fecha}
                required
                onChange={(evento) => setFecha(evento.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pago-cuenta">{copy.pagos.fields.account}</Label>
              <Select value={cuenta} onValueChange={setCuenta}>
                <SelectTrigger id="pago-cuenta" className="w-full">
                  <SelectValue placeholder={copy.pagos.fields.account} />
                </SelectTrigger>
                <SelectContent>
                  {cuentas.map((account) => (
                    <SelectItem key={account.code} value={account.code}>
                      {account.code} · {account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="pago-categoria">{copy.pagos.fields.category}</Label>
              <Select value={categoriaElegida} onValueChange={setCategoria}>
                <SelectTrigger id="pago-categoria" className="w-full">
                  <SelectValue placeholder={copy.pagos.fields.category} />
                </SelectTrigger>
                <SelectContent>
                  {deGasto.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">{copy.pagos.fields.categoryHint}</p>
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={cerrar}>
                {copy.pagos.cancel}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={pagar.isPending || cuenta === '' || categoriaElegida === ''}
              >
                {copy.pagos.confirm}
              </Button>
            </div>
          </form>
        </FormDialog>
      ) : null}

      {siguiente ? (
        <FormDialog
          open={dialogo === 'saldar'}
          onOpenChange={(abierto) => (abierto ? setDialogo('saldar') : cerrar())}
          title={copy.pagos.settleTitle(siguiente.number)}
          description={copy.pagos.settleHint}
        >
          <form onSubmit={confirmarSaldo} className="grid gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="saldo-fecha">{copy.pagos.fields.date}</Label>
              <Input
                id="saldo-fecha"
                type="date"
                value={fecha}
                required
                onChange={(evento) => setFecha(evento.target.value)}
              />
            </div>
            <div className="mt-2 flex justify-end gap-2">
              <Button type="button" variant="ghost" size="sm" onClick={cerrar}>
                {copy.pagos.cancel}
              </Button>
              <Button type="submit" size="sm" disabled={saldar.isPending}>
                {copy.pagos.confirmSettle}
              </Button>
            </div>
          </form>
        </FormDialog>
      ) : null}

      <FormDialog
        open={dialogo === 'deshacer'}
        onOpenChange={(abierto) => (abierto ? setDialogo('deshacer') : cerrar())}
        title={copy.pagos.undoTitle}
        description={copy.pagos.undoHint}
        icon={Undo2}
      >
        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="ghost" size="sm" onClick={cerrar}>
            {copy.pagos.cancel}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={deshacer.isPending}
            onClick={() => deshacer.mutate(undefined, { onSuccess: cerrar })}
          >
            {copy.pagos.confirmUndo}
          </Button>
        </div>
      </FormDialog>
    </section>
  )
}
