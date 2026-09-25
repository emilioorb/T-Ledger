import { useState, type FormEvent } from 'react'
import { Label } from '@/components/ui/label'
import { parseMoneyInput } from '@/lib/money'
import { copy } from '../copy'
import type { BancoCreado, Moneda, SaldosCargados } from '../types'
import { FORM_ID } from './intro'
import { Monto } from './monto'

interface Props {
  hecho: SaldosCargados | undefined
  onListo: (pedido: { date: string; balances: { accountCode: string; amount: string }[] } | null) => void
  monedas: Moneda[]
  bancos: BancoCreado[]
}

// Mismos códigos que CAJAS en api/src/modules/accounting/infrastructure/cajas.ts.
const CAJA: Record<Moneda, string> = { CRC: '1101', USD: '1102' }

// La fecha del teléfono y no la del servidor: allá es UTC, y después de las 18:00 en Costa Rica
// «hoy» sería mañana.
const hoyLocal = () => {
  const ahora = new Date()
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`
}

const omitir = (errores: Record<string, string>, accountCode: string): Record<string, string> => {
  const copia = { ...errores }
  delete copia[accountCode]
  return copia
}

export const Saldos = ({ hecho, onListo, monedas, bancos }: Props) => {
  const [montos, setMontos] = useState<Record<string, string>>({})
  const [errores, setErrores] = useState<Record<string, string>>({})

  if (hecho) return <p className="text-sm text-muted-foreground">{copy.hecho}</p>

  // admiteNegativo decide las dos cosas a la vez, para que no se desalineen: el teclado que se
  // ofrece (inputMode, más abajo) y si el signo «-» se acepta al enviar (en enviar()). El
  // efectivo nunca es negativo; un banco sí, porque puede estar sobregirado.
  const filas = [
    ...monedas.map((currency) => ({ accountCode: CAJA[currency], label: copy.saldos.caja[currency], currency, admiteNegativo: false })),
    ...bancos
      .filter((banco) => monedas.includes(banco.currency))
      .map((banco) => ({ accountCode: banco.accountCode, label: banco.name, currency: banco.currency, admiteNegativo: true })),
  ]

  const cambiarMonto = (accountCode: string, valor: string) => {
    setMontos({ ...montos, [accountCode]: valor })
    setErrores((actuales) => (accountCode in actuales ? omitir(actuales, accountCode) : actuales))
  }

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    const siguientesErrores: Record<string, string> = {}
    const balances: { accountCode: string; amount: string }[] = []
    for (const { accountCode, currency, admiteNegativo } of filas) {
      const texto = montos[accountCode]?.trim()
      if (!texto) continue
      let minorUnits: string
      // El texto tipeado nunca llega al mensaje de error ni a lo que se manda: parseMoneyInput
      // lo mete en el RangeError, y ese RangeError no sale de acá.
      try {
        minorUnits = parseMoneyInput(texto, currency).minorUnits
      } catch {
        siguientesErrores[accountCode] = copy.montoIlegible
        continue
      }
      // El mismo admiteNegativo del inputMode: si no lo admite, el pedido no se arma con ese
      // monto y el paso no llega a mandarlo.
      if (!admiteNegativo && minorUnits.startsWith('-')) {
        siguientesErrores[accountCode] = copy.saldos.cajaNegativa
        continue
      }
      balances.push({ accountCode, amount: minorUnits })
    }
    if (Object.keys(siguientesErrores).length > 0) {
      setErrores(siguientesErrores)
      return
    }
    onListo(balances.length > 0 ? { date: hoyLocal(), balances } : null)
  }

  return (
    <form id={FORM_ID} onSubmit={enviar} className="space-y-3">
      {bancos.length === 0 ? <p className="text-sm text-muted-foreground">{copy.saldos.sinBancos}</p> : null}
      {filas.map(({ accountCode, label, currency, admiteNegativo }) => {
        const error = errores[accountCode]
        return (
          <div key={accountCode} className="grid gap-1 sm:grid-cols-2 sm:items-center">
            <Label htmlFor={`saldo-${accountCode}`}>{label}</Label>
            <Monto
              id={`saldo-${accountCode}`}
              moneda={currency}
              inputMode={admiteNegativo ? 'text' : 'decimal'}
              value={montos[accountCode] ?? ''}
              aria-invalid={error !== undefined}
              aria-describedby={error ? `error-${accountCode}` : undefined}
              onChange={(evento) => cambiarMonto(accountCode, evento.target.value)}
            />
            {error ? (
              <p id={`error-${accountCode}`} role="alert" className="text-sm text-destructive sm:col-span-2">
                {error}
              </p>
            ) : null}
          </div>
        )
      })}
    </form>
  )
}
