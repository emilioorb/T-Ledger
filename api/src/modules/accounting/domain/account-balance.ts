import type { Money } from '../../../shared/kernel/money.js'
import { unwrap } from '../../../shared/kernel/result.js'
import { normalBalanceOf, type AccountClass } from './account-class.js'

// El saldo se reporta con el signo de su saldo normal: un activo con más créditos
// que débitos se ve negativo, que es lo que se espera de una caja sobregirada.
export const signedBalance = (debits: Money, credits: Money, accountClass: AccountClass): Money =>
  normalBalanceOf(accountClass) === 'DEBIT'
    ? unwrap(debits.subtract(credits))
    : unwrap(credits.subtract(debits))
