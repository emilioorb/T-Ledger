import { useState, type FormEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { copy } from '../copy'
import type { CategoriaCreada } from '../types'
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

  if (hecho) return <p className="text-sm text-muted-foreground">{copy.cierre.resumen.categorias(hecho.length)}</p>

  const alternar = (name: string) =>
    setMarcadas((actuales) => {
      const siguientes = new Set(actuales)
      if (siguientes.has(name)) siguientes.delete(name)
      else siguientes.add(name)
      return siguientes
    })

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
        <fieldset key={kind} className="space-y-2">
          <legend className="text-sm font-medium">{kind === 'EXPENSE' ? copy.categorias.gasto : copy.categorias.ingreso}</legend>
          <div className="flex flex-wrap gap-2">
            {todas
              .filter((c) => c.kind === kind)
              .map(({ name }) => (
                <Label key={name} className="flex items-center gap-2 rounded-full border border-border px-3 py-1.5 text-sm font-normal">
                  <Checkbox aria-label={name} checked={marcadas.has(name)} onCheckedChange={() => alternar(name)} />
                  {name}
                </Label>
              ))}
          </div>
        </fieldset>
      ))}
      <div className="flex gap-2">
        <Input value={propia} onChange={(e) => setPropia(e.target.value)} placeholder={copy.categorias.propiaPlaceholder} aria-label={copy.categorias.propia} />
        <Button type="button" variant="outline" onClick={() => setTipo(tipo === 'EXPENSE' ? 'INCOME' : 'EXPENSE')}>
          {copy.categorias.tipo[tipo]}
        </Button>
        <Button type="button" variant="outline" onClick={agregar}>
          {copy.bancos.agregar}
        </Button>
      </div>
    </form>
  )
}
