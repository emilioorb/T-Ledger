// Todo el texto de la funcionalidad vive acá, no disperso en el JSX: así se revisa de
// una sola lectura. Tono de PRODUCT.md: denso, directo, verificable. Sin rayas largas.
export const copy = {
  nav: {
    section: 'Dinero',
    debts: 'Deudas',
    payoffPlan: 'Plan de pago',
    lightTheme: 'Tema claro',
    darkTheme: 'Tema oscuro',
  },

  tabs: {
    borrowed: 'Lo que debo',
    lent: 'Lo que me deben',
  },

  list: {
    columns: {
      name: 'Deuda',
      counterparty: 'Contraparte',
      balance: 'Saldo',
      payment: 'Cuota',
      payoffDate: 'Libre en',
    },
    lentColumns: {
      name: 'Préstamo',
      counterparty: 'A quién',
    },
    loading: 'Cargando deudas',
    truncated: (mostradas: number, total: number) =>
      `Se muestran ${mostradas} de ${total}. El resto queda fuera de esta página.`,
  },

  empty: {
    borrowed: {
      title: 'Todavía no hay ninguna deuda cargada',
      description:
        'Con el capital, la tasa y el plazo alcanza para saber en qué mes se libera cada cuota y cuánto interés cuesta llegar hasta ahí.',
      action: 'Cargar la primera deuda',
    },
    lent: {
      title: 'Todavía no prestaste nada',
      description:
        'Un préstamo otorgado usa la misma tabla que una deuda, con el flujo al revés. No consume presupuesto: lo alimenta.',
      action: 'Registrar un préstamo',
    },
    payoffPlan: {
      title: 'No hay deudas que ordenar',
      description: 'El plan de pago necesita al menos una deuda vigente para decidir a cuál mandar el excedente.',
      action: 'Cargar una deuda',
    },
  },

  form: {
    createTitle: 'Nueva deuda',
    editTitle: 'Editar deuda',
    fields: {
      direction: { label: 'Dirección', borrowed: 'La debo', lent: 'La presté' },
      name: { label: 'Nombre', hint: 'Cómo la reconocés en la lista. Por ejemplo, CONAPE.' },
      counterparty: { label: 'Contraparte', hint: 'A quién se le paga, o quién debe pagar.' },
      principal: { label: 'Capital', hint: 'El monto original, no el saldo de hoy.' },
      currency: { label: 'Moneda' },
      annualRate: { label: 'Tasa anual', hint: 'En porcentaje. Cero es una tasa válida: una deuda familiar sin interés.' },
      compounding: { label: 'Capitalización', monthly: 'Nominal mensual', annual: 'Efectiva anual' },
      termMonths: { label: 'Plazo', hint: 'En meses.' },
      startDate: { label: 'Inicio', hint: 'La primera cuota vence un mes después.' },
      kind: {
        label: 'Sistema',
        french: 'Francés, cuota fija',
        fixedPrincipal: 'Capital fijo, cuota decreciente',
        interestFree: 'Sin interés',
      },
      budgetBucket: { label: 'Cubeta de presupuesto', hint: 'De dónde sale la cuota cada mes.' },
    },
    submitCreate: 'Guardar deuda',
    submitEdit: 'Guardar cambios',
    cancel: 'Cancelar',
  },

  schedule: {
    title: 'Tabla de amortización',
    caption: 'Cada cuota con su desglose entre capital e interés, y el saldo que queda después de pagarla.',
    columns: {
      number: 'Cuota',
      dueDate: 'Vence',
      payment: 'Pago',
      principal: 'Capital',
      interest: 'Interés',
      balance: 'Saldo',
    },
    totalInterest: 'Interés total',
    totalPaid: 'Total pagado',
    lastInstallment: 'La última cuota absorbe el residuo de redondeo, por eso difiere en céntimos.',
    empty: 'Esta deuda no tiene cuotas que mostrar.',
    chartLabel: 'Saldo de la deuda cuota a cuota, desde el capital original hasta cero.',
  },

  simulator: {
    title: 'Abonar de más',
    description: 'Cuánto interés se ahorra y cuántos meses se ganan poniendo un monto extra.',
    amount: { label: 'Monto del abono' },
    afterInstallment: { label: 'Después de la cuota', hint: 'El número de cuota tras la cual entra el abono.' },
    mode: {
      label: 'Qué hacer con el ahorro',
      reduceTerm: 'Acortar el plazo',
      reduceTermHint: 'La cuota se mantiene y la deuda termina antes.',
      reducePayment: 'Bajar la cuota',
      reducePaymentHint: 'El plazo se mantiene y cada mes se paga menos.',
    },
    submit: 'Simular',
    results: {
      title: 'Con el abono',
      interestSaved: 'Interés que se ahorra',
      monthsSaved: 'Meses que se ganan',
      newPayoffDate: 'Nueva fecha de salida',
      totalPaid: 'Total a pagar, abono incluido',
      baselineTotal: 'Sin abono se pagaría',
      months: (n: number) => (n === 1 ? '1 mes' : `${n} meses`),
    },
  },

  payoffPlan: {
    title: 'Plan de pago',
    description: 'A cuál deuda conviene mandar el excedente del mes.',
    strategy: { label: 'Criterio' },
    avalanche: {
      name: 'Avalancha',
      explanation: 'Primero la tasa más alta. Es lo que menos interés cuesta en total.',
    },
    snowball: {
      name: 'Bola de nieve',
      explanation: 'Primero el saldo más chico. Cuesta algo más, y cierra deudas antes.',
    },
    columns: {
      position: 'Orden',
      name: 'Deuda',
      annualRate: 'Tasa',
      balance: 'Saldo',
      payment: 'Cuota',
    },
    lentNote: 'Los préstamos otorgados quedan fuera: no compiten por el excedente, lo alimentan.',
  },

  detail: {
    counterparty: 'Contraparte',
    principal: 'Capital',
    rate: 'Tasa anual',
    term: 'Plazo',
    payoffDate: 'Libre en',
    monthlyPayment: 'Cuota',
    budgetBucket: 'Cubeta',
    edit: 'Editar',
    delete: 'Borrar',
  },

  error: {
    title: 'No se pudieron traer los datos',
    description: 'La API no respondió. Los datos siguen en el servidor, no se perdió nada.',
    retry: 'Reintentar',
  },

  toast: {
    created: 'Deuda guardada',
    updated: 'Cambios guardados',
    deleted: 'Deuda borrada',
    invalidAmount: 'El monto no se pudo leer',
  },
} as const
