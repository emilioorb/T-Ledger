import { useState, type FormEvent } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { parseMoneyInput } from '@/lib/money'
import { copy } from '../copy'
import type { IngresoDeclarado } from '../types'
import { FORM_ID } from './intro'

interface Props {
  hecho: IngresoDeclarado | undefined
  onListo: (pedido: { month: string; amount: { minorUnits: string; currency: 'CRC' } } | null) => void
}

const mesLocal = () => {
  const ahora = new Date()
  return `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, '0')}`
}

export const Ingreso = ({ hecho, onListo }: Props) => {
  const [monto, setMonto] = useState('')
  if (hecho) return <p className="text-sm text-muted-foreground">{copy.cierre.resumen.ingreso}</p>

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    if (!monto.trim()) return onListo(null)
    onListo({ month: mesLocal(), amount: { minorUnits: parseMoneyInput(monto, 'CRC').minorUnits, currency: 'CRC' } })
  }

  return (
    <form id={FORM_ID} onSubmit={enviar} className="grid gap-1">
      <Label htmlFor="ingreso-inicial">{copy.ingreso.label}</Label>
      <Input id="ingreso-inicial" inputMode="decimal" className="num" value={monto} onChange={(e) => setMonto(e.target.value)} />
    </form>
  )
}
