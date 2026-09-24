// Cargar la cubeta en plata y que el modelo guarde el porcentaje que le corresponde sobre el
// ingreso del mes. Vive aparte del resto del copy de presupuesto porque ese lo importa la barra
// lateral, y esto solo lo usa el formulario de modelos: acá no pesa en el bundle de entrada.
export const copyMontos = {
  modo: {
    label: 'Cargar las cubetas en',
    porcentaje: 'Porcentaje',
    monto: 'Monto',
  },
  monto: 'Monto',
  enPorcentaje: (porcentaje: string) => `= ${porcentaje} % del ingreso de este mes`,
  montosSuman: (suma: string, ingreso: string) => `Los montos suman ${suma} de ${ingreso}.`,
  sinIngreso: 'Para cargar montos, declará primero el ingreso de este mes en Presupuesto.',
} as const
