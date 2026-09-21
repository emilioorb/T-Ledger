import { Prisma } from '../../generated/prisma/client.js'
import { libroActual } from '../libro/libro-context.js'

// Fuera del filtro a propósito. Las tablas de Better Auth tienen su propio modelo de
// pertenencia, y los tipos de cambio del BCCR son públicos y los mismos para todo el mundo:
// duplicarlos por libro sería guardar la misma tabla N veces.
//
// Esta lista es la única forma de que algo quede sin filtrar. Agregar un modelo acá es una
// decisión que hay que poder defender, no un atajo para que pase un test.
export const SIN_LIBRO = new Set([
  'ExchangeRate',
  'authUser',
  'authSession',
  'authAccount',
  'authVerification',
  'book',
  'bookMember',
  'bookInvitation',
])

const ESCRIBEN = new Set(['create', 'createMany', 'createManyAndReturn', 'upsert'])

export class LibroAjenoError extends Error {
  constructor(intentado: string, actual: string) {
    super(`Se intentó escribir en el libro ${intentado} estando en el ${actual}`)
    this.name = 'LibroAjenoError'
  }
}

const filasDe = (datos: unknown): Record<string, unknown>[] =>
  Array.isArray(datos) ? (datos as Record<string, unknown>[]) : [datos as Record<string, unknown>]

// Segunda capa del aislamiento, no la primera. La primera es que cada repositorio escribe el
// `bookId` a la vista, porque la pertenencia tiene que leerse en el código y no ponerla una
// capa invisible.
//
// Acá pasan dos cosas distintas:
//
//   - En las **lecturas y modificaciones** se agrega el libro al `where`. Es la red contra el
//     olvido: son cientos de consultas y alcanza con una sin filtrar para que alguien vea los
//     movimientos de otra familia.
//   - En las **escrituras** no se inyecta nada: se verifica. Si la fila declara un libro
//     distinto al del contexto, se corta. Inyectarlo en silencio taparía un error de
//     programación en vez de mostrarlo, y haría que el código mintiera sobre dónde escribe.
//
// `libroActual()` tira si no hay contexto. Nunca se arma un `where` vacío: eso devolvería los
// libros de todo el mundo, que es el error que esta extensión existe para impedir y el único
// que nadie reporta, porque ver datos de más no se siente como una falla.
export const filtroDeLibro = Prisma.defineExtension({
  name: 'filtro-de-libro',
  query: {
    $allModels: {
      async $allOperations({ model, operation, args, query }) {
        if (!model || SIN_LIBRO.has(model)) return query(args)

        const { bookId } = libroActual(`${model}.${operation}`)
        const entrada = args as Record<string, unknown>

        if (ESCRIBEN.has(operation)) {
          const nuevas = operation === 'upsert' ? filasDe(entrada.create) : filasDe(entrada.data)
          for (const fila of nuevas) {
            if (fila?.bookId !== undefined && fila.bookId !== bookId) {
              throw new LibroAjenoError(String(fila.bookId), bookId)
            }
          }
          if (operation !== 'upsert') return query(entrada as never)
        }

        // Hasta un `upsert` filtra su `where`: sin eso, uno lanzado desde otro libro
        // actualizaría una fila ajena en vez de crear la propia.
        return query({ ...entrada, where: { ...(entrada.where as object), bookId } } as never)
      },
    },
  },
})
