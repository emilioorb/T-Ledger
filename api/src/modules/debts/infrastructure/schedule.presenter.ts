import { fromMoney } from '../../../shared/http/money.schema.js'
import type { AmortizationSchedule } from '../domain/amortization.js'
import type { Debt } from '../domain/debt.js'
import type { DebtProjection } from '../domain/extra-payment.js'
import type { DebtScheduleResponse, ProjectionResponse, ScheduleResponse } from './schedule.schemas.js'

const toIsoDate = (date: Date): string => date.toISOString().slice(0, 10)

export const toScheduleResponse = (schedule: AmortizationSchedule): ScheduleResponse => ({
  installments: schedule.installments.map((installment) => ({
    number: installment.number,
    dueDate: toIsoDate(installment.dueDate),
    payment: fromMoney(installment.payment),
    principal: fromMoney(installment.principal),
    interest: fromMoney(installment.interest),
    balance: fromMoney(installment.balance),
  })),
  totalInterest: fromMoney(schedule.totalInterest),
  totalPaid: fromMoney(schedule.totalPaid),
})

export const toDebtScheduleResponse = (debt: Debt, today: Date): DebtScheduleResponse => {
  const base = toScheduleResponse(debt.schedule())
  const estados = debt.installmentStatuses(today)
  return {
    ...base,
    installments: base.installments.map((installment, index) => {
      const pago = debt.payments[index]
      return {
        ...installment,
        status: estados[index] ?? 'PENDING',
        paidOn: pago ? toIsoDate(pago.date) : null,
        withMovement: pago?.movementId != null,
      }
    }),
  }
}

export const toProjectionResponse = (projection: DebtProjection): ProjectionResponse => ({
  baseline: toScheduleResponse(projection.baseline),
  withExtraPayment: toScheduleResponse(projection.withExtraPayment),
  extraPayment: fromMoney(projection.extraPayment),
  interestSaved: fromMoney(projection.interestSaved),
  monthsSaved: projection.monthsSaved,
  totalPaidWithExtra: fromMoney(projection.totalPaidWithExtra),
})
