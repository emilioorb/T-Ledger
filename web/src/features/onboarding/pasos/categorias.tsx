import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { copy } from '../copy'
import type { CategoriaCreada } from '../types'
import { alternar } from './alternar'
import { FORM_ID } from './intro'

type Tipo = 'EXPENSE' | 'INCOME'
interface Categoria {
  name: string
  kind: Tipo
}

interface Props {
  hecho: CategoriaCreada[] | undefined
  onListo: (pedido: { categories: Categoria[] } | null) => void
}

const sugeridas = (): Categoria[] =>
  (['EXPENSE', 'INCOME'] as const).flatMap((kind) => copy.categorias.sugeridas[kind].map((name) => ({ name, kind })))

export const Categorias = ({ hecho, onListo }: Props) => {
  const [todas, setTodas] = useState<Categoria[]>(sugeridas)
  const [marcadas, setMarcadas] = useState<Set<string>>(() => new Set(sugeridas().map((c) => c.name)))
  const [propia, setPropia] = useState('')
  const [tipo, setTipo] = useState<Tipo>('EXPENSE')

  if (hecho) {
    return (
      <p className="text-sm text-muted-foreground">
        <span className="num">{hecho.length}</span> {copy.cierre.resumen.categorias(hecho.length)}
      </p>
    )
  }

  const marcar = (name: string) => setMarcadas((actuales) => alternar(actuales, name))

  const agregar = () => {
    const name = propia.trim()
    if (!name || todas.some((c) => c.name.toLocaleLowerCase('es') === name.toLocaleLowerCase('es'))) return
    setTodas([...todas, { name, kind: tipo }])
    setMarcadas(new Set([...marcadas, name]))
    setPropia('')
  }

  const enviar = (evento: FormEvent) => {
    evento.preventDefault()
    const categories = todas.filter((c) => marcadas.has(c.name))
    onListo(categories.length > 0 ? { categories } : null)
  }

  return (
    <form id={FORM_ID} onSubmit={enviar} className="space-y-4">
      {(['EXPENSE', 'INCOME'] as const).map((kind) => (
        <fieldset key={kind}>
          <legend className="text-sm font-medium">{kind === 'EXPENSE' ? copy.categorias.gasto : copy.categorias.ingreso}</legend>
          <div className="grid grid-cols-2 sm:grid-cols-3">
            {todas
              .filter((c) => c.kind === kind)
              .map(({ name }) => (
                <Label key={name} className="h-11 font-normal sm:h-9">
                  <Checkbox aria-label={name} checked={marcadas.has(name)} onCheckedChange={() => marcar(name)} />
                  {name}
                </Label>
              ))}
          </div>
        </fieldset>
      ))}
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">{copy.categorias.propia}</legend>
        <div className="flex gap-2">
          <Input
            className="h-11 sm:h-9"
            value={propia}
            onChange={(e) => setPropia(e.target.value)}
            placeholder={copy.categorias.propiaPlaceholder}
            aria-label={copy.categorias.propiaPlaceholder}
          />
          <Button type="button" variant="outline" className="h-11 sm:h-9" onClick={agregar}>
            {copy.bancos.agregar}
          </Button>
        </div>
        <div className="flex items-center gap-4">
          <span id="tipo-de-propia" className="text-sm text-muted-foreground">
            {copy.categorias.tipoLabel}
          </span>
          <RadioGroup
            aria-labelledby="tipo-de-propia"
            value={tipo}
            onValueChange={(valor) => setTipo(valor === 'INCOME' ? 'INCOME' : 'EXPENSE')}
            className="flex w-auto gap-4"
          >
            {(['EXPENSE', 'INCOME'] as const).map((kind) => (
              <Label key={kind} className="h-11 font-normal sm:h-9">
                <RadioGroupItem value={kind} />
                {copy.categorias.tipo[kind]}
              </Label>
            ))}
          </RadioGroup>
        </div>
      </fieldset>
    </form>
  )
}
