import { etiquetas } from '@/features/shell/etiquetas'
// La pregunta que originó el sistema: en qué mes cambia cada cosa. El copy va detrás de
// esa pregunta, no del total.
export const copy = {
  projection: {
    title: etiquetas.proyeccion,
    description: 'Mes a mes: lo que entra, lo que ya está comprometido y lo que queda libre.',
    horizon: { label: 'Horizonte', months: (n: number) => `${n} meses` },
    // El rótulo de la tarjeta no puede ser la misma palabra que el filtro de arriba: el
    // filtro elige cuántos meses se proyectan y la tarjeta dice qué pasa en ellos.
    outlook: 'El primer mes que no cierra',
    currency: 'Moneda',
    columns: {
      month: 'Mes',
      income: 'Entra',
      committed: 'Comprometido',
      surplus: 'Queda',
    },
    breakdown: {
      show: 'Ver el desglose',
      hide: 'Ocultar el desglose',
      hint: 'De qué se compone lo comprometido de cada mes. Casi no cambia de un mes al otro.',
    },
    detail: {
      debtPayments: 'Cuotas de deudas',
      lentCollections: 'Cobros de préstamos',
      goalContributions: 'Aportes a metas',
      maturingInvestments: 'Inversiones que vencen',
    },
    estimatedIncome: 'Ingreso supuesto',
    estimatedIncomeHint:
      'Arrastrado del último mes declarado. Declaralo en el presupuesto para afinar la proyección.',
    freed: 'Se libera',
    freedNote: (name: string) => `Termina la cuota de ${name}`,
    negative: 'El mes no cierra',
    negativeHint:
      'Lo comprometido pasa lo que entra. Enterarse con meses de anticipación es el punto.',
    firstNegative: (month: string) => `El primer mes que no cierra es ${month}`,
    allClear: 'Ningún mes queda en negativo en este horizonte',
    empty: {
      title: 'Todavía no hay nada que proyectar',
      description:
        'La proyección se arma con tus deudas, metas e inversiones, y con el ingreso que declarás cada mes.',
    },
  },

  common: {
    loading: 'Cargando',
    retry: 'Reintentar',
    error: {
      title: 'No se pudieron traer los datos',
      description: 'La API no respondió. Lo registrado sigue en el servidor, no se perdió nada.',
    },
  },
} as const
