import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { TEXT_LINK } from '@/components/text-link'
import { cn } from '@/lib/utils'

// Cada pieza de Markdown con la tipografía y los tokens de la app, no con los estilos de la
// librería: una negrita sube a la tinta principal y a 600, no a 500, que al lado del 400 del
// texto se perdía, el código va en mono
// como toda cifra, y una tabla es la de siempre en chico.
const PIEZAS: Components = {
  p: ({ node: _node, ...props }) => <p className="text-sm" {...props} />,
  strong: ({ node: _node, ...props }) => (
    <strong className="font-semibold text-foreground" {...props} />
  ),
  em: ({ node: _node, ...props }) => <em className="text-foreground" {...props} />,
  code: ({ node: _node, className, ...props }) => (
    <code className={cn('num rounded-sm bg-secondary px-1 py-px text-[0.85em]', className)} {...props} />
  ),
  a: ({ node: _node, ...props }) => <a className={TEXT_LINK} {...props} />,
  // El punto va en su propia columna: con `list-disc` la segunda línea de una frase larga se
  // mete debajo de la viñeta y el bloque pierde el borde izquierdo.
  ul: ({ node: _node, ...props }) => <ul className="space-y-1.5 [&_ul]:mt-1.5" {...props} />,
  ol: ({ node: _node, ...props }) => (
    <ol className="list-decimal space-y-1.5 pl-5 text-sm marker:text-muted-foreground" {...props} />
  ),
  li: ({ node: _node, children, ...props }) => (
    <li className="grid grid-cols-[0.75rem_1fr] text-sm" {...props}>
      <span aria-hidden="true" className="text-muted-foreground">
        ·
      </span>
      <div>{children}</div>
    </li>
  ),
  table: ({ node: _node, ...props }) => (
    <div className="my-2 overflow-x-auto">
      <table className="w-full text-left text-sm" {...props} />
    </div>
  ),
  th: ({ node: _node, ...props }) => (
    <th className="border-b border-border py-1.5 pr-4 text-xs font-medium text-muted-foreground" {...props} />
  ),
  td: ({ node: _node, ...props }) => (
    <td className="border-b border-border/50 py-1.5 pr-4 align-top" {...props} />
  ),
}

const SIN_PARRAFOS = ['p']

// Sin HTML crudo: el archivo lo escribe una persona, pero la pantalla no tiene por qué confiar
// en que nunca se cuele un `<script>`.
//
// `enLinea` es para una frase que ya vive dentro de un renglón —un paso, una nota—: sin él,
// cada frase llega envuelta en su propio párrafo y rompe la línea donde está.
export const TextoMarkdown = ({ children, enLinea = false }: { children: string; enLinea?: boolean }) => (
  <Markdown
    remarkPlugins={[remarkGfm]}
    components={PIEZAS}
    skipHtml
    {...(enLinea ? { disallowedElements: SIN_PARRAFOS, unwrapDisallowed: true } : {})}
  >
    {children}
  </Markdown>
)

// El texto sin sus marcas, para lo que no se dibuja como Markdown: una búsqueda o un resumen
// de un renglón.
export const sinMarcas = (texto: string): string =>
  texto.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/[*_`~]/g, '')
