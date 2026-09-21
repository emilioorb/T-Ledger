import type { NombreDeGesto } from './bloub'

// El avatar no decora: mira las mismas cifras que el tablero y pone cara. Acá está la regla
// que traduce el estado del mes a una cara y a una frase.
//
// Las frases viven pegadas a su regla y no en un `copy.ts` aparte, que es lo que hace el
// resto de la app. Es a propósito: lo que cuesta entender de este archivo no es el texto
// sino por qué gana una situación sobre otra, y separarlos obligaría a leer dos archivos
// para reconstruir una sola decisión.

export interface Senales {
  // Lo comprometido del mes pasa de lo que entra.
  mesNoCierra: boolean
  // Un mes anterior sin cerrar, ya en palabras: «agosto de 2026».
  mesSinCerrar: string | null
  cubetaPasada: string | null
  deudaSubio: boolean
  // La meta más cercana, si no llega para su fecha.
  metaTarde: string | null
  // Cuánto cambió el patrimonio contra el mes pasado. `null` mientras no hay con qué
  // comparar: sin los dos extremos, cualquier cara sería una afirmación inventada.
  patrimonio: number | null
  sinAhorro: boolean
  sinDeudas: boolean
}

// El nombre de la nube. «Nimbo» es la nube que trae lluvia, que es el papel que cumple acá:
// la que avisa cuando algo viene mal. Vale como nombre propio y no choca con ninguna palabra
// que el libro ya use para otra cosa, que es lo que descartó a «Saldo».
export const NIMBO = 'Nimbo'

export interface Animo {
  gesto: NombreDeGesto
  siente: string
  porque: string
}

// Debajo de esto el patrimonio no se movió: es el mismo umbral con el que las tarjetas
// deciden mostrar «Igual que el mes pasado» en vez de un porcentaje.
const QUIETO = 0.05
// De acá para arriba ya no es «subió», es un salto.
const SALTO = 5

const porcentaje = (valor: number): string => {
  const abs = Math.abs(valor)
  const redondo = abs < 10 ? abs.toFixed(1) : String(Math.round(abs))
  return `${redondo.replace('.', ',')}%`
}

type Regla = (senales: Senales) => Animo | null

// El orden es la regla. Primero lo que se rompe si no hacés nada, después lo que se está
// atrasando, y de último lo bueno: un avatar que celebra un patrimonio en alza mientras el
// mes no cierra estaría mintiendo por omisión.
const REGLAS: Regla[] = [
  ({ mesNoCierra }) =>
    mesNoCierra
      ? {
          gesto: 'asustado',
          siente: 'Estoy sudando frío',
          porque: 'Lo que ya está comprometido este mes pasa de lo que entra.',
        }
      : null,

  ({ cubetaPasada }) =>
    cubetaPasada
      ? {
          gesto: 'molesto',
          siente: 'Tengo un solo reclamo',
          porque: `${cubetaPasada} se pasó de lo que le asignaste.`,
        }
      : null,

  ({ mesSinCerrar }) =>
    mesSinCerrar
      ? {
          gesto: 'desconfiado',
          siente: 'Algo quedó a medias',
          // El mes va adentro y no al principio: en español arranca en minúscula, y «agosto
          // de 2026 sigue abierto» abriría la frase con una letra chiquita.
          porque: `Todavía no cerrás ${mesSinCerrar}. Hasta que lo hagás, los reportes se pueden mover.`,
        }
      : null,

  ({ deudaSubio }) =>
    deudaSubio
      ? {
          gesto: 'confundido',
          siente: 'Esto no me cuadra',
          porque: 'Debés más que el mes pasado.',
        }
      : null,

  ({ metaTarde }) =>
    metaTarde
      ? {
          gesto: 'triste',
          siente: 'No sé cómo decirte esto',
          porque: `${metaTarde} no llega para la fecha que le pusiste.`,
        }
      : null,

  ({ patrimonio }) =>
    patrimonio !== null && patrimonio < -QUIETO
      ? {
          gesto: 'triste',
          siente: 'Ando bajoneado',
          porque: `El patrimonio quedó ${porcentaje(patrimonio)} abajo del mes pasado.`,
        }
      : null,

  ({ sinAhorro }) =>
    sinAhorro
      ? {
          gesto: 'adormilado',
          siente: 'Llevo el mes viendo la pared',
          porque: 'No entró nada a metas ni a inversiones.',
        }
      : null,

  ({ patrimonio }) =>
    patrimonio !== null && patrimonio >= SALTO
      ? {
          gesto: 'emocionado',
          siente: 'No me lo esperaba',
          porque: `El patrimonio pegó un salto de ${porcentaje(patrimonio)} contra el mes pasado.`,
        }
      : null,

  ({ sinDeudas }) =>
    sinDeudas
      ? {
          gesto: 'orgulloso',
          siente: 'Esta me la guardo',
          porque: 'No debés un cinco.',
        }
      : null,

  ({ patrimonio }) =>
    patrimonio !== null && patrimonio > QUIETO
      ? {
          gesto: 'contento',
          siente: 'Vamos bien',
          porque: `El patrimonio subió ${porcentaje(patrimonio)} contra el mes pasado.`,
        }
      : null,

  ({ patrimonio }) =>
    patrimonio !== null
      ? {
          gesto: 'adormilado',
          siente: 'Me agarraste dormido',
          porque: 'No se movió nada desde el mes pasado.',
        }
      : null,
]

// Sin comparación todavía no hay nada que sentir, y la cara neutra es la única que no afirma
// nada sobre la plata.
const ESPERANDO: Animo = {
  gesto: 'neutro',
  siente: 'Estoy viendo los números',
  porque: 'Dame un segundo.',
}

export const animoDe = (senales: Senales): Animo => {
  for (const regla of REGLAS) {
    const animo = regla(senales)
    if (animo) return animo
  }
  return ESPERANDO
}
