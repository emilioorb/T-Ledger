// Todo el texto de contabilidad vive acá, no disperso en el JSX. Tono de PRODUCT.md:
// denso, directo, verificable. Cada vista dice qué pregunta responde, no qué es.
export const copy = {
  nav: {
    section: 'Contabilidad',
    accounts: 'Plan de cuentas',
    categories: 'Categorías',
    movements: 'Movimientos',
    journal: 'Asientos',
    ledger: 'Mayor',
    trialBalance: 'Comprobación',
    financialPosition: 'Situación',
    incomeStatement: 'Resultados',
    closing: 'Cierre',
    reportsGroup: 'Reportes',
  },

  common: {
    currency: { label: 'Moneda', hint: 'Los saldos se leen de a una moneda por vez.' },
    from: 'Desde',
    to: 'Hasta',
    at: 'Al',
    period: 'Período',
    apply: 'Ver',
    exportCsv: 'Descargar CSV',
    loading: 'Cargando',
    retry: 'Reintentar',
    cancel: 'Cancelar',
    save: 'Guardar',
    error: {
      title: 'No se pudieron traer los datos',
      description: 'La API no respondió. Lo registrado sigue en el servidor, no se perdió nada.',
    },
  },

  accounts: {
    title: 'Plan de cuentas',
    description:
      'El esqueleto de la contabilidad: seis raíces, una por clase, y debajo las cuentas donde se asienta. El saldo es el de la moneda elegida, acumulado hasta hoy.',
    columns: {
      code: 'Código',
      name: 'Cuenta',
      accountClass: 'Clase',
      status: 'Estado',
      balance: 'Saldo',
    },
    classes: {
      ASSET: 'Activo',
      LIABILITY: 'Pasivo',
      EQUITY: 'Patrimonio',
      INCOME: 'Ingreso',
      COST_OF_REVENUE: 'Costo de ingresos',
      OPERATING_EXPENSE: 'Gasto operativo',
    },
    active: 'Activa',
    inactive: 'Inactiva',
    grouping: 'Agrupadora',
    groupingHint: 'Acumula el saldo de las que cuelgan de ella. No recibe asientos.',
    new: 'Nueva cuenta',
    edit: (name: string) => `Editar ${name}`,
    editShort: 'Editar',
    expand: (name: string) => `Desplegar ${name}`,
    form: {
      createTitle: 'Nueva cuenta',
      editTitle: 'Editar cuenta',
      code: { label: 'Código', hint: 'Numérico. Define el orden y no se cambia después.' },
      name: { label: 'Nombre' },
      accountClass: { label: 'Clase', hint: 'Decide de qué lado suma y en qué reporte aparece.' },
      parentCode: { label: 'Cuelga de', hint: 'Debe ser de la misma clase. Vacío la deja como raíz.' },
      noParent: 'Ninguna, es raíz',
      active: { label: 'Activa', hint: 'Una cuenta inactiva deja de aceptar asientos nuevos.' },
      sortOrder: { label: 'Orden' },
    },
    empty: {
      title: 'El plan de cuentas está vacío',
      description: 'Sin cuentas no hay dónde asentar. La semilla trae las mínimas para arrancar.',
    },
    toast: { created: 'Cuenta creada', updated: 'Cambios guardados' },
  },

  categories: {
    title: 'Categorías',
    description:
      'El puente entre cómo nombrás un gasto y la cuenta que lo recibe. Sin ese puente el movimiento se registra igual, pero no llega a la contabilidad.',
    columns: { name: 'Categoría', kind: 'Tipo', account: 'Cuenta contable', status: 'Estado' },
    kinds: { EXPENSE: 'Gasto', INCOME: 'Ingreso' },
    unmapped: 'Sin cuenta',
    unmappedHint: 'Sus movimientos quedan registrados, pero fuera de los reportes hasta que le asignes una cuenta.',
    new: 'Nueva categoría',
    edit: (name: string) => `Editar ${name}`,
    form: {
      createTitle: 'Nueva categoría',
      editTitle: 'Editar categoría',
      name: { label: 'Nombre' },
      kind: { label: 'Tipo', expense: 'Gasto', income: 'Ingreso' },
      accountCode: { label: 'Cuenta contable', hint: 'Solo cuentas que aceptan asientos.' },
      noAccount: 'Sin cuenta por ahora',
      active: { label: 'Activa' },
    },
    empty: {
      title: 'Todavía no hay categorías',
      description: 'Una categoría por cada cosa que se repite: alquiler, mercado, salario.',
      action: 'Crear la primera',
    },
    confirmDelete: {
      title: '¿Borrar esta categoría?',
      description: (name: string) =>
        `Se borra «${name}». Los movimientos que la usaban quedan sin categoría y sin asiento nuevo.`,
      confirm: 'Borrar',
    },
    toast: { created: 'Categoría creada', updated: 'Cambios guardados', deleted: 'Categoría borrada' },
  },

  movements: {
    title: 'Movimientos',
    description: 'Lo que entró y lo que salió. Cada uno genera su asiento solo.',
    columns: {
      date: 'Fecha',
      counterparty: 'Quién',
      category: 'Categoría',
      account: 'Cuenta de pago',
      amount: 'Monto',
      status: 'Estado',
    },
    filters: {
      kind: { label: 'Tipo', all: 'Gastos e ingresos' },
      status: { label: 'Estado', all: 'Todos', active: 'Vigentes', voided: 'Anulados' },
      category: { label: 'Categoría', all: 'Todas' },
      range: { label: 'Rango' },
    },
    kinds: { EXPENSE: 'Gasto', INCOME: 'Ingreso' },
    statuses: { ACTIVE: 'Vigente', VOIDED: 'Anulado' },
    unposted: 'Sin contabilizar',
    unpostedHint: 'Su categoría no tiene cuenta contable. Asignale una y el asiento se genera al guardar.',
    fixUnposted: 'Asignar cuenta a la categoría',
    viewEntry: 'Ver asiento',
    new: 'Nuevo movimiento',
    edit: (counterparty: string) => `Editar el movimiento de ${counterparty}`,
    void: (counterparty: string) => `Anular el movimiento de ${counterparty}`,
    form: {
      createTitle: 'Nuevo movimiento',
      editTitle: 'Editar movimiento',
      date: { label: 'Fecha' },
      kind: { label: 'Tipo', expense: 'Gasto', income: 'Ingreso' },
      categoryId: { label: 'Categoría' },
      counterparty: { label: 'Quién', hint: 'El proveedor si es gasto, la fuente si es ingreso.' },
      amount: { label: 'Monto' },
      paymentAccountCode: { label: 'Cuenta de pago', hint: 'De dónde salió o a dónde entró la plata.' },
      receiptUrl: { label: 'Comprobante', hint: 'Enlace a la factura o al recibo. Opcional.' },
      editNote: 'Editar no reescribe el asiento: revierte el vigente y emite uno nuevo.',
    },
    empty: {
      title: 'Todavía no hay movimientos',
      description: 'El primero define el arranque del libro. Después el resto se apoya en él.',
      action: 'Registrar el primero',
    },
    noMatches: {
      title: 'Ningún movimiento con esos filtros',
      description: 'Probá con un rango más amplio o quitando el filtro de categoría.',
      action: 'Quitar filtros',
    },
    confirmVoid: {
      title: '¿Anular este movimiento?',
      description:
        'No se borra: se registra el asiento de reversión, y los dos quedan en el mayor con saldo neto cero. Es la forma de dejar rastro de la corrección.',
      confirm: 'Anular y revertir',
    },
    toast: {
      created: 'Movimiento registrado',
      createdUnposted: 'Movimiento registrado, sin asiento: su categoría no tiene cuenta',
      updated: 'Movimiento corregido, con asiento nuevo',
      voided: 'Movimiento anulado y revertido',
      periodClosed: 'Ese mes está cerrado y no acepta asientos',
    },
  },

  journal: {
    title: 'Asientos',
    description:
      'El libro diario. La mayoría los genera un movimiento; el asiento manual es para lo que no es un gasto ni un ingreso simple, como una conversión entre monedas.',
    columns: { date: 'Fecha', description: 'Descripción', account: 'Cuenta', debit: 'Debe', credit: 'Haber' },
    fromMovement: 'De un movimiento',
    reversal: 'Reversión',
    new: 'Asiento manual',
    detail: (id: string) => `Asiento ${id}`,
    form: {
      title: 'Asiento manual',
      date: { label: 'Fecha' },
      description: { label: 'Descripción', hint: 'Qué se registra y por qué.' },
      reference: { label: 'Referencia', hint: 'Número de factura, enlace o comprobante. Opcional.' },
      lines: 'Líneas',
      addLine: 'Agregar línea',
      removeLine: (index: number) => `Quitar la línea ${index}`,
      account: 'Cuenta',
      side: { label: 'Lado', debit: 'Debe', credit: 'Haber' },
      amount: 'Monto',
      currency: 'Moneda',
      balanceByCurrency: 'Suma por moneda',
      balanced: 'Cuadra',
      unbalanced: (currency: string, difference: string) =>
        `En ${currency} faltan ${difference} para que cuadre`,
      balanceHint:
        'Cada moneda cuadra por su cuenta. Una conversión cuadra en colones por un lado y en dólares por el otro.',
      submit: 'Registrar asiento',
    },
    empty: {
      title: 'Ningún asiento en este rango',
      description: 'Los asientos aparecen solos al registrar movimientos. También podés cargar uno a mano.',
    },
    toast: { created: 'Asiento registrado', unbalanced: 'El asiento no cuadra' },
  },

  ledger: {
    title: 'Mayor',
    description: 'Los movimientos de una cuenta en una moneda, con su saldo corrido.',
    account: { label: 'Cuenta', placeholder: 'Elegí una cuenta' },
    columns: {
      date: 'Fecha',
      description: 'Descripción',
      debit: 'Debe',
      credit: 'Haber',
      balance: 'Saldo',
    },
    openingBalance: 'Saldo inicial',
    closingBalance: 'Saldo final',
    openingHint: 'Lo que traía la cuenta antes del primer día del rango.',
    needsAccount: {
      title: 'Elegí una cuenta para ver su mayor',
      description: 'El mayor es siempre una cuenta en una moneda. Sin esas dos cosas no hay nada que mostrar.',
    },
    empty: {
      title: 'Esta cuenta no se movió en el rango',
      description: 'El saldo final es igual al inicial. Probá con un rango más amplio.',
    },
  },

  trialBalance: {
    title: 'Comprobación',
    description: 'Débitos contra créditos, cuenta por cuenta. Si no coinciden, la diferencia sale acá.',
    columns: {
      code: 'Código',
      account: 'Cuenta',
      debits: 'Débitos',
      credits: 'Créditos',
      balance: 'Saldo',
    },
    totals: 'Totales',
    difference: 'Diferencia',
    balanced: 'Cuadra',
    unbalanced: 'No cuadra',
    balancedHint: 'Los débitos igualan a los créditos en esta moneda.',
    unbalancedHint: 'Hay asientos incompletos. Revisá el mayor de las cuentas con saldo raro.',
    viewLedger: (account: string) => `Ver el mayor de ${account}`,
    empty: {
      title: 'Ningún movimiento en este rango',
      description: 'Un período sin asientos cuadra en cero, que es lo correcto pero no dice mucho.',
    },
  },

  financialPosition: {
    title: 'Situación',
    description: 'Qué hay, qué se debe y qué queda, a una fecha.',
    assets: 'Activo',
    liabilities: 'Pasivo',
    equity: 'Patrimonio',
    periodResult: 'Resultado del período',
    periodResultHint:
      'No es una cuenta: es lo que va del año, ingresos menos costos y gastos, sumado al patrimonio. Sin esa línea la identidad no cerraría hasta correr asientos de cierre.',
    identity: 'Activo = Pasivo + Patrimonio',
    balanced: 'La identidad cuadra',
    unbalanced: 'La identidad no cuadra',
    empty: {
      title: 'Todavía no hay nada que mostrar',
      description: 'La situación se arma con los asientos acumulados hasta la fecha elegida.',
    },
  },

  incomeStatement: {
    title: 'Resultados',
    description: 'Lo que entró menos lo que costó, en el rango elegido.',
    income: 'Ingresos',
    costOfRevenue: 'Costo de ingresos',
    operatingExpenses: 'Gastos operativos',
    result: 'Resultado',
    profit: 'Ganancia',
    loss: 'Pérdida',
    empty: {
      title: 'Ningún ingreso ni gasto en el rango',
      description: 'El resultado es cero porque no hubo movimiento, no porque algo falle.',
    },
  },

  closing: {
    title: 'Cierre',
    description:
      'Cerrar un mes lo deja sin aceptar asientos nuevos. Se cierra en orden, y solo cuando no falta nada.',
    columns: {
      period: 'Mes',
      status: 'Estado',
      entries: 'Asientos',
      unposted: 'Sin contabilizar',
      balanced: 'Comprobación',
      blockers: 'Qué falta',
    },
    statuses: { OPEN: 'Abierto', CLOSED: 'Cerrado' },
    ready: 'Listo para cerrar',
    close: (period: string) => `Cerrar ${period}`,
    reopen: (period: string) => `Reabrir ${period}`,
    balanced: 'Cuadra',
    unbalanced: 'No cuadra',
    blockerCodes: {
      ALREADY_CLOSED: 'Ya está cerrado',
      PREVIOUS_PERIOD_OPEN: 'Falta cerrar el mes anterior',
      UNPOSTED_MOVEMENTS: 'Hay movimientos sin asiento',
      TRIAL_BALANCE_UNBALANCED: 'La comprobación no cuadra',
    },
    confirmClose: {
      title: (period: string) => `¿Cerrar ${period}?`,
      description:
        'Después del cierre, ningún asiento con fecha de ese mes entra. Se puede reabrir, y reabrir arrastra los meses posteriores.',
      confirm: 'Cerrar el mes',
    },
    confirmReopen: {
      title: (period: string) => `¿Reabrir ${period}?`,
      description: (count: number) =>
        count === 0
          ? 'Vuelve a aceptar asientos con fecha de ese mes.'
          : count === 1
            ? 'También se reabre 1 mes posterior: un mes abierto no puede quedar debajo de uno cerrado.'
            : `También se reabren ${count} meses posteriores: un mes abierto no puede quedar debajo de uno cerrado.`,
      confirm: 'Reabrir',
    },
    empty: {
      title: 'Todavía no hay meses con actividad',
      description: 'La lista se arma sola con los meses que tienen movimientos o asientos.',
    },
    toast: { closed: 'Mes cerrado', reopened: 'Mes reabierto', blocked: 'El mes todavía no se puede cerrar' },
  },
} as const
