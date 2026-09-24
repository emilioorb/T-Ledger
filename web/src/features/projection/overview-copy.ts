import { etiquetas } from '@/features/shell/etiquetas'
// El panel no resume: apunta. Cada línea nombra una cosa que pasa y lleva a resolverla.
export const copy = {
  overview: {
    title: etiquetas.tablero,
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
    stats: {
      netWorth: 'Patrimonio',
      netWorthHint: 'Lo que tenés menos lo que debés.',
      // Contra el cierre del mes anterior, que es lo único con lo que se puede comparar sin
      // inventar nada: un mes a medias contra otro completo no dice nada.
      vsLastMonth: 'vs mes pasado',
      sameAsLastMonth: 'Igual que el mes pasado',
      newThisMonth: 'Nuevo este mes',
      debtOutstanding: 'Lo que falta pagar de las deudas vigentes.',
      surplus: 'Queda libre este mes',
      surplusNegative: 'Este mes no cierra',
      saved: 'Ahorrado este mes',
      savedHint: 'Lo que entró a metas e inversiones.',
      debt: 'Lo que debés',
      debtHint: 'Saldo de las deudas vigentes.',
      debtFree: (date: string) => `Libre el ${date}.`,
      invested: 'Invertido',
      investedHint: 'Valor de hoy de lo que pusiste a rendir.',
    },
    chart: {
      projection: 'Lo que queda libre, mes a mes',
      projectionHint:
        'Lo que entra menos lo que ya está comprometido. Debajo de la línea, el mes no cierra.',
      projectionOtherCurrency:
        'Solo en colones: lo que tenés en dólares no suma acá. Se ve en Proyección, eligiendo USD.',
      surplus: 'Queda libre',
      budget: (month: string) => `Presupuesto de ${month}`,
      budgetHint: 'Lo gastado contra lo asignado en cada cubeta.',
      allocated: 'Asignado',
      consumed: 'Gastado',
      noBudget: 'Este mes todavía no tiene modelo de presupuesto.',
    },
    trend: {
      title: 'Entró y salió, mes a mes',
      hint: 'Los últimos seis meses cerrados, según el libro.',
      label: 'Ingresos contra gastos de los últimos seis meses',
    },
    balances: {
      title: 'Dónde está la plata',
      hint: 'Saldo de cada caja y cuenta a hoy.',
      empty: 'Todavía no hay saldos en ninguna cuenta.',
    },
    recent: {
      title: 'Últimos movimientos',
      hint: 'Lo último que anotaste, sin importar el mes.',
      empty: 'Todavía no anotaste movimientos.',
    },
    closing: {
      pending: (month: string) => `${month} sigue abierto`,
      action: 'Ir al cierre',
    },
    expenses: {
      title: 'En qué se fue el mes',
      hint: 'Los gastos del mes repartidos por categoría.',
      empty: 'Este mes todavía no tiene gastos registrados.',
      label: 'Gastos del mes por categoría',
      uncategorized: 'Sin categoría',
      total: 'Total del mes',
      rest: 'Otras',
    },
    goals: {
      title: 'Metas',
      hint: 'Las tres más cercanas por fecha deseada.',
      empty: 'Todavía no hay metas.',
      of: 'de',
    },
    attention: {
      title: 'Qué atender',
      hint: 'Lo que cambia si no hacés nada.',
    },
    goTo: {
      budget: 'Ver el presupuesto',
      projection: 'Ver la proyección',
      goals: 'Ver las metas',
      movements: 'Registrar un movimiento',
      movementsList: 'Ver los movimientos',
      accounts: 'Ver el plan de cuentas',
      results: 'Ver los resultados',
    },
    error: {
      title: 'El panel no se pudo armar',
      description:
        'Alguna de las consultas no respondió. Sin ellas, cualquier frase acá sería una suposición sobre tu plata.',
      retry: 'Reintentar',
    },
    empty: {
      title: 'Todavía no hay nada cargado',
      description:
        'Registrá un movimiento, cargá una deuda o creá una meta. El panel se arma con lo que vayas anotando.',
      action: 'Registrar el primer movimiento',
    },
  },
} as const
