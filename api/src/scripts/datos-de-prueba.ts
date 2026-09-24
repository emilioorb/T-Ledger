import { existsSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { NestFactory } from '@nestjs/core'
import { AccountingModule } from '../modules/accounting/accounting.module.js'
import { CreateMovementUseCase } from '../modules/accounting/application/create-movement.use-case.js'
import { ManageCategoriesUseCase } from '../modules/accounting/application/manage-categories.use-case.js'
import {
  ACCOUNT_REPOSITORY,
  type AccountRepository,
} from '../modules/accounting/domain/account-repository.port.js'
import { PrismaService } from '../shared/prisma/prisma.service.js'
import { conLibro } from '../shared/libro/libro-context.js'

// Un libro con datos para mirar: ocho categorías de gasto con colores distintos y tres meses
// de movimientos. Sirve para ver de verdad lo que con cuatro filas no se ve —la barra de
// composición, el desglose del mes, la paginación— sin inventar capturas.
//
//   npm run datos:prueba              agrega
//   npm run datos:prueba -- --borrar   deshace
//
// Vive en `src/` y se corre compilado, no con `tsx`: los decoradores de Nest necesitan la
// metadata que emite `tsc`, y transpilado al vuelo el contenedor no resuelve las dependencias
// de los casos de uso. Probado: falla con «can't resolve dependencies of CreateMovementUseCase».
//
// Los movimientos se crean por el caso de uso y no a mano en la base: así cada uno sale con su
// asiento y su rastro de auditoría, igual que si alguien los hubiera anotado. Un INSERT
// directo dejaría movimientos sin asentar, que es justo lo que bloquea el cierre del mes.
//
// Lo creado queda anotado en un archivo, porque la aplicación no borra movimientos a propósito
// —lo que existe es anular— y estos sí hay que poder sacarlos enteros. El borrado, entonces,
// es la única parte que va por Prisma directo, y solo toca los ids de esa lista.
// Relativo a donde se corre —la raíz de `api/`— y no al archivo compilado, que vive en
// `dist/` y desaparece con cada build.
const RASTRO = resolve('.datos-de-prueba.json')

interface Creado {
  categorias: string[]
  movimientos: string[]
}

const CATEGORIAS = [
  { name: 'Mercado', colorIndex: 4 },
  { name: 'Casa', colorIndex: 1 },
  { name: 'Transporte', colorIndex: 2 },
  { name: 'Salud', colorIndex: 6 },
  { name: 'Ocio', colorIndex: 9 },
  { name: 'Estudio', colorIndex: 7 },
  { name: 'Regalos', colorIndex: 10 },
  { name: 'Servicios', colorIndex: 5 },
] as const

// Contrapartes de verdad, no «Proveedor 1». Un nombre repetido en cincuenta filas esconde
// justo lo que la lista tiene que mostrar: que dos gastos del mismo lugar se parecen.
const COMERCIOS: Record<string, string[]> = {
  Mercado: ['Automercado', 'Perimercados', 'PriceSmart', 'Feria del agricultor'],
  Casa: ['Alquiler', 'EPA', 'Ferretería Brenes', 'Condominio'],
  Transporte: ['Gasolinera Delta', 'Uber', 'Riteve', 'Repuestos JS'],
  Salud: ['Farmacia La Bomba', 'Clínica Bíblica', 'Óptica Jiménez'],
  Ocio: ['Cinépolis', 'Spotify', 'Restaurante Mirador', 'Netflix'],
  Estudio: ['Librería Internacional', 'Udemy', 'Colegio de profesionales'],
  Regalos: ['Universal', 'Floristería Andrea', 'Amazon'],
  Servicios: ['ICE', 'AyA', 'Kolbi', 'Cable Tica'],
}

// Cuánto suele costar cada cosa, en colones. El rango importa: si todas las categorías
// gastaran parecido, la barra de composición saldría en ocho tramos iguales y no se vería
// para qué sirve.
const RANGOS: Record<string, [number, number]> = {
  Mercado: [18_000, 95_000],
  Casa: [25_000, 350_000],
  Transporte: [8_000, 60_000],
  Salud: [6_000, 45_000],
  Ocio: [4_500, 38_000],
  Estudio: [12_000, 70_000],
  Regalos: [7_000, 50_000],
  Servicios: [9_000, 42_000],
}

// Sin `Math.random`: dos corridas tienen que dar lo mismo, o una captura de ayer no se puede
// comparar con la de hoy y cada arreglo parece haber cambiado los datos.
const siguiente = (semilla: number): number => (semilla * 1103515245 + 12345) % 2147483648

const guardarRastro = (creado: Creado): void =>
  writeFileSync(RASTRO, `${JSON.stringify(creado, null, 2)}\n`)

const leerRastro = (): Creado | null =>
  existsSync(RASTRO) ? (JSON.parse(readFileSync(RASTRO, 'utf8')) as Creado) : null

const borrar = async (prisma: PrismaService, creado: Creado): Promise<void> => {
  const asientos = await prisma.client.journalEntry.findMany({
    where: { sourceMovementId: { in: creado.movimientos } },
    select: { id: true },
  })
  const ids = asientos.map((asiento) => asiento.id)

  await prisma.withTransaction(async () => {
    await prisma.client.journalLine.deleteMany({ where: { entryId: { in: ids } } })
    await prisma.client.journalEntry.deleteMany({ where: { id: { in: ids } } })
    await prisma.client.auditLog.deleteMany({
      where: { entityId: { in: [...creado.movimientos, ...creado.categorias] } },
    })
    await prisma.client.movement.deleteMany({ where: { id: { in: creado.movimientos } } })
    await prisma.client.category.deleteMany({ where: { id: { in: creado.categorias } } })
  })

  unlinkSync(RASTRO)
  console.log(
    `Borrados ${creado.movimientos.length} movimientos, ${ids.length} asientos y ${creado.categorias.length} categorías.`,
  )
}

interface Cuentas {
  pago: string
  gasto: string
  ingreso: string
}

// Tres salarios, uno por mes. Sin ellos la caja queda en varios millones en contra y todo lo
// que se calcula sobre el saldo —el patrimonio, la proyección, lo que queda libre— muestra un
// libro donde solo se gastó, que no se parece a nada.
const INGRESOS = { name: 'Salario', colorIndex: 3, monto: 1_450_000, de: 'Empresa' } as const

const agregar = async (
  categorias: ManageCategoriesUseCase,
  movimientos: CreateMovementUseCase,
  cuentas: Cuentas,
): Promise<Creado> => {
  const creado: Creado = { categorias: [], movimientos: [] }
  const existentes = await categorias.list()
  const hoy = new Date()
  let semilla = 20260922

  for (const [posicion, plantilla] of CATEGORIAS.entries()) {
    const previa = existentes.find((categoria) => categoria.name === plantilla.name)
    const categoria =
      previa ??
      (await categorias.create({
        name: plantilla.name,
        kind: 'EXPENSE',
        accountCode: cuentas.gasto,
        sortOrder: existentes.length + posicion,
        active: true,
        colorIndex: plantilla.colorIndex,
      }))
    if (!previa) creado.categorias.push(categoria.id)

    const comercios = COMERCIOS[plantilla.name] ?? ['Comercio']
    const [minimo, maximo] = RANGOS[plantilla.name] ?? [10_000, 50_000]

    // Seis movimientos por categoría repartidos en noventa días: tres meses de historia, que
    // es lo que hace falta para que los filtros de fecha tengan algo que filtrar.
    for (let numero = 0; numero < 6; numero += 1) {
      semilla = siguiente(semilla)
      const atras = semilla % 90
      const fecha = new Date(hoy)
      fecha.setUTCDate(fecha.getUTCDate() - atras)

      semilla = siguiente(semilla)
      const colones = minimo + (semilla % (maximo - minimo))

      const { movement } = await movimientos.execute({
        date: fecha.toISOString().slice(0, 10),
        kind: 'EXPENSE',
        categoryId: categoria.id,
        counterparty: comercios[numero % comercios.length]!,
        // A colones redondos: los céntimos en un gasto de supermercado son ruido que no
        // aporta nada a lo que estos datos existen para mostrar.
        amount: { minorUnits: `${Math.round(colones) * 100}`, currency: 'CRC' },
        paymentAccountCode: cuentas.pago,
      })
      creado.movimientos.push(movement.id)
    }
  }

  const previa = existentes.find((categoria) => categoria.name === INGRESOS.name)
  const salario =
    previa ??
    (await categorias.create({
      name: INGRESOS.name,
      kind: 'INCOME',
      accountCode: cuentas.ingreso,
      sortOrder: existentes.length + CATEGORIAS.length,
      active: true,
      colorIndex: INGRESOS.colorIndex,
    }))
  if (!previa) creado.categorias.push(salario.id)

  // El día 1 de este mes y de los dos anteriores, que es cuando cae un salario.
  for (let atras = 0; atras < 3; atras += 1) {
    const fecha = new Date(Date.UTC(hoy.getUTCFullYear(), hoy.getUTCMonth() - atras, 1))
    const { movement } = await movimientos.execute({
      date: fecha.toISOString().slice(0, 10),
      kind: 'INCOME',
      categoryId: salario.id,
      counterparty: INGRESOS.de,
      amount: { minorUnits: `${INGRESOS.monto * 100}`, currency: 'CRC' },
      paymentAccountCode: cuentas.pago,
    })
    creado.movimientos.push(movement.id)
  }

  return creado
}

// El módulo de contabilidad y no la aplicación entera: acá no hay peticiones HTTP, así que el
// middleware que resuelve el libro de cada una no tiene nada que hacer, y levantarlo obliga a
// armar la autenticación completa para un script que ya sabe en qué libro escribe.
const app = await NestFactory.createApplicationContext(AccountingModule, { logger: ['error'] })
const prisma = app.get(PrismaService)

const libro = await prisma.client.book.findFirst({ orderBy: { createdAt: 'asc' } })
if (!libro) {
  console.error('No hay ningún libro: entrá a la aplicación y creá uno antes de sembrar datos.')
  await app.close()
  process.exit(1)
}

const miembro = await prisma.client.bookMember.findFirst({ where: { organizationId: libro.id } })
if (!miembro) {
  console.error(`El libro ${libro.name} no tiene miembros: no hay a nombre de quién anotar.`)
  await app.close()
  process.exit(1)
}

await conLibro({ bookId: libro.id, userId: miembro.userId, rol: 'owner' }, async () => {
  const anterior = leerRastro()

  if (process.argv.includes('--borrar')) {
    if (!anterior) {
      console.log('No hay nada anotado para borrar.')
      return
    }
    await borrar(prisma, anterior)
    return
  }

  if (anterior) {
    console.error('Ya hay datos de prueba puestos. Corré con --borrar antes de volver a sembrar.')
    process.exitCode = 1
    return
  }

  // Las cuentas salen del plan y no van escritas: el plan semilla puede cambiar, y un código
  // inventado falla recién al guardar el asiento, cuando el movimiento ya se creó. Se pregunta
  // al plan y no a la tabla porque «se puede asentar acá» no es una columna: es no tener hijas.
  const plan = await app.get<AccountRepository>(ACCOUNT_REPOSITORY).loadChart()
  const posteables = plan
    .all()
    .filter((cuenta) => plan.isPostable(cuenta.code))
    .map((cuenta) => cuenta.code)
  const pago = posteables.find((codigo) => codigo.startsWith('11'))
  const gasto = posteables.find((codigo) => codigo.startsWith('6'))
  const ingreso = posteables.find((codigo) => codigo.startsWith('4'))

  if (!pago || !gasto || !ingreso) {
    console.error('El plan de cuentas no tiene dónde anotar: falta efectivo, gasto o ingreso.')
    process.exitCode = 1
    return
  }

  const creado = await agregar(app.get(ManageCategoriesUseCase), app.get(CreateMovementUseCase), {
    pago,
    gasto,
    ingreso,
  })
  guardarRastro(creado)

  console.log(
    `Listo: ${creado.categorias.length} categorías y ${creado.movimientos.length} movimientos en «${libro.name}».`,
  )
  console.log('Para deshacerlo: npm run datos:prueba -- --borrar')
})

await app.close()
