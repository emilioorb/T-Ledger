import { err, ok, type Result } from '../../../shared/kernel/result.js'
import type { AccountClass } from './account-class.js'
import type { Account } from './account.js'

const findCycle = (
  accounts: readonly Account[],
  index: ReadonlyMap<string, Account>,
): string | null => {
  for (const account of accounts) {
    const seen = new Set<string>([account.code])
    let current = account.parentCode
    while (current !== null) {
      if (seen.has(current)) return current
      seen.add(current)
      current = index.get(current)?.parentCode ?? null
    }
  }
  return null
}

export class ChartOfAccounts {
  private constructor(
    private readonly accounts: readonly Account[],
    private readonly index: ReadonlyMap<string, Account>,
  ) {}

  static create(accounts: readonly Account[]): Result<ChartOfAccounts, RangeError> {
    const index = new Map<string, Account>()
    for (const account of accounts) {
      if (index.has(account.code)) {
        return err(new RangeError(`El código ${account.code} está repetido en el plan de cuentas`))
      }
      index.set(account.code, account)
    }

    const roots = new Set<AccountClass>()
    for (const account of accounts) {
      if (account.parentCode === null) {
        if (roots.has(account.accountClass)) {
          return err(
            new RangeError(`La clase ${account.accountClass} no puede tener dos cuentas raíz`),
          )
        }
        roots.add(account.accountClass)
        continue
      }

      const parent = index.get(account.parentCode)
      if (!parent) {
        return err(
          new RangeError(`La cuenta ${account.code} cuelga de ${account.parentCode}, que no existe`),
        )
      }
      if (parent.accountClass !== account.accountClass) {
        return err(
          new RangeError(
            `La cuenta ${account.code} es ${account.accountClass} y cuelga de ${parent.code}, que es ${parent.accountClass}`,
          ),
        )
      }
    }

    const cycle = findCycle(accounts, index)
    if (cycle) return err(new RangeError(`La jerarquía tiene un ciclo en ${cycle}`))

    return ok(new ChartOfAccounts(accounts, index))
  }

  all(): readonly Account[] {
    return this.accounts
  }

  byCode(code: string): Account | undefined {
    return this.index.get(code)
  }

  roots(): Account[] {
    return this.sorted(this.accounts.filter((account) => account.parentCode === null))
  }

  childrenOf(code: string): Account[] {
    return this.sorted(this.accounts.filter((account) => account.isChildOf(code)))
  }

  descendantsOf(code: string): Account[] {
    return this.childrenOf(code).flatMap((child) => [child, ...this.descendantsOf(child.code)])
  }

  // Solo se asienta contra hojas activas: una agrupadora acumula, no recibe.
  isPostable(code: string): boolean {
    const account = this.index.get(code)
    if (!account || !account.active) return false
    return this.childrenOf(code).length === 0
  }

  levelOf(code: string): number {
    let level = 0
    let current = this.index.get(code)
    while (current?.parentCode) {
      level += 1
      current = this.index.get(current.parentCode)
    }
    return level
  }

  private sorted(accounts: Account[]): Account[] {
    return [...accounts].sort((a, b) => a.sortOrder - b.sortOrder || a.code.localeCompare(b.code))
  }
}
