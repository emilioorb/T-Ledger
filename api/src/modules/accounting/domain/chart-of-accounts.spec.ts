import { describe, expect, it } from 'vitest'
import { isErr, unwrap } from '../../../shared/kernel/result.js'
import type { AccountClass } from './account-class.js'
import { Account } from './account.js'
import { ChartOfAccounts } from './chart-of-accounts.js'

const cuenta = (
  code: string,
  name: string,
  accountClass: AccountClass,
  parentCode: string | null,
  active = true,
) => unwrap(Account.create({ code, name, accountClass, parentCode, active, sortOrder: 0 }))

const plan = () =>
  unwrap(
    ChartOfAccounts.create([
      cuenta('1000', 'Activos', 'ASSET', null),
      cuenta('1100', 'Efectivo y equivalentes', 'ASSET', '1000'),
      cuenta('1101', 'Caja colones', 'ASSET', '1100'),
      cuenta('1102', 'Caja dólares', 'ASSET', '1100'),
      cuenta('1190', 'Traslados entre monedas', 'ASSET', '1100'),
      cuenta('2000', 'Pasivos', 'LIABILITY', null),
      cuenta('2110', 'Cuentas por pagar', 'LIABILITY', '2000'),
      cuenta('6000', 'Gastos operativos', 'OPERATING_EXPENSE', null),
      cuenta('6310', 'Servicios profesionales', 'OPERATING_EXPENSE', '6000', false),
    ]),
  )

describe('Account', () => {
  it('sabe si tiene madre; la profundidad real la da el árbol', () => {
    expect(cuenta('1000', 'Activos', 'ASSET', null).level()).toBe(0)
    expect(cuenta('1101', 'Caja', 'ASSET', '1100').level()).toBe(1)
  })

  it('rechaza un código que no es numérico', () => {
    expect(
      isErr(
        Account.create({
          code: 'CAJA',
          name: 'Caja',
          accountClass: 'ASSET',
          parentCode: null,
          active: true,
          sortOrder: 0,
        }),
      ),
    ).toBe(true)
  })

  it('rechaza un nombre vacío', () => {
    expect(
      isErr(
        Account.create({
          code: '1101',
          name: '   ',
          accountClass: 'ASSET',
          parentCode: '1100',
          active: true,
          sortOrder: 0,
        }),
      ),
    ).toBe(true)
  })

  it('rechaza una cuenta que es su propia madre', () => {
    expect(
      isErr(
        Account.create({
          code: '1101',
          name: 'Caja',
          accountClass: 'ASSET',
          parentCode: '1101',
          active: true,
          sortOrder: 0,
        }),
      ),
    ).toBe(true)
  })
})

describe('ChartOfAccounts', () => {
  it('encuentra una cuenta por su código', () => {
    expect(plan().byCode('1101')?.name).toBe('Caja colones')
    expect(plan().byCode('9999')).toBeUndefined()
  })

  it('lista las hijas directas de una cuenta', () => {
    expect(plan().childrenOf('1100').map((a) => a.code)).toEqual(['1101', '1102', '1190'])
  })

  it('lista todas las descendientes, no solo las hijas', () => {
    expect(plan().descendantsOf('1000').map((a) => a.code)).toEqual([
      '1100',
      '1101',
      '1102',
      '1190',
    ])
  })

  it('devuelve una raíz por clase presente', () => {
    expect(plan().roots().map((a) => a.code)).toEqual(['1000', '2000', '6000'])
  })

  it('cuenta la profundidad recorriendo el árbol hasta la raíz', () => {
    expect(plan().levelOf('1000')).toBe(0)
    expect(plan().levelOf('1100')).toBe(1)
    expect(plan().levelOf('1101')).toBe(2)
  })

  it('solo son asentables las cuentas hoja y activas', () => {
    expect(plan().isPostable('1101')).toBe(true)
    expect(plan().isPostable('1100')).toBe(false)
    expect(plan().isPostable('1000')).toBe(false)
    expect(plan().isPostable('6310')).toBe(false)
  })

  it('rechaza un plan con códigos repetidos', () => {
    expect(
      isErr(
        ChartOfAccounts.create([
          cuenta('1000', 'Activos', 'ASSET', null),
          cuenta('1000', 'Otra vez activos', 'ASSET', null),
        ]),
      ),
    ).toBe(true)
  })

  it('rechaza una cuenta cuyo padre no existe', () => {
    expect(isErr(ChartOfAccounts.create([cuenta('1101', 'Caja', 'ASSET', '1100')]))).toBe(true)
  })

  it('rechaza una cuenta que cuelga de otra clase contable', () => {
    expect(
      isErr(
        ChartOfAccounts.create([
          cuenta('1000', 'Activos', 'ASSET', null),
          cuenta('1900', 'Gasto colgado de activo', 'OPERATING_EXPENSE', '1000'),
        ]),
      ),
    ).toBe(true)
  })

  it('rechaza un ciclo en la jerarquía', () => {
    expect(
      isErr(
        ChartOfAccounts.create([
          cuenta('1100', 'A', 'ASSET', '1200'),
          cuenta('1200', 'B', 'ASSET', '1100'),
        ]),
      ),
    ).toBe(true)
  })

  it('rechaza dos raíces de la misma clase', () => {
    expect(
      isErr(
        ChartOfAccounts.create([
          cuenta('1000', 'Activos', 'ASSET', null),
          cuenta('1500', 'Otros activos raíz', 'ASSET', null),
        ]),
      ),
    ).toBe(true)
  })
})
