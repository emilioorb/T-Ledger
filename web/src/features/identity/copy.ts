// Las pantallas donde todavía no sos nadie. El tono es el mismo del resto: se dice lo que
// pasa, sin pedir disculpas ni prometer de más.
export const copy = {
  entrar: {
    title: 'Entrar a T-Ledger',
    // El nombre corto, para la pestaña. El titular ya dice «T-Ledger» y el título de la
    // pestaña le agrega el nombre de la app al final: junto daría «Entrar a T-Ledger ·
    // T-Ledger».
    tab: 'Entrar',
    // Dice para qué sirve la cuenta, que es lo que alguien necesita saber parado acá. Y es
    // cierto: una misma cuenta lleva varios libros, que es de lo que se trata la fase.
    subtitle: 'Una cuenta para tu libro, el de la casa y el de la familia.',
    email: 'Correo',
    // Un ejemplo con forma de correo real y no «tu@correo.com»: el que ve el formato lo
    // reconoce sin leer la etiqueta.
    emailPlaceholder: 'vos@ejemplo.com',
    password: 'Contraseña',
    // Dicen qué va a pasar, no en qué estado está: es lo que un lector de pantalla necesita
    // para decidir si vale la pena activar el control.
    showPassword: 'Mostrar la contraseña',
    hidePassword: 'Ocultar la contraseña',
    // Puntos y no «contraseña»: dice de qué se trata el campo sin sugerir un largo ni un
    // formato que la app no exige.
    passwordPlaceholder: '••••••••',
    submit: 'Entrar',
    submitting: 'Entrando…',
    // No se dice si falló el correo o la contraseña: decirlo confirma qué correos existen.
    failed: 'El correo o la contraseña no coinciden.',
    // Para todo lo que no es una credencial equivocada. Existe porque el servidor rechazaba el
    // ingreso por un problema de configuración y la pantalla decía que la contraseña estaba
    // mal: echarle la culpa a la persona por algo que no hizo la manda a probar diez veces una
    // contraseña que estaba bien.
    rejected: 'No se pudo entrar. No es culpa de lo que escribiste: probá de nuevo o escribinos.',
    // Cuando el servidor no contesta no es culpa de lo que escribió la persona, y tratarlo
    // como si lo fuera la manda a revisar una contraseña que estaba bien.
    unreachable: 'No se pudo conectar con el servidor. Probá de nuevo en un momento.',
    // Por qué te encontrás en esta pantalla si vos no pediste salir. Sin esto, volver y ver
    // el formulario de ingreso se lee como que la app te echó sin motivo.
    closedByIdle: 'Cerramos la sesión porque estuviste un rato sin tocar nada.',
    // Sin registro abierto: quien llega sin invitación no tiene nada que hacer acá, y
    // ofrecerle un enlace a «crear cuenta» sería mandarlo a un rechazo.
    noAccount: 'Se entra por invitación. Si no tenés una, pedísela a quien lleva el libro.',
  },
  // El cierre por inactividad. Avisa antes de cerrar porque hacerlo de golpe, en medio de un
  // asiento a medio escribir, sería peor que el riesgo que evita.
  inactividad: {
    title: '¿Seguís ahí?',
    description: (cuenta: string) =>
      `Vamos a cerrar la sesión en ${cuenta} porque hace rato que no tocás nada.`,
    stay: 'Seguir acá',
    leave: 'Cerrar sesión',
  },
  crear: {
    title: 'Crear tu cuenta',
    tab: 'Crear cuenta',
    // Con el enlace de acceso se dice qué va a pasar después; sin él, lo mismo que en la
    // pantalla de entrar, porque es lo mismo que va a contestar el servidor.
    invited: 'Te dieron acceso a T-Ledger. Creá tu cuenta con tu propia contraseña y arrancás con tu libro.',
    alone:
      'Se entra por invitación. Si estás levantando tu propio T-Ledger, esta va a ser la primera cuenta.',
    name: 'Tu nombre',
    namePlaceholder: 'Emilio Rodríguez',
    // Ocho es el mínimo de Better Auth. Se dice antes de escribir y no después de fallar.
    passwordHint: 'Al menos 8 caracteres.',
    submit: 'Crear la cuenta',
    submitting: 'Creando…',
    // El 403 del servidor: no te invitaron, venció o ya se usó. Las tres dan lo mismo del lado
    // de acá, y separarlas sería decir qué correos tienen invitación.
    notInvited: 'Ese enlace no está disponible. Pedile uno nuevo a quien administra T-Ledger.',
    taken: 'Ese correo ya tiene cuenta.',
    failed: 'No se pudo crear la cuenta. Probá de nuevo o escribinos.',
    haveAccount: '¿Ya tenés cuenta?',
    signIn: 'Entrar',
  },
  // Unirse a un libro ajeno con la cuenta propia. El enlace de un libro no crea cuentas: las
  // cuentas nuevas las habilita quien administra la instancia.
  unirse: {
    title: 'Unirte a un libro',
    withSession: (correo: string) => `Vas a entrar con ${correo}.`,
    // Qué libro es y quién invita, antes del botón: unirse deja todo lo que anotes a la vista
    // de quien lleva ese libro.
    invitedBy: (quien: string, libro: string, rol: string) =>
      `${quien} te invitó al libro «${libro}», para que ${rol}.`,
    otherAccount: (correo: string) =>
      `Esta invitación no es para ${correo}. Salí y entrá con el correo al que te invitaron.`,
    switchAccount: 'Entrar con otra cuenta',
    joinedNotOpened: 'Ya sos parte del libro, pero no se pudo abrir. Elegilo desde Cuenta, en Tus libros.',
    join: 'Unirme al libro',
    joining: 'Uniéndote…',
    needsAccount: 'Te invitaron a un libro. Para unirte, entrá con tu cuenta de T-Ledger.',
    signIn: 'Entrar para unirme',
    noAccount:
      '¿No tenés cuenta? Pedile acceso a quien administra T-Ledger: las cuentas nuevas las habilita esa persona.',
    // Vencida, cancelada, ya usada o de otro correo: las cuatro dan lo mismo del lado de acá.
    unavailable: 'Esa invitación no está disponible. Pedile un enlace nuevo a quien te invitó.',
    incomplete: 'Este enlace está incompleto. Pedile uno nuevo a quien te invitó.',
  },
  panel: {
    // Lo que el producto puede demostrar de sí mismo, en vez de un testimonio inventado. Y se
    // dice en el mismo orden en que la cinta de abajo lo muestra: primero la plata que llega,
    // después de dónde salió. La frase apunta al hábito que T-Ledger reemplaza —anotar el
    // gasto y nada más— sin nombrarlo.
    title: 'La plata no aparece: sale de algún lado.',
    // No repite el titular: el titular es la regla, esto es qué cosa es la regla.
    subtitle:
      'Es contabilidad de partida doble, la misma que lleva una empresa. El libro no cierra hasta que las dos columnas dan igual.',
    // El encabezado fijo de la cinta. Sin estas tres palabras, dos montos iguales en columnas
    // distintas son un misterio para quien no lleva contabilidad.
    account: 'Cuenta',
    debit: 'Debe',
    credit: 'Haber',
  },
  marco: {
    inicio: 'Volver al inicio',
    ayuda: '¿Necesitás ayuda?',
    // Un correo de verdad y no un formulario que no existe: si alguien no puede entrar, lo
    // último que necesita es otra pantalla.
    correoDeAyuda: 'emiliorb@arclosystems.com',
    asuntoDeAyuda: 'No puedo entrar a T-Ledger',
    // En el original acá dice «Protegido por política SSO del espacio de trabajo». Acá va lo
    // único equivalente que es cierto en T-Ledger, y además es lo que el aislamiento en
    // dos capas garantiza de verdad.
    privacidad: 'Cada libro es privado: solo lo ven las personas que están en él.',
  },
} as const
