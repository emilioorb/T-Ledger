// Quién se queda con el libro cuando alguien se borra la cuenta.
//
// Un libro sin dueño no es un libro archivado: es una base de datos con la plata de alguien
// adentro y nadie que pueda entrar a verla, borrarla ni invitar a nadie. Así que un libro del
// que se va su único dueño se va con él. Los demás —donde queda otro dueño— siguen existiendo
// y solo pierden un miembro.
//
// Va como función pura y no dentro del gancho de Better Auth porque es la regla que decide
// qué se destruye: eso tiene que poder probarse sin levantar una base.
export interface DuennosDeLibro {
  bookId: string
  // Cuántos dueños tiene el libro, contando a quien se va.
  duennos: number
}

export const librosQueSeVanConLaCuenta = (libros: readonly DuennosDeLibro[]): string[] =>
  libros.filter(({ duennos }) => duennos <= 1).map(({ bookId }) => bookId)
