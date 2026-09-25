import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { copy } from '../copy'
import type { BancoCreado, Moneda } from '../types'
import { FORM_ID } from './intro'

interface Props {
  hecho: BancoCreado[] | undefined
  onListo: (pedido: { banks: { name: string; currency: Moneda }[] } | null) => void
  monedas: Moneda[]
}

const clave = (name: string, currency: Moneda) => `${name}|${currency}`

export const Bancos = ({ hecho, onListo, monedas }: Props) => {
  const [nombres, setNombres] = useState<string[]>([...copy.bancos.sugeridos])
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [otro, setOtro] = useState('')

  if (hecho) {
    return (
      <ul className="space-y-1 text-sm">
        {hecho.map((banco) => (
          <li key={banco.bankAccountId}>{banco.name}</li>
        ))}
      </ul>
    )
  }

  const alternar = (llave: string) =>
    setMarcados((actuales) => {
      const siguientes = new Set(actuales)
      if (siguientes.has(llave)) siguientes.delete(llave)
      else siguientes.add(llave)
      return siguientes
    })

  const agregarOtro = () => {
    const nombre = otro.trim()
    if (!nombre || nombres.includes(nombre)) return
    setNombres([...nombres, nombre])
    alternar(clave(nombre, 'CRC'))
    setOtro('')
  }

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    const banks = nombres.flatMap((name) =>
      monedas.filter((currency) => marcados.has(clave(name, currency))).map((currency) => ({ name, currency })),
    )
    onListo(banks.length > 0 ? { banks } : null)
  }

  return (
    <form id={FORM_ID} onSubmit={enviar} className="space-y-3">
      <ul className="grid gap-2">
        {nombres.map((name) => (
          <li key={name} className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-lg border border-border px-3 py-2">
            <span className="min-w-32 text-sm font-medium">{name}</span>
            {monedas.map((currency) => (
              <Label key={currency} className="flex items-center gap-2 text-sm font-normal">
                <Checkbox
                  aria-label={`${name} · ${copy.bancos.moneda[currency]}`}
                  checked={marcados.has(clave(name, currency))}
                  onCheckedChange={() => alternar(clave(name, currency))}
                />
                {copy.bancos.moneda[currency]}
              </Label>
            ))}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          value={otro}
          onChange={(evento) => setOtro(evento.target.value)}
          placeholder={copy.bancos.otroPlaceholder}
          aria-label={copy.bancos.otro}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              evento.preventDefault()
              agregarOtro()
            }
          }}
        />
        <Button type="button" variant="outline" onClick={agregarOtro}>
          {copy.bancos.agregar}
        </Button>
      </div>
    </form>
  )
}
