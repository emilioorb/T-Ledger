// El nombre y la firma de la app. Viven acá y no sueltos en el JSX porque el pie no es el
// único lugar donde se dicen: la barra lateral los repite.
export const copy = {
  app: {
    // La cinta y el libro mayor: el rollo donde cada operación queda impresa en orden, y el
    // libro que agrupa esos mismos asientos por cuenta. Es el recorrido que hace la app.
    name: 'Tape Ledger',
    author: 'Emilio Rodríguez',
  },
  nav: {
    dashboard: 'Dashboard',
    releases: 'Novedades',
    signOut: 'Cerrar sesión',
    // El subtítulo del menú dice en qué libro estás parado, no tu correo: el correo ya lo
    // sabés, y con varios libros lo que se pierde de vista es en cuál estás anotando.
    noBook: 'Sin libro',
    loadingSession: 'Cargando tu sesión',
    // Si cerrar sesión falla, la sesión sigue abierta: decirlo es lo único honesto, porque
    // dejar la pantalla como si nada da a entender que la persona ya salió.
    signOutFailed: 'No se pudo cerrar la sesión. Seguís dentro.',
    toggleSidebar: 'Alternar la barra lateral',
    skipToContent: 'Saltar al contenido',
    expand: (section: string) => `Desplegar ${section}`,
  },
  // Lo que dice un control sin texto visible es copy igual: vive acá para poder revisarlo
  // junto al resto y no escondido en un atributo.
  controls: {
    clearSearch: 'Limpiar la búsqueda',
    sort: {
      label: (column: string, state: string) => `Ordenar por ${column}, ${state}`,
      ascending: 'ascendente',
      descending: 'descendente',
      unsorted: 'sin ordenar',
    },
  },
  notFound: {
    title: 'Esta dirección no existe',
    description:
      'El enlace quedó viejo o tiene un error de tipeo. Nada se perdió: lo registrado sigue donde estaba.',
    action: 'Ir al panel',
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
