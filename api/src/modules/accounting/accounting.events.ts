// Lo que contabilidad avisa y otros escuchan. Vive aparte, sin importar nada, por lo mismo que
// los tokens de identidad: un archivo que no importa nada no puede cerrar un ciclo.

// Se emite **dentro** de la transacción que anula el movimiento, antes de guardarla. Quien
// escucha puede acompañar la anulación —deudas deshace el pago de una cuota— o frenarla
// tirando: la transacción entera se revierte y el movimiento queda como estaba.
export const MOVIMIENTO_ANULANDOSE = 'movimiento.anulandose'

export interface MovimientoAnulandose {
  movementId: string
}
