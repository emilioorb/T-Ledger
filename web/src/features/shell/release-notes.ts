import texto from './novedades.md?raw'
import { copy } from './copy'

// Las notas viven en `novedades.md` y no acá: se escriben como texto, con Markdown de verdad, y
// se leen igual en el editor, en GitHub y en la pantalla. Este módulo solo las parte en
// entregas y grupos; lo de adentro de cada grupo se dibuja como Markdown.
export type Grupo = 'added' | 'improved' | 'fixed'

export interface Release {
  date: string
  version: string
  grupos: Record<Grupo, string>
}

const GRUPO_POR_TITULO: Record<string, Grupo> = {
  [copy.releases.added]: 'added',
  [copy.releases.improved]: 'improved',
  [copy.releases.fixed]: 'fixed',
}

const ENTREGA = /^## (\d{4}-\d{2}-\d{2})\s*·\s*v(\d+\.\d+\.\d+)\s*$/
const TITULO_DE_GRUPO = /^### (.+?)\s*$/

// Estricto a propósito: una entrega mal escrita rompe la prueba del archivo, no aparece a
// medias en pantalla. Lo que está antes de la primera entrega es el preámbulo y se ignora.
export const leerNovedades = (markdown: string): Release[] => {
  const entregas: Release[] = []
  let grupo: Grupo | null = null

  for (const [indice, linea] of markdown.split(/\r?\n/).entries()) {
    const donde = `novedades.md:${String(indice + 1)}`
    const actual = entregas.at(-1)

    if (linea.startsWith('## ')) {
      const partes = ENTREGA.exec(linea)
      if (!partes?.[1] || !partes[2]) {
        throw new Error(`${donde}: una entrega abre con «## AAAA-MM-DD · vX.Y.Z»`)
      }
      entregas.push({
        date: partes[1],
        version: partes[2],
        grupos: { added: '', improved: '', fixed: '' },
      })
      grupo = null
    } else if (linea.startsWith('### ')) {
      const titulo = TITULO_DE_GRUPO.exec(linea)?.[1] ?? ''
      grupo = GRUPO_POR_TITULO[titulo] ?? null
      if (!actual || !grupo) {
        throw new Error(`${donde}: «${titulo}» no es un grupo, o está fuera de una entrega`)
      }
    } else if (actual && grupo) {
      actual.grupos[grupo] += `${linea}\n`
    } else if (actual && linea.trim() !== '') {
      throw new Error(`${donde}: texto suelto entre la fecha y el primer grupo`)
    }
  }

  for (const entrega of entregas) {
    for (const clave of Object.keys(entrega.grupos) as Grupo[]) {
      entrega.grupos[clave] = entrega.grupos[clave].trim()
    }
  }
  return entregas
}

export const releases: Release[] = leerNovedades(texto)
