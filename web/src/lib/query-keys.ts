export const queryKeys = {
  debts: {
    all: ['debts'] as const,
    list: (params: { page: number; pageSize: number; direction?: string }) =>
      ['debts', 'list', params] as const,
    detail: (id: string) => ['debts', 'detail', id] as const,
    schedule: (id: string) => ['debts', 'schedule', id] as const,
    payoffPlan: (strategy: string) => ['debts', 'payoff-plan', strategy] as const,
  },
}
