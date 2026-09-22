interface Tramo {
  desde: number
  hasta: number
  duracion: number
}

// Lleva un número de un valor a otro a lo largo del tiempo y va entregando los intermedios.
// No sabe nada de lo que está moviendo: existe suelta porque una rampa es aritmética con
// reloj, y la aritmética con reloj se prueba sin navegador.
//
// Sale rápido y frena al final, la misma curva que el resto de la app: lo que se mueve pierde
// casi todo el camino en el primer tercio y después se acomoda.
const suavizar = (avance: number) => 1 - (1 - avance) ** 3

export const rampa = ({ desde, hasta, duracion }: Tramo, aplicar: (valor: number) => void) => {
  // El reloj arranca en el primer cuadro y no al registrar: `requestAnimationFrame` entrega la
  // marca del cuadro **en curso**, que puede ser anterior a un `performance.now()` leído una
  // línea antes. Con el inicio tomado afuera, el primer paso da un avance negativo y el valor
  // se va para el lado contrario —medido en la cinta: 1,0086 cuando iba hacia 0,08—.
  // `null` y no cero: el primer cuadro de un documento llega con la marca en 0, y un `||=`
  // lo tomaría por «todavía sin arrancar» y volvería a fijar el inicio en el cuadro
  // siguiente, perdiendo el primer tramo de la rampa.
  let inicio: number | null = null
  let cuadro = 0

  const paso = (ahora: number) => {
    inicio ??= ahora
    const avance = Math.min((ahora - inicio) / duracion, 1)

    // El último cuadro entrega el destino tal cual y no interpolado: la aritmética de coma
    // flotante lo dejaba en 0,07999999999999996, y un valor que casi llegó se va acumulando
    // en lo que sea que la rampa esté moviendo.
    if (avance === 1) {
      aplicar(hasta)
      return
    }

    aplicar(desde + (hasta - desde) * suavizar(avance))
    cuadro = requestAnimationFrame(paso)
  }

  cuadro = requestAnimationFrame(paso)

  return () => cancelAnimationFrame(cuadro)
}
