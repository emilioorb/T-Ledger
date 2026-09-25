import { useState, type FormEvent } from 'react'
import { Label } from '@/components/ui/label'
import { parseMoneyInput } from '@/lib/money'
import { copy } from '../copy'
import type { IngresoDeclarado } from '../types'
import { FORM_ID } from './intro'
import { Monto } from './monto'

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
  const [error, setError] = useState<string | null>(null)
  if (hecho) return <p className="text-sm text-muted-foreground">{copy.cierre.resumen.ingreso}</p>

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    if (!monto.trim()) return onListo(null)
    // El texto tipeado nunca llega al mensaje de error ni a lo que se manda: parseMoneyInput lo
    // mete en el RangeError, y ese RangeError no sale de acá.
    try {
      onListo({ month: mesLocal(), amount: { minorUnits: parseMoneyInput(monto, 'CRC').minorUnits, currency: 'CRC' } })
    } catch {
      setError(copy.montoIlegible)
    }
  }

  return (
    <form id={FORM_ID} onSubmit={enviar} className="grid gap-1 sm:grid-cols-2 sm:items-center">
      <Label htmlFor="ingreso-inicial">{copy.ingreso.label}</Label>
      <Monto
        id="ingreso-inicial"
        moneda="CRC"
        inputMode="decimal"
        value={monto}
        aria-invalid={error !== null}
        aria-describedby={error ? 'error-ingreso-inicial' : undefined}
        onChange={(e) => {
          setMonto(e.target.value)
          setError(null)
        }}
      />
      {error ? (
        <p id="error-ingreso-inicial" role="alert" className="text-sm text-destructive sm:col-span-2">
          {error}
        </p>
      ) : null}
    </form>
  )
}
