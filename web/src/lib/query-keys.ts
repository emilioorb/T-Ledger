export const queryKeys = {
  debts: {
    all: ['debts'] as const,
    list: (params: { page: number; pageSize: number; direction?: string; at?: string }) =>
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
    journal: (from: string, to: string, page: number) =>
      ['accounting', 'journal', from, to, page] as const,
    ledger: (account: string, currency: string, from: string, to: string) =>
      ['accounting', 'ledger', account, currency, from, to] as const,
    trialBalance: (currency: string, from: string, to: string) =>
      ['accounting', 'trial-balance', currency, from, to] as const,
    netWorth: (at: string) => ['accounting', 'net-worth', at] as const,
    financialPosition: (currency: string, at: string) =>
      ['accounting', 'financial-position', currency, at] as const,
    incomeStatement: (currency: string, from: string, to: string) =>
      ['accounting', 'income-statement', currency, from, to] as const,
    periods: () => ['accounting', 'periods'] as const,
  },

  budget: {
    all: ['budget'] as const,
    evaluation: (month: string, currency: string) =>
      ['budget', 'evaluation', month, currency] as const,
    income: (month: string) => ['budget', 'income', month] as const,
    models: () => ['budget', 'models'] as const,
  },

  goals: {
    all: ['goals'] as const,
    list: () => ['goals', 'list'] as const,
    detail: (id: string) => ['goals', 'detail', id] as const,
  },

  investments: {
    all: ['investments'] as const,
    list: (at?: string) => ['investments', 'list', at ?? 'hoy'] as const,
    detail: (id: string) => ['investments', 'detail', id] as const,
    projection: (id: string, at: string) => ['investments', 'projection', id, at] as const,
  },

  banking: {
    all: ['banking'] as const,
    accounts: () => ['banking', 'accounts'] as const,
    profiles: () => ['banking', 'profiles'] as const,
    statements: () => ['banking', 'statements'] as const,
    reconciliation: (bankAccountId: string, from: string, to: string, page: number) =>
      ['banking', 'reconciliation', bankAccountId, from, to, page] as const,
  },

  projection: {
    all: ['projection'] as const,
    cashFlow: (months: number, currency: string) =>
      ['projection', 'cash-flow', months, currency] as const,
  },
}
