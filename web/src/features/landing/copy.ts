// El texto de la única pantalla que ve alguien que todavía no entró. Vive acá por la misma
// razón que el resto: el titular se va a corregir diez veces, y buscarlo entre el JSX es
// buscarlo entre reglas y grillas.
export const copy = {
  // Lo que la pestaña dice mientras la landing está abierta. No lleva el nombre de la app
  // adelante: `documentTitleFor` ya lo agrega al final.
  tab: 'Contabilidad personal de partida doble',
  // No dice «contabilidad»: lo demuestra en vez de anunciarlo, y la palabra espanta a quien
  // no la usa. La bajada sí la dice, para quien la estaba buscando.
  titular: 'Vos anotás una cosa. El libro escribe dos.',
  bajada: 'Finanzas personales con contabilidad de partida doble de verdad.',
  debe: 'Debe',
  haber: 'Haber',
  // Sería marketing sin la segunda mitad. Con ella es la promesa que el producto cumple.
  cierre: 'Cuadra siempre, o te dice por qué no.',
  entrar: 'Entrar',
  acceso: {
    open: 'Solicitar acceso',
    title: 'Pedir acceso',
    description:
      'T-Ledger es de una persona y de quien esa persona invite. Si querés una cuenta, escribime.',
    email: 'emiliorb@arclosystems.com',
    subject: 'Quiero una cuenta en T-Ledger',
    copy: 'Copiar',
    copied: 'Copiada',
    // El portapapeles falla en contextos no seguros y cuando el navegador lo niega. Decirlo
    // es mejor que un botón que parpadea y no hace nada: la dirección está a la vista y se
    // puede seleccionar a mano.
    copyFailed: 'No se pudo copiar. La dirección está ahí arriba para seleccionarla.',
    write: 'Escribir',
  },
} as const
