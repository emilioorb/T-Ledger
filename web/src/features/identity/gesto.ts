import type { NombreDeGesto } from '@/features/shell/bloub'

interface Estado {
  enviando: boolean
  fallo: boolean
  escribiendoContrasena: boolean
}

// Cómo se siente Nimbo en las pantallas donde todavía no sos nadie. Reacciona a lo único que
// pasa en ellas, y el gesto que importa es el tercero: **cierra los ojos mientras escribís la
// contraseña**. Es un chiste y es verdad al mismo tiempo —la contraseña no se mira, ni
// siquiera acá—, y es de los pocos lugares donde la app se puede permitir uno: estas pantallas
// se ven una vez cada tanto, no cien veces al día.
//
// El orden es el orden en que las cosas importan: lo que está pasando ahora, lo que salió mal,
// lo que la persona está haciendo, y al final el reposo.
export const gestoDeFormulario = ({
  enviando,
  fallo,
  escribiendoContrasena,
}: Estado): NombreDeGesto => {
  if (enviando) return 'emocionado'
  if (fallo) return 'triste'
  if (escribiendoContrasena) return 'adormilado'
  return 'contento'
}
