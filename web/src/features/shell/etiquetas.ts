// Los nombres de cada lugar de la app. Los usan el menú, la miga, el título de la pestaña y los
// atajos, que van en el bundle de entrada: si cada uno importara el copy entero de cada pantalla
// para sacar un título, decenas de kilobytes de texto que nadie ve en la portada viajarían con
// ella. Viven acá, en un módulo chico, y el copy de cada pantalla los toma de acá: un solo lugar
// para cada nombre.
export const etiquetas = {
  contabilidad: {
    section: 'Contabilidad',
    accounts: 'Plan de cuentas',
    categories: 'Categorías',
    movements: 'Movimientos',
    journal: 'Asientos',
    ledger: 'Mayor',
    trialBalance: 'Comprobación',
    financialPosition: 'Situación',
    netWorth: 'Patrimonio',
    incomeStatement: 'Resultados',
    closing: 'Cierre',
    reportsGroup: 'Reportes',
  },
  banco: {
    section: 'Banco',
    accounts: 'Cuentas',
    import: 'Importar',
    reconciliation: 'Conciliación',
  },
  plan: {
    section: 'Plan',
    budget: 'Presupuesto',
    models: 'Modelos',
    goals: 'Metas',
  },
  dinero: {
    section: 'Dinero',
    debts: 'Deudas',
    payoffPlan: 'Plan de pago',
  },
  tema: {
    lightTheme: 'Tema claro',
    darkTheme: 'Tema oscuro',
  },
  metas: 'Metas',
  inversiones: 'Inversiones',
  proyeccion: 'Proyección',
  tablero: 'Dashboard',
  guia: 'Guía',
  registro: 'Registro',
  cuenta: 'Tu cuenta',
  libro: 'El libro',
  entrar: 'Entrar',
  crearCuenta: 'Crear cuenta',
  portada: 'Contabilidad personal de partida doble',
} as const
