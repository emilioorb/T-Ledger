import { useState, type FormEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseMoneyInput } from '@/lib/money'
import { copy } from '../copy'
import type { BancoCreado, Moneda, SaldosCargados } from '../types'
import { FORM_ID } from './intro'

interface Props {
  hecho: SaldosCargados | undefined
  onListo: (pedido: { date: string; balances: { accountCode: string; amount: string }[] } | null) => void
  monedas: Moneda[]
  bancos: BancoCreado[]
}

const CAJA: Record<Moneda, string> = { CRC: '1101', USD: '1102' }

// La fecha del teléfono y no la del servidor: allá es UTC, y después de las 18:00 en Costa Rica
// «hoy» sería mañana.
const hoyLocal = () => {
  const ahora = new Date()
  const dos = (n: number) => String(n).padStart(2, '0')
  return `${ahora.getFullYear()}-${dos(ahora.getMonth() + 1)}-${dos(ahora.getDate())}`
}

export const Saldos = ({ hecho, onListo, monedas, bancos }: Props) => {
  const [montos, setMontos] = useState<Record<string, string>>({})

  if (hecho) return <p className="text-sm text-muted-foreground">{copy.hecho}</p>

  const filas = [
    ...monedas.map((currency) => ({ accountCode: CAJA[currency], label: copy.saldos.caja[currency], currency, admiteNegativo: false })),
    ...bancos
      .filter((banco) => monedas.includes(banco.currency))
      .map((banco) => ({ accountCode: banco.accountCode, label: banco.name, currency: banco.currency, admiteNegativo: true })),
  ]

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    const balances = filas.flatMap(({ accountCode, currency }) => {
      const texto = montos[accountCode]?.trim()
      if (!texto) return []
      return [{ accountCode, amount: parseMoneyInput(texto, currency).minorUnits }]
    })
    onListo(balances.length > 0 ? { date: hoyLocal(), balances } : null)
  }

  return (
    <form id={FORM_ID} onSubmit={enviar} className="space-y-3">
      {bancos.length === 0 ? <p className="text-sm text-muted-foreground">{copy.saldos.sinBancos}</p> : null}
      {filas.map(({ accountCode, label, admiteNegativo }) => (
        <div key={accountCode} className="grid gap-1">
          <Label htmlFor={`saldo-${accountCode}`}>{label}</Label>
          <Input
            id={`saldo-${accountCode}`}
            inputMode={admiteNegativo ? 'text' : 'decimal'}
            className="num"
            value={montos[accountCode] ?? ''}
            onChange={(evento) => setMontos({ ...montos, [accountCode]: evento.target.value })}
          />
        </div>
      ))}
    </form>
  )
}
