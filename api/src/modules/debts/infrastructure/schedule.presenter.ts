import { fromMoney } from '../../../shared/http/money.schema.js'
import type { AmortizationSchedule } from '../domain/amortization.js'
import type { DebtProjection } from '../domain/extra-payment.js'
import type { ProjectionResponse, ScheduleResponse } from './schedule.schemas.js'

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

export const toProjectionResponse = (projection: DebtProjection): ProjectionResponse => ({
  baseline: toScheduleResponse(projection.baseline),
  withExtraPayment: toScheduleResponse(projection.withExtraPayment),
  extraPayment: fromMoney(projection.extraPayment),
  interestSaved: fromMoney(projection.interestSaved),
  monthsSaved: projection.monthsSaved,
  totalPaidWithExtra: fromMoney(projection.totalPaidWithExtra),
})
