// El nombre y la firma de la app. Viven acá y no sueltos en el JSX porque el pie no es el
// único lugar donde se dicen: la barra lateral los repite.
export const copy = {
  app: {
    name: 'Tape',
    author: 'Emilio Rodríguez',
  },
  nav: {
    dashboard: 'Dashboard',
    releases: 'Novedades',
  },
  releases: {
    title: 'Novedades',
    description:
      'Qué cambió en cada entrega, de la más reciente a la más vieja. Mientras no haya números de versión publicados, cada entrega se nombra por su fecha.',
    added: 'Nuevo',
    improved: 'Mejorado',
    fixed: 'Corregido',
    current: 'Esta es la versión que estás usando',
    empty: {
      title: 'Todavía no hay entregas anotadas',
      description: 'Acá van a quedar los cambios de cada entrega, en cuanto haya una publicada.',
    },
  },
} as const
