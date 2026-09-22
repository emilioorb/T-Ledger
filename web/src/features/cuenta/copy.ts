export const copy = {
  title: 'Tu cuenta',

  perfil: {
    nameLabel: 'Tu nombre',
    nameHint: 'Es el que firma cada cambio en el registro del libro.',
    saved: 'Listo, ese es tu nombre de ahora en adelante.',
    failed: 'No se pudo guardar el nombre.',
    since: (fecha: string) => `Desde el ${fecha}`,
    roles: { owner: 'Dueño', editor: 'Anota', viewer: 'Mira' },
  },

  contrasena: {
    title: 'Contraseña',
    hint: 'La última vez que la cambiaste fue hace un rato o hace un año: el libro no lleva esa cuenta.',
    open: 'Cambiar la contraseña',
    dialogHint:
      'Pedimos la de ahora para que nadie que encuentre tu sesión abierta pueda cambiarla.',
    current: 'La de ahora',
    next: 'La nueva',
    repeat: 'La nueva otra vez',
    submit: 'Cambiarla',
    submitting: 'Cambiando',
    cancel: 'Dejarla como está',
    changed: 'Contraseña cambiada. Las otras sesiones quedaron cerradas.',
    mismatch: 'Las dos nuevas no coinciden.',
    short: 'La nueva tiene que medir al menos ocho caracteres.',
    wrong: 'La contraseña de ahora no es esa.',
    failed: 'No se pudo cambiar la contraseña.',
  },

  apariencia: {
    title: 'Cómo se te ve',
    hint: 'Vale para este navegador: es la pantalla que tenés enfrente, no tu cuenta.',
    theme: 'Tema',
    themes: { dark: 'Oscuro', light: 'Claro', system: 'El del sistema' },
    systemHint: (tema: string) => `Tu sistema está en ${tema.toLowerCase()}.`,
    nimbo: 'El color de Nimbo',
    nimboAuto: 'La tinta del tema',
  },

  libros: {
    title: 'Tus libros',
    hint: 'Cada libro lleva su contabilidad aparte. Lo que anotás en uno no se ve desde el otro.',
    here: 'Acá estás',
    since: (fecha: string) => `Desde el ${fecha}`,
    manage: 'Administrar',
    enter: 'Entrar',
    switching: 'Entrando',
    switched: (nombre: string) => `Listo, estás en ${nombre}.`,
    failed: 'No se pudo cambiar de libro.',
    loading: 'Cargando tus libros',
    none: 'Todavía no pertenecés a ningún libro.',
    create: 'Crear un libro',
    createTitle: 'Un libro nuevo',
    createHint:
      'Lleva su propia contabilidad, aparte de la de los demás. Arranca con el plan de cuentas puesto.',
    name: 'Cómo se va a llamar',
    namePlaceholder: 'Casa, Negocio, Personal',
    submit: 'Crearlo',
    submitting: 'Creando',
    created: (nombre: string) => `Listo, ${nombre} es tuyo. Ya estás adentro.`,
    createFailed: 'No se pudo crear el libro.',
    // Tres es el tope del servidor. Se dice antes de que alguien llene el formulario para
    // que el botón le conteste que no.
    full: 'Llegaste al máximo de tres libros propios.',
  },

  baja: {
    title: 'Borrar tu cuenta',
    hint: 'Te vas vos. Los libros donde seas el único dueño se van con vos, con todo lo anotado adentro.',
    open: 'Borrar mi cuenta',
    dialogTitle: '¿Borrar tu cuenta?',
    dialogHint:
      'No se puede deshacer. Si sos el único dueño de un libro, ese libro y su contabilidad entera se borran con tu cuenta.',
    export: 'Si querés guardarte los números, los reportes se descargan en CSV antes.',
    password: 'Tu contraseña, para confirmar',
    confirm: 'Borrar mi cuenta',
    deleting: 'Borrando',
    cancel: 'Dejar todo como está',
    wrongPassword: 'Esa no es tu contraseña.',
    failed: 'No se pudo borrar la cuenta.',
  },

  sesiones: {
    title: 'Dónde estás adentro',
    hint: 'Si ves una que no reconocés, cerrala y cambiá la contraseña.',
    current: 'Esta',
    since: (fecha: string) => `Desde el ${fecha}`,
    unknown: 'Aparato sin identificar',
    close: 'Cerrar',
    seeAll: (total: number) => `Ver las ${total}`,
    allTitle: 'Dónde estás adentro',
    allHint: (total: number) =>
      total === 1 ? 'Una sesión abierta.' : `${total} sesiones abiertas ahora mismo.`,
    closeOthers: 'Cerrar las demás',
    closing: 'Cerrando',
    closed: 'Sesión cerrada.',
    closedOthers: 'Las otras sesiones quedaron cerradas.',
    failed: 'No se pudo cerrar la sesión.',
    alone: 'Es la única abierta.',
    loading: 'Cargando tus sesiones',
  },
} as const
