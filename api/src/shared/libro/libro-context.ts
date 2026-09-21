import { AsyncLocalStorage } from 'node:async_hooks'

export type Rol = 'owner' | 'editor' | 'viewer'

export interface ContextoDeLibro {
  bookId: string
  userId: string
  rol: Rol
}

// El mismo mecanismo que `PrismaService` ya usa para el cliente transaccional: el dato viaja
// con la petición sin pasarse de mano en mano, así que los repositorios no cambian.
const almacen = new AsyncLocalStorage<ContextoDeLibro>()

// El `await` de adentro no sobra: sin él, `run` devuelve la promesa del llamador y cierra el
// contexto ahí mismo. Prisma construye promesas perezosas —`create()` no consulta nada hasta
// que alguien la espera—, así que la consulta acabaría corriendo fuera del contexto y fallando
// con «sin libro» aunque quien llamó hubiera hecho todo bien. Esperando acá, el contexto sigue
// abierto hasta que el trabajo termina de verdad.
export const conLibro = <T>(contexto: ContextoDeLibro, correr: () => Promise<T>): Promise<T> =>
  almacen.run(contexto, async () => await correr())

export class SinLibroError extends Error {
  // Lleva qué se estaba consultando: sin eso, el mensaje dice que algo corrió sin libro pero
  // no qué, y encontrarlo en una suite de sesenta archivos es buscar a ciegas.
  constructor(quien?: string) {
    super(
      `Consulta sin libro en contexto${quien ? ` (${quien})` : ''}: no hay a quién pertenecen estos datos`,
    )
    this.name = 'SinLibroError'
  }
}

// Tira en vez de devolver `undefined`. Es la regla que sostiene el aislamiento entero: una
// consulta que corra fuera de contexto tiene que romperse ruidosa, porque la alternativa es
// armar un `where` vacío y devolver los libros de todo el mundo, que es el peor error posible
// en esta aplicación y además silencioso: nadie reporta ver datos de más.
export const libroActual = (quien?: string): ContextoDeLibro => {
  const contexto = almacen.getStore()
  if (!contexto) throw new SinLibroError(quien)
  return contexto
}

// `conLibro` envuelve una ejecución, que es lo correcto para una petición HTTP. Pero un
// `beforeEach` de un test no envuelve al test que viene después, así que ahí hace falta
// establecer el contexto para todo lo que siga en la misma cadena asíncrona. Eso es
// exactamente lo que hace `enterWith`, y por eso existe esta puerta aparte: para no tentarse
// con usarla en el camino de una petición, donde dejaría contexto pegado entre peticiones.
export const entrarEnLibro = (contexto: ContextoDeLibro): void => almacen.enterWith(contexto)
