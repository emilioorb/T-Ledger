// Qué cosas dejan rastro. La lista sale del ADR-004 y es cerrada a propósito: el audit log se
// escribe «donde hay plata o decisiones», y un tipo abierto invitaría a registrar cualquier
// cosa hasta enterrar la señal bajo el ruido de catálogos y consultas.
export type EntidadAuditada =
  | 'movimiento'
  | 'periodo'
  | 'deuda'
  | 'meta'
  | 'inversion'
  | 'presupuesto'
  | 'miembro'
  // El libro mismo: hoy solo cuando alguien lo vacía, que es la decisión más destructiva que
  // ofrece el producto y la que más merece quedar anotada.
  | 'libro'

// `anular` no es `eliminar`: un movimiento anulado sigue existiendo y su asiento se revierte,
// que es una cosa distinta de borrarlo. Distinguirlas es la diferencia entre poder reconstruir
// lo que pasó y tener que adivinarlo.
// `aportar` no es `editar`: poner plata en una meta y cambiarle el nombre son cosas distintas,
// y el registro se lee como una frase —«editó una meta» cuando alguien aportó ₡50 000 es una
// respuesta falsa a la pregunta que el registro existe para contestar—.
export type AccionAuditada =
  | 'crear'
  | 'editar'
  | 'aportar'
  // Pagar una cuota tampoco es editar la deuda: el registro tiene que poder decir «pagó la
  // cuota 2», no «editó CONAPE».
  | 'pagar'
  | 'eliminar'
  | 'anular'
  | 'cerrar'
  | 'reabrir'
  // Vaciar no es eliminar: eliminar se lleva una cosa, vaciar se lleva todo lo anotado y deja
  // el libro en pie. Leídas en el registro, son dos frases distintas.
  | 'vaciar'

export interface EntradaDeRastro {
  entidad: EntidadAuditada
  entidadId: string
  accion: AccionAuditada
  // Las dos versiones, crudas. El diff lo calcula la auditoría y no el llamador: si cada caso
  // de uso armara el suyo, el rastro contaría la misma historia de siete maneras distintas.
  //
  // Al crear se manda solo `despues` —el rastro muestra con qué valores nació— y al eliminar
  // solo `antes`.
  // `object` y no `Record<string, unknown>`: las props del dominio son interfaces, y
  // TypeScript no considera una interfaz asignable a un registro indexado —le falta la firma
  // de índice, que solo tienen los alias de tipo—. Pedir el registro obligaría a cada llamador
  // a castear, que es esparcir el problema en vez de resolverlo.
  antes?: object
  despues?: object
}

export interface Rastro {
  // Se llama **dentro** del mismo `withTransaction` que el cambio (ADR-004). Fuera de la
  // transacción el rastro podría perderse justo cuando algo sale mal, que es cuando más hace
  // falta, y entonces no serviría para lo único que se le pide: resolver una discusión sobre
  // qué pasó.
  registrar(entrada: EntradaDeRastro): Promise<void>
}

export const RASTRO = Symbol('Rastro')
