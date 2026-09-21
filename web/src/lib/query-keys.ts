export const queryKeys = {
  debts: {
    all: ['debts'] as const,
    list: (params: { page: number; pageSize: number; direction?: string }) =>
      ['debts', 'list', params] as const,
    detail: (id: string) => ['debts', 'detail', id] as const,
    schedule: (id: string) => ['debts', 'schedule', id] as const,
    payoffPlan: (strategy: string) => ['debts', 'payoff-plan', strategy] as const,
  },

  // Una sola raíz para toda la contabilidad: cualquier asiento nuevo mueve el mayor,
  // la comprobación, la situación y el cierre a la vez. Invalidar por partes se olvida.
  accounting: {
    all: ['accounting'] as const,
    accounts: () => ['accounting', 'accounts'] as const,
    accountsTree: (currency: string, at: string) =>
      ['accounting', 'accounts-tree', currency, at] as const,
    categories: () => ['accounting', 'categories'] as const,
    movements: (filters: object) => ['accounting', 'movements', filters] as const,
    journal: (from: string, to: string) => ['accounting', 'journal', from, to] as const,
    ledger: (account: string, currency: string, from: string, to: string) =>
      ['accounting', 'ledger', account, currency, from, to] as const,
    trialBalance: (currency: string, from: string, to: string) =>
      ['accounting', 'trial-balance', currency, from, to] as const,
    financialPosition: (currency: string, at: string) =>
      ['accounting', 'financial-position', currency, at] as const,
    incomeStatement: (currency: string, from: string, to: string) =>
      ['accounting', 'income-statement', currency, from, to] as const,
    periods: () => ['accounting', 'periods'] as const,
  },
}
