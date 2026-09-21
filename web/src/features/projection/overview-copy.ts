// El panel no resume: apunta. Cada línea nombra una cosa que pasa y lleva a resolverla.
export const copy = {
  overview: {
    title: 'Hoy',
    greeting: 'Esto es lo que está pasando con tu plata.',
    month: (month: string) => `En ${month}`,
    surplus: 'Queda libre este mes',
    surplusNegative: 'Este mes no cierra',
    overBucket: (name: string) => `${name} se pasó de lo asignado`,
    overBucketNone: 'Ninguna cubeta se pasó',
    nextFreed: (name: string, month: string) => `La cuota de ${name} se libera en ${month}`,
    nextFreedNone: 'Ninguna cuota se libera en el horizonte proyectado',
    nearestGoal: (name: string, date: string) => `${name} llega en ${date}`,
    nearestGoalLate: (name: string) => `${name} va tarde para su fecha`,
    nearestGoalNone: 'Todavía no hay metas con ritmo para proyectar',
    maturing: (name: string, month: string) => `${name} vence en ${month}`,
    goTo: {
      budget: 'Ver el presupuesto',
      projection: 'Ver la proyección',
      goals: 'Ver las metas',
      movements: 'Registrar un movimiento',
    },
    empty: {
      title: 'Todavía no hay nada cargado',
      description:
        'Registrá un movimiento, cargá una deuda o creá una meta. El panel se arma con lo que vayas anotando.',
      action: 'Registrar el primer movimiento',
    },
  },
} as const
