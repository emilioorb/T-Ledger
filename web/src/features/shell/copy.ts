// El nombre y la firma de la app. Viven acá y no sueltos en el JSX porque el pie no es el
// único lugar donde se dicen: la barra lateral los repite.
export const copy = {
  app: {
    // La cuenta T y el libro mayor: el debe a la izquierda, el haber a la derecha, y el libro
    // que agrupa esos asientos por cuenta. La T del nombre es esa cuenta, y es lo que explica
    // por qué la marca va en monoespaciada: dos columnas que solo se leen si alinean.
    name: 'T-Ledger',
  },
  // La barra de arriba del tablero: la fecha, el saludo y cómo va el mes.
  tablero: {
    morning: 'Buenos días',
    afternoon: 'Buenas tardes',
    night: 'Buenas noches',
    // Lo que va debajo del saludo es un dato, no un ánimo: el producto no felicita, dice cómo
    // va la cosa. Con el mes recién empezado no hay nada que resumir todavía.
    resumen: (movimientos: number, faltan: number) =>
      movimientos === 0
        ? 'Todavía no anotaste nada este mes.'
        : `${movimientos} ${movimientos === 1 ? 'movimiento anotado' : 'movimientos anotados'} este mes, y ${faltan === 0 ? 'hoy cierra' : faltan === 1 ? 'falta un día para cerrarlo' : `faltan ${faltan} días para cerrarlo`}.`,
  },

  nav: {
    dashboard: 'Dashboard',
    releases: 'Novedades',
    account: 'Tu cuenta',
    support: 'Soporte',
    supportEmail: 'emiliorb@arclosystems.com',
    supportSubject: 'T-Ledger',
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
      'Qué cambió en cada entrega, de la más reciente a la más vieja.',
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
