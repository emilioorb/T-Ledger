import { etiquetas } from '@/features/shell/etiquetas'
// Lo que una meta responde no es «cuánto llevo» sino «¿llego?». El copy pone esa
// pregunta adelante, y el porcentaje atrás.
export const copy = {
  goals: {
    title: etiquetas.metas,
    description: 'Cuánto falta, cuánto hay que poner por mes y si al ritmo actual se llega.',
    columns: {
      name: 'Meta',
      target: 'Objetivo',
      pace: 'Ritmo',
      contributed: 'Aportado',
      required: 'Por mes',
      desired: 'La querés en',
    },
    projected: 'Al ritmo de hoy llega',
    onTrack: 'Llega a tiempo',
    late: 'Llega tarde',
    noPace: 'Sin ritmo todavía',
    noPaceHint: 'Con el primer aporte se puede proyectar. Antes sería inventar una fecha.',
    reached: 'Alcanzada',
    reachedNote: 'Objetivo cumplido.',
    requiredHint: 'Lo que falta, repartido en los meses que quedan hasta la fecha deseada.',
    paceHint: 'El promedio mensual desde el primer aporte.',
    lateBy: (months: number) =>
      months === 1
        ? 'Un mes después de la fecha deseada'
        : `${months} meses después de la fecha deseada`,
    new: 'Nueva meta',
    edit: (name: string) => `Editar ${name}`,
    delete: (name: string) => `Borrar ${name}`,
    contribute: 'Aportar',
    deleteShort: 'Borrar',
    paused: 'En pausa',
    pausedNote: 'No pide aporte mientras esté en pausa.',
    pause: 'Pausar',
    resume: 'Reactivar',
    pauseLabel: (name: string) => `Pausar ${name}`,
    resumeLabel: (name: string) => `Reactivar ${name}`,
    progressLabel: (contributed: string, target: string) => `${contributed} aportados de ${target}`,
    detail: {
      missing: 'Faltan',
      missingSuffix: 'para el objetivo.',
    },
    form: {
      createTitle: 'Nueva meta',
      editTitle: 'Editar meta',
      name: { label: 'Nombre', hint: 'Para qué es. Por ejemplo, Europa.' },
      target: { label: 'Objetivo' },
      desiredDate: { label: 'Fecha deseada', hint: 'Cuándo querés tenerlo.' },
      priority: { label: 'Prioridad', hint: 'Menor número, primero en la lista.' },
      accountCode: {
        label: 'Cuenta de ahorro',
        hint: 'Dónde se guarda la plata. Sin ella no se pueden registrar aportes.',
      },
      noAccount: 'Sin cuenta',
      submit: 'Guardar meta',
    },
    contributionForm: {
      title: 'Nuevo aporte',
      // Aportar no es gastar: la plata cambia de cuenta y el patrimonio queda igual. Por eso
      // el formulario pregunta de dónde sale, y por eso el asiento lo dice.
      description: 'Aportar mueve la plata de una cuenta a la de la meta. No es un gasto.',
      date: { label: 'Fecha' },
      amount: { label: 'Monto', hint: 'En la misma moneda del objetivo.' },
      from: { label: 'De qué cuenta sale' },
      submit: 'Registrar aporte',
      needsAccount:
        'Esta meta no tiene cuenta de ahorro. Elegí una al editarla y después registrá el aporte: si no, la meta diría que ya ahorraste y los libros que la plata sigue en caja.',
      editGoal: 'Editar la meta',
    },
    history: {
      title: 'Aportes',
      columns: { date: 'Fecha', amount: 'Monto' },
      empty: 'Todavía no hay aportes.',
    },
    empty: {
      title: 'Todavía no hay metas',
      description:
        'Una meta convierte un deseo en una fecha y un aporte mensual. Sin eso es un monto suelto.',
      action: 'Crear la primera',
    },
    confirmDelete: {
      title: '¿Borrar esta meta?',
      description: (name: string) =>
        `Se borra «${name}» con todos sus aportes. No se puede deshacer.`,
      confirm: 'Borrar',
    },
    toast: {
      created: 'Meta creada',
      updated: 'Cambios guardados',
      deleted: 'Meta borrada',
      contributed: 'Aporte registrado',
      reached: (name: string) => `«${name}» quedó alcanzada`,
      invalidAmount: 'El monto no se pudo leer',
    },
  },

  common: {
    edit: 'Editar',
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
