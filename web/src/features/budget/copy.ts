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
    surplus: 'Sin gastar',
    surplusHint: 'El ingreso menos lo que ya se fue. No es plata sin asignar: el modelo reparte el 100 %.',
    monthState: 'El mes',
    noOverBucket: 'Ninguna cubeta se pasó',
    noOverHint: 'Todo lo consumido cabe dentro de lo que el modelo asignó.',
    overBucket: (name: string) => `${name} se pasó`,
    overHint: 'Por encima de lo que el modelo le asignó a esa cubeta este mes.',
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
    viewMovements: (bucket: string) => `Ver los movimientos de ${bucket}`,
    savingsBucket: 'Ahorro',
    allocatedOf: (amount: string) => `de ${amount} asignados`,
    barLabel: (name: string, consumed: string, allocated: string) =>
      `${name}: ${consumed} consumido de ${allocated} asignado`,
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
      unbalancedHint: 'Tiene que llegar a 100 para poder guardar.',
      savingsMissing: 'Marcá exactamente una cubeta de ahorro para poder guardar.',
      inColones: (amount: string) => `≈ ${amount} sobre el ingreso de este mes`,
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
    edit: 'Editar',
    error: {
      title: 'No se pudieron traer los datos',
      description: 'La API no respondió. Lo registrado sigue en el servidor, no se perdió nada.',
    },
  },
} as const
