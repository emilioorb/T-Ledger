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
    matured: 'Vencida',
    maturedHint: 'El capital ya está disponible: decidir qué hacer con él es el siguiente paso.',
    openHint: 'Sin vencimiento: sigue capitalizando mientras no la retires.',
    monthsLeft: (months: number) =>
      months === 1 ? 'Vence el mes que viene' : `Vence en ${months} meses`,
    new: 'Nueva inversión',
    edit: (name: string) => `Editar ${name}`,
    delete: (name: string) => `Borrar ${name}`,
    contribute: 'Agregar capital',
    form: {
      createTitle: 'Nueva inversión',
      editTitle: 'Editar inversión',
      name: { label: 'Nombre' },
      principal: { label: 'Capital' },
      annualRate: { label: 'Tasa anual', hint: 'En porcentaje. Cero es válido.' },
      compounding: { label: 'Capitalización', monthly: 'Nominal mensual', annual: 'Efectiva anual' },
      openedAt: { label: 'Apertura' },
      kind: { label: 'Tipo', fixedTerm: 'A plazo', open: 'Abierta' },
      maturesAt: { label: 'Vencimiento', hint: 'Obligatorio para una inversión a plazo.' },
      submit: 'Guardar inversión',
    },
    contributionForm: {
      title: 'Agregar capital',
      date: { label: 'Fecha', hint: 'El aporte capitaliza desde este día, no desde la apertura.' },
      amount: { label: 'Monto' },
      submit: 'Registrar aporte',
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
    loading: 'Cargando',
    retry: 'Reintentar',
    cancel: 'Cancelar',
    error: {
      title: 'No se pudieron traer los datos',
      description: 'La API no respondió. Lo registrado sigue en el servidor, no se perdió nada.',
    },
  },
} as const
