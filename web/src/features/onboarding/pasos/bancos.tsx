import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SYMBOL } from '@/lib/money'
import { copy } from '../copy'
import type { BancoCreado, Moneda } from '../types'
import { alternar } from './alternar'
import { FORM_ID } from './intro'

interface Props {
  hecho: BancoCreado[] | undefined
  onListo: (pedido: { banks: { name: string; currency: Moneda }[] } | null) => void
  monedas: Moneda[]
}

const clave = (name: string, currency: Moneda) => `${name}|${currency}`

const normalizar = (texto: string) => texto.trim().toLowerCase().replace(/\s+/g, ' ')

// El nombre de la cuenta en la api es "<nombre> colones"/"<nombre> dólares" (mismo largo que el
// sufijo): no puede pasar el NAME_MAX de api/src/shared/http/text.schema.ts.
const NOMBRE_MAX = 120 - ' colones'.length

export const Bancos = ({ hecho, onListo, monedas }: Props) => {
  const [nombres, setNombres] = useState<string[]>([...copy.bancos.sugeridos])
  const [marcados, setMarcados] = useState<Set<string>>(new Set())
  const [otro, setOtro] = useState('')

  if (hecho) {
    return (
      <ul className="divide-y rounded-lg border text-sm">
        {hecho.map((banco) => (
          <li key={banco.bankAccountId} className="px-3 py-2">
            {banco.name}
          </li>
        ))}
      </ul>
    )
  }

  const marcar = (llave: string) => setMarcados((actuales) => alternar(actuales, llave))

  const agregarOtro = () => {
    const nombre = otro.trim().replace(/\s+/g, ' ')
    if (!nombre || nombres.some((existente) => normalizar(existente) === normalizar(nombre))) return
    setNombres([...nombres, nombre])
    marcar(clave(nombre, 'CRC'))
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
      {/* Una fila por banco y una casilla corta por moneda: con «Colones» y «Dólares» escritos,
          la segunda se caía de renglón en el teléfono. El nombre completo va en aria-label. */}
      <ul className="divide-y rounded-lg border">
        {nombres.map((name) => (
          <li key={name} className="flex items-center pl-3">
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{name}</span>
            {monedas.map((currency) => (
              <Label key={currency} className="num h-11 px-3 font-normal sm:h-9">
                <Checkbox
                  aria-label={`${name} · ${copy.bancos.moneda[currency]}`}
                  checked={marcados.has(clave(name, currency))}
                  onCheckedChange={() => marcar(clave(name, currency))}
                />
                {SYMBOL[currency]}
              </Label>
            ))}
          </li>
        ))}
      </ul>
      <div className="flex gap-2">
        <Input
          className="h-11 sm:h-9"
          value={otro}
          onChange={(evento) => setOtro(evento.target.value)}
          placeholder={copy.bancos.otroPlaceholder}
          aria-label={copy.bancos.otro}
          maxLength={NOMBRE_MAX}
          onKeyDown={(evento) => {
            if (evento.key === 'Enter') {
              evento.preventDefault()
              agregarOtro()
            }
          }}
        />
        <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={agregarOtro}>
          {copy.bancos.agregar}
        </Button>
      </div>
    </form>
  )
}
