// Tono de PRODUCT.md: denso, directo, verificable. El presupuesto no regaña ni felicita:
// dice cuánto se asignó, cuánto se fue y de dónde sale ese número.
export const copy = {
  nav: {
    section: 'Plan',
    budget: 'Presupuesto',
    models: 'Modelos',
    goals: 'Metas',
  },

  budget: {
    title: 'Presupuesto',
    description:
      'Cuánto se asignó a cada cubeta este mes y cuánto se fue de verdad. El gasto no se declara: sale de los asientos.',
    month: 'Mes',
    currency: 'Moneda',
    income: 'Ingreso del mes',
    incomeHint: 'Es el único dato estimado: lo demás sale de lo que ya ocurrió.',
    editIncome: 'Declarar ingreso',
    saveIncome: 'Guardar ingreso',
    consumed: 'Consumido',
    surplus: 'Sin asignar',
    surplusHint: 'Lo que queda del ingreso después de lo que ya se gastó.',
    columns: {
      bucket: 'Cubeta',
      allocated: 'Asignado',
      consumed: 'Consumido',
      deviation: 'Diferencia',
    },
    status: {
      OVER: 'Se pasó',
      ON_TRACK: 'En línea',
      UNDER: 'Por debajo',
    },
    overBy: (amount: string) => `${amount} por encima de lo asignado`,
    underBy: (amount: string) => `${amount} sin usar`,
    viewMovements: (bucket: string) => `Ver los movimientos de ${bucket}`,
    chartLabel: 'Asignado contra consumido, cubeta por cubeta.',
    savingsBucket: 'Ahorro',
    noModel: {
      title: 'Todavía no hay un modelo de presupuesto activo',
      description:
        'Un modelo dice cómo se reparte el ingreso: 50/30/20, 70/20/10 o el que se te ocurra. Sin uno activo no hay contra qué medir el mes.',
      action: 'Crear un modelo',
    },
    noIncome: {
      title: 'Falta declarar el ingreso de este mes',
      description:
        'Sin ingreso, las cubetas se reparten sobre cero. El gasto ya está contado: lo que falta es contra cuánto medirlo.',
      action: 'Declarar el ingreso',
    },
    toast: { incomeSaved: 'Ingreso declarado' },
  },

  models: {
    title: 'Modelos de presupuesto',
    description:
      'Cómo se reparte el ingreso entre cubetas. Los porcentajes son datos: cambiarlos no toca código.',
    active: 'Activo',
    activate: 'Activar',
    activeHint: 'Solo uno puede estar activo. Activar este desactiva el que estaba.',
    new: 'Nuevo modelo',
    edit: (name: string) => `Editar ${name}`,
    form: {
      createTitle: 'Nuevo modelo',
      editTitle: 'Editar modelo',
      name: { label: 'Nombre', hint: 'Cómo lo reconocés. Por ejemplo, 50/30/20.' },
      buckets: 'Cubetas',
      addBucket: 'Agregar cubeta',
      removeBucket: (name: string) => `Quitar ${name}`,
      bucketName: 'Nombre',
      percentage: 'Porcentaje',
      isSavings: 'Es la cubeta de ahorro',
      isSavingsHint: 'Los abonos extraordinarios a deudas caen acá. Tiene que haber exactamente una.',
      accounts: 'Cuentas de gasto',
      accountsHint: 'De estas cuentas sale el consumo de la cubeta. Sin cuentas, consume cero.',
      total: 'Suma',
      balanced: 'Suma 100',
      unbalanced: (total: string) => `Suma ${total}: falta llegar a 100`,
      activate: 'Dejarlo activo al guardar',
      submit: 'Guardar modelo',
    },
    empty: {
      title: 'Todavía no hay modelos',
      description: 'El primero define cómo se reparte tu ingreso. Después se cambia cuando quieras.',
      action: 'Crear el primero',
    },
    toast: { created: 'Modelo creado', updated: 'Cambios guardados' },
  },

  common: {
    loading: 'Cargando',
    retry: 'Reintentar',
    cancel: 'Cancelar',
    save: 'Guardar',
    error: {
      title: 'No se pudieron traer los datos',
      description: 'La API no respondió. Lo registrado sigue en el servidor, no se perdió nada.',
    },
  },
} as const
