// Si la persona ya vio la bienvenida. Es de identity porque vive en su tabla; la bienvenida la
// consulta y la marca por acá, sin tocar tablas de Better Auth.
export interface MarcaDeBienvenida {
  vista(userId: string): Promise<boolean>
  // Marcar dos veces no es un error: dos pestañas pueden abrirla a la vez.
  marcar(userId: string): Promise<void>
}

export const MARCA_DE_BIENVENIDA = Symbol('MARCA_DE_BIENVENIDA')
