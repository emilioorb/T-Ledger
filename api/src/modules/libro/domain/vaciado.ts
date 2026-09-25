// Qué se va y qué se queda cuando alguien vacía su libro.
//
// Las dos listas están escritas a mano y son la definición de «vaciar»: se borra lo que
// **pasó** —la plata que entró, salió, se debe o se guardó— y se conserva lo que sirve para
// volver a empezar —el plan de cuentas, las categorías, los modelos de presupuesto, las
// cuentas de banco—. Vaciar es quedarse con la libreta en blanco, no con una caja vacía.
//
// El rastro de auditoría no se toca, y esa no es una preferencia: el ADR-004 dice que el
// registro es de solo agregar. Quien vacía queda registrado vaciando, con el resumen de lo
// que se llevó puesto.
//
// Escrito así, como datos, porque hay un test que compara estas dos listas contra el esquema
// y falla si aparece una tabla nueva que nadie clasificó. Sin eso, la tabla que alguien
// agregue el mes que viene sobrevive al vaciado en silencio, y el libro «vacío» arranca con
// datos del anterior adentro.
export const SE_BORRA = [
  // El orden importa: las hijas antes que las madres, o la base rechaza el borrado.
  'journalLine',
  'journalEntry',
  'movement',
  'accountingPeriod',
  'goalContribution',
  'goal',
  'investmentContribution',
  'investment',
  'debtPayment',
  'debt',
  'budgetIncome',
  'bankLine',
  'bankStatement',
  // El progreso de la bienvenida nombra asientos que el vaciado se lleva: se va con ellos.
  'onboardingStep',
] as const

export const SE_CONSERVA = [
  // Catálogo y configuración: lo que se tardó en armar y no es plata.
  'account',
  'category',
  'budgetModel',
  'budgetBucket',
  'importProfile',
  'bankAccount',
  // Y el registro, que no se borra nunca (ADR-004).
  'auditLog',
] as const

export type TablaQueSeBorra = (typeof SE_BORRA)[number]

// Cuánto se llevó el vaciado, por tabla. Va al rastro y a la pantalla: «se borraron 148
// movimientos» es lo único que convierte un botón irreversible en algo comprobable.
export type ResumenDeVaciado = Partial<Record<TablaQueSeBorra, number>>

export const totalBorrado = (resumen: ResumenDeVaciado): number =>
  Object.values(resumen).reduce((total, cuantos) => total + cuantos, 0)
