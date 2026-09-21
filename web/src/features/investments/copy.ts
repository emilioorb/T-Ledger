// Una inversión no amortiza: capitaliza. Lo que importa es cuánto vale hoy, cuánto de eso
// es interés, y cuándo vuelve a estar disponible.
export const copy = {
  investments: {
    title: 'Inversiones',
    description: 'Cuánto pusiste, cuánto vale hoy y cuándo vuelve a estar disponible.',
    columns: {
      name: 'Inversión',
      invested: 'Capital',
      value: 'Valor hoy',
      interest: 'Interés ganado',
      rate: 'Tasa',
      matures: 'Vence',
    },
    kinds: { FIXED_TERM: 'A plazo', OPEN: 'Abierta' },
    valueToday: 'Valor de hoy',
    investedShort: 'Pusiste',
    earnedShort: 'ganados',
    noMaturity: 'Sin vencimiento',
    termLabel: (opened: string, matures: string) => `Plazo del ${opened} al ${matures}`,
    matured: 'Vencida',
    maturedHint: 'El capital ya está disponible: decidir qué hacer con él es el siguiente paso.',
    openHint: 'Sin vencimiento: sigue capitalizando mientras no la retires.',
    monthsLeft: (months: number) =>
      months === 1 ? 'Vence el mes que viene' : `Vence en ${months} meses`,
    new: 'Nueva inversión',
    edit: (name: string) => `Editar ${name}`,
    delete: (name: string) => `Borrar ${name}`,
    contribute: 'Agregar capital',
    detail: {
      fixedTermHint: 'Capitaliza hasta el vencimiento; ahí el capital vuelve a estar disponible.',
      history: 'Aportes de capital',
      curve: 'Cómo crece',
      curveHint: 'El valor proyectado mes a mes. La distancia con el capital es el interés.',
      curveLabel: 'Valor proyectado contra capital invertido, mes a mes',
    },
    form: {
      createTitle: 'Nueva inversión',
      editTitle: 'Editar inversión',
      name: { label: 'Nombre' },
      principal: { label: 'Capital' },
      annualRate: { label: 'Tasa anual', hint: 'En porcentaje. Cero es válido.' },
      compounding: {
        label: 'Capitalización',
        monthly: 'Nominal mensual',
        annual: 'Efectiva anual',
      },
      openedAt: { label: 'Apertura' },
      kind: { label: 'Tipo', fixedTerm: 'A plazo', open: 'Abierta' },
      maturesAt: { label: 'Vencimiento', hint: 'Obligatorio para una inversión a plazo.' },
      accountCode: {
        label: 'Cuenta',
        hint: 'Dónde queda el capital. Sin ella no se puede agregar capital.',
      },
      noAccount: 'Sin cuenta',
      submit: 'Guardar inversión',
    },
    contributionForm: {
      title: 'Agregar capital',
      // Agregar capital no es ganar plata: sale de una cuenta y entra a la inversión. El
      // formulario pregunta de dónde sale, y el asiento lo deja escrito.
      description: 'El capital sale de una cuenta y entra a la inversión. No es una ganancia.',
      date: { label: 'Fecha', hint: 'El aporte capitaliza desde este día, no desde la apertura.' },
      amount: { label: 'Monto' },
      from: { label: 'De qué cuenta sale' },
      submit: 'Registrar aporte',
      needsAccount:
        'Esta inversión no tiene cuenta. Elegí una al editarla y después agregá el capital: si no, la inversión diría que creció y los libros que la plata sigue en el banco.',
      editInvestment: 'Editar la inversión',
    },
    empty: {
      title: 'Todavía no hay inversiones',
      description: 'Con el capital, la tasa y la fecha alcanza para saber cuánto vale a futuro.',
      action: 'Registrar la primera',
    },
    confirmDelete: {
      title: '¿Borrar esta inversión?',
      description: (name: string) => `Se borra «${name}» con sus aportes. No se puede deshacer.`,
      confirm: 'Borrar',
    },
    toast: {
      created: 'Inversión registrada',
      updated: 'Cambios guardados',
      deleted: 'Inversión borrada',
      contributed: 'Capital agregado',
      invalidAmount: 'El monto no se pudo leer',
    },
  },

  common: {
    edit: 'Editar',
    loading: 'Cargando',
    retry: 'Reintentar',
    cancel: 'Cancelar',
    error: {
      title: 'No se pudieron traer los datos',
      description: 'La API no respondió. Lo registrado sigue en el servidor, no se perdió nada.',
    },
  },
} as const
