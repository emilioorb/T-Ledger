// La conciliación no es una tabla de líneas: es el trabajo de explicar la diferencia entre lo
// que anotaste y lo que el banco vio. El copy va detrás de esa diferencia.
export const copy = {
  nav: {
    section: 'Banco',
    accounts: 'Cuentas',
    import: 'Importar',
    reconciliation: 'Conciliación',
  },

  accounts: {
    title: 'Cuentas bancarias',
    description:
      'Cada cuenta del banco apunta a una cuenta del plan contable. Ese enlace es contra qué se concilia.',
    columns: { name: 'Cuenta', account: 'Cuenta contable', currency: 'Moneda', profile: 'Perfil' },
    noProfile: 'Sin perfil',
    inactive: 'Inactiva',
    new: 'Nueva cuenta',
    edit: (name: string) => `Editar ${name}`,
    form: {
      createTitle: 'Nueva cuenta bancaria',
      editTitle: 'Editar cuenta bancaria',
      name: { label: 'Nombre', hint: 'Cómo la reconocés. Por ejemplo, BAC colones.' },
      accountCode: { label: 'Cuenta contable', hint: 'Solo cuentas que aceptan asientos.' },
      currency: { label: 'Moneda', hint: 'La misma en la que el banco exporta el extracto.' },
      profileId: { label: 'Perfil de importación', hint: 'El que se usa por omisión al importar.' },
      active: { label: 'Activa' },
      submit: 'Guardar cuenta',
    },
    empty: {
      title: 'Todavía no hay cuentas bancarias',
      description:
        'Una cuenta bancaria ata el extracto del banco a una cuenta del plan. Sin ella no hay contra qué conciliar.',
      action: 'Registrar la primera',
    },
    toast: { created: 'Cuenta creada', updated: 'Cambios guardados' },
  },

  profiles: {
    title: 'Perfiles de importación',
    description:
      'Cómo leer el CSV de cada banco: qué columna es la fecha, con qué formato, dónde está el monto. Es dato, no código.',
    new: 'Nuevo perfil',
    edit: (name: string) => `Editar ${name}`,
    columns: { name: 'Perfil', delimiter: 'Separador', dateFormat: 'Formato de fecha' },
    form: {
      createTitle: 'Nuevo perfil',
      editTitle: 'Editar perfil',
      name: { label: 'Nombre' },
      delimiter: { label: 'Separador', hint: 'Coma o punto y coma, un solo carácter.' },
      encoding: { label: 'Codificación', hint: 'Los bancos locales todavía exportan en latin1.' },
      headerRows: { label: 'Filas de encabezado', hint: 'Cuántas descartar antes de los datos.' },
      dateColumn: { label: 'Columna de fecha' },
      dateFormat: { label: 'Formato de fecha' },
      descriptionColumn: { label: 'Columna de descripción' },
      referenceColumn: { label: 'Columna de referencia', hint: 'Opcional.' },
      amountColumn: { label: 'Columna de monto', hint: 'Con signo. Dejala vacía si hay dos columnas.' },
      debitColumn: { label: 'Columna de débito' },
      creditColumn: { label: 'Columna de crédito' },
      decimalSeparator: { label: 'Separador decimal' },
      thousandsSeparator: { label: 'Separador de miles', hint: 'Opcional.' },
      columnsHint:
        'Las columnas se cuentan desde cero: la primera del archivo es la 0. Se usa una columna de monto con signo, o el par débito y crédito, nunca los dos.',
      submit: 'Guardar perfil',
    },
    empty: {
      title: 'Todavía no hay perfiles',
      description: 'Un perfil por banco. Después se ajusta viendo la vista previa, sin tocar código.',
      action: 'Crear el primero',
    },
    toast: { created: 'Perfil creado', updated: 'Cambios guardados' },
  },

  import: {
    title: 'Importar extracto',
    description: 'Subí el CSV del banco, revisá cómo quedó interpretado y recién ahí importalo.',
    account: { label: 'Cuenta bancaria' },
    profile: { label: 'Perfil' },
    file: { label: 'Archivo CSV', hint: 'El que exporta el banco, sin abrirlo en Excel.' },
    preview: 'Ver cómo queda',
    previewTitle: 'Así se va a importar',
    previewHint:
      'Si la fecha o el monto quedaron en el lugar equivocado, el perfil está mal mapeado. Ajustalo antes de importar.',
    previewCount: (shown: number, total: number) =>
      total > shown ? `Primeras ${shown} de ${total} líneas` : `${total} líneas`,
    columns: { date: 'Fecha', description: 'Descripción', reference: 'Referencia', amount: 'Monto' },
    submit: 'Importar',
    emptyPreview:
      'El archivo no produjo ninguna línea. O está vacío, o el perfil tiene el separador equivocado.',
    result: {
      title: 'Importación terminada',
      imported: (n: number) => (n === 1 ? '1 línea nueva' : `${n} líneas nuevas`),
      duplicated: (n: number) =>
        n === 1 ? '1 línea ya estaba' : `${n} líneas ya estaban`,
      allDuplicated: 'Ese archivo ya estaba importado completo. No es un error: no había nada nuevo.',
      goToReconciliation: 'Ir a conciliar',
    },
    needsAccount: {
      title: 'Primero registrá una cuenta bancaria',
      description: 'Un extracto se importa contra una cuenta, que a su vez apunta al plan contable.',
      action: 'Crear una cuenta',
    },
  },

  reconciliation: {
    title: 'Conciliación',
    description: 'Lo que el banco vio contra lo que anotaste. La diferencia es lo que falta explicar.',
    account: { label: 'Cuenta' },
    pickAccount: {
      title: 'Elegí contra qué cuenta conciliar',
      description: 'Cada cuenta bancaria tiene su propio extracto y su propio saldo contable.',
    },
    ledgerBalance: 'Saldo contable',
    statementBalance: 'Saldo del banco',
    difference: 'Diferencia',
    balanced: 'Todo conciliado: el saldo contable coincide con el del banco.',
    // Una diferencia sin dirección no es un dato: hay que decir de qué lado sobra.
    ledgerHigher: (amount: string) => `Tu contabilidad muestra ${amount} más que el banco.`,
    statementHigher: (amount: string) => `El banco muestra ${amount} más que tu contabilidad.`,
    explainedAll: (count: number) =>
      count === 1
        ? 'La línea pendiente explica la diferencia completa.'
        : `Las ${count} pendientes explican la diferencia completa.`,
    explainedPartly: (amount: string) => `Quedan ${amount} sin explicar por las pendientes.`,
    truncated: (shown: number, total: number) =>
      `Se muestran ${shown} de ${total}: acotá el rango de fechas para ver el resto.`,
    pending: 'Pendientes',
    reasons: {
      EXACT: 'Mismo monto y misma fecha',
      NEAR_DATE: 'Mismo monto, con unos días de diferencia',
      REFERENCE: 'La referencia coincide con el comprobante',
    },
    ambiguous: 'Hay más de un candidato con la misma confianza: elegí cuál.',
    noSuggestion: 'Sin movimiento que le corresponda',
    noSuggestionHint: 'Es un gasto que no anotaste. Convertilo en movimiento eligiendo su categoría.',
    confirm: 'Es este',
    confirmOf: (description: string) => `Conciliar «${description}» con este movimiento`,
    ignoreOf: (description: string) => `Ignorar «${description}»`,
    categoryOf: (description: string) => `Categoría para «${description}»`,
    toMovementOf: (description: string) => `Crear el movimiento de «${description}»`,
    unmatch: 'Deshacer',
    unmatchOf: (description: string) => `Deshacer la resolución de «${description}»`,
    resolved: {
      title: 'Ya resueltas',
      hint: 'Lo que ya se concilió o se ignoró en este rango. Deshacer las devuelve a pendientes.',
      matched: 'Conciliada',
      ignored: 'Ignorada',
    },
    ignore: 'Ignorar',
    ignoreHint: 'Para lo que nunca vas a anotar: un traslado interno, una comisión ya registrada.',
    toMovement: 'Crear movimiento',
    category: { label: 'Categoría' },
    empty: {
      title: 'No hay líneas pendientes en este rango',
      description: 'O está todo conciliado, o todavía no importaste el extracto de estos días.',
      action: 'Importar un extracto',
    },
    toast: {
      matched: 'Línea conciliada',
      unmatched: 'Conciliación deshecha',
      ignored: 'Línea ignorada',
      created: 'Movimiento creado y conciliado',
    },
  },

  common: {
    loading: 'Cargando',
    retry: 'Reintentar',
    cancel: 'Cancelar',
    save: 'Guardar',
    edit: 'Editar',
    from: 'Desde',
    to: 'Hasta',
    error: {
      title: 'No se pudieron traer los datos',
      description: 'La API no respondió. Lo importado sigue en el servidor, no se perdió nada.',
    },
  },
} as const
