// @vitest-environment node
//
// Sin DOM: la rampa es aritmética con reloj, y levantar jsdom para probarla costaba cincuenta
// segundos de los cincuenta y tres que tardaba el archivo.
import { afterEach, describe, expect, it, vi } from 'vitest'
import { rampa } from './rampa'

// Un reloj de cuadros a mano. El navegador de pruebas entrega un `requestAnimationFrame` cada
// medio segundo —la cinta se veía «sin frenar» por eso y no por un error—, así que los cuadros
// se producen acá: la rampa es aritmética con reloj, y el reloj lo pone el test.
const conCuadros = () => {
  const pendientes: FrameRequestCallback[] = []

  vi.stubGlobal('requestAnimationFrame', (llamar: FrameRequestCallback) => {
    pendientes.push(llamar)
    return pendientes.length
  })
  vi.stubGlobal('cancelAnimationFrame', () => pendientes.splice(0, pendientes.length))

  // `ahora` es el reloj del cuadro, que el navegador entrega y el test decide.
  return (ahora: number) => {
    const ahoraPendientes = pendientes.splice(0, pendientes.length)
    ahoraPendientes.forEach((llamar) => llamar(ahora))
  }
}

afterEach(() => vi.unstubAllGlobals())

describe('rampa', () => {
  it('termina exactamente en el destino', () => {
    const cuadro = conCuadros()
    const valores: number[] = []

    rampa({ desde: 1, hasta: 0.08, duracion: 400 }, (valor) => valores.push(valor))

    cuadro(1000)
    cuadro(1200)
    cuadro(1400)

    expect(valores.at(-1)).toBe(0.08)
  })

  it('nunca se va para el lado contrario, aunque el primer cuadro llegue con el reloj atrasado', () => {
    // La regresión: el inicio se tomaba con `performance.now()` al registrar la rampa, y el
    // cuadro llegaba con una marca anterior. El avance salía negativo, la curva se daba vuelta
    // y la cinta aceleraba en lugar de frenar.
    const cuadro = conCuadros()
    const valores: number[] = []

    rampa({ desde: 1, hasta: 0.08, duracion: 400 }, (valor) => valores.push(valor))

    cuadro(950)
    cuadro(1150)
    cuadro(1350)

    expect(valores.every((valor) => valor <= 1 && valor >= 0.08)).toBe(true)
  })

  it('avanza sin retroceder', () => {
    const cuadro = conCuadros()
    const valores: number[] = []

    rampa({ desde: 0.08, hasta: 1, duracion: 400 }, (valor) => valores.push(valor))
    ;[1000, 1100, 1200, 1300, 1400].forEach(cuadro)

    valores.forEach((valor, indice) => {
      if (indice > 0) expect(valor).toBeGreaterThanOrEqual(valores[indice - 1] ?? 0)
    })
    expect(valores.at(-1)).toBe(1)
  })

  it('arranca el reloj aunque el primer cuadro llegue con la marca en cero', () => {
    const cuadro = conCuadros()
    const valores: number[] = []

    rampa({ desde: 0, hasta: 1, duracion: 400 }, (valor) => valores.push(valor))

    cuadro(0)
    cuadro(200)
    cuadro(400)

    // Si el inicio no se fijara en el cuadro cero, el de 200 contaría como el arranque y la
    // rampa terminaría 200 ms tarde.
    expect(valores.at(-1)).toBe(1)
  })

  it('deja de entregar valores cuando se la cancela', () => {
    const cuadro = conCuadros()
    const valores: number[] = []

    const cancelar = rampa({ desde: 1, hasta: 0.08, duracion: 400 }, (valor) => valores.push(valor))

    cuadro(1000)
    cancelar()
    cuadro(1200)

    expect(valores).toHaveLength(1)
  })
})
