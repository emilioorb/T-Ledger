import { Controller, Get, Query, Res } from '@nestjs/common'
import type { Response } from 'express'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { DateRange } from '../../../shared/kernel/date-range.js'
import { isErr } from '../../../shared/kernel/result.js'
import { GetFinancialPositionUseCase } from '../application/get-financial-position.use-case.js'
import { GetIncomeStatementUseCase } from '../application/get-income-statement.use-case.js'
import { GetLedgerUseCase } from '../application/get-ledger.use-case.js'
import { GetTrialBalanceUseCase } from '../application/get-trial-balance.use-case.js'
import {
  toFinancialPositionResponse,
  toIncomeStatementResponse,
  toLedgerResponse,
  toTrialBalanceResponse,
  trialBalanceToCsv,
} from './accounting.presenters.js'
import {
  financialPositionQuerySchema,
  incomeStatementQuerySchema,
  ledgerQuerySchema,
  trialBalanceQuerySchema,
  type FinancialPositionQuery,
  type IncomeStatementQuery,
  type LedgerQuery,
  type TrialBalanceQuery,
} from './accounting.schemas.js'

const utc = (date: string): Date => new Date(`${date}T00:00:00.000Z`)

const rangeOf = (from: string, to: string): DateRange => {
  const range = DateRange.create(utc(from), utc(to))
  if (isErr(range)) throw new SemanticValidationError(range.error.message)
  return range.value
}

@Controller('reports')
export class ReportsController {
  constructor(
    private readonly getLedger: GetLedgerUseCase,
    private readonly getTrialBalance: GetTrialBalanceUseCase,
    private readonly getFinancialPosition: GetFinancialPositionUseCase,
    private readonly getIncomeStatement: GetIncomeStatementUseCase,
  ) {}

  @Get('ledger')
  async ledger(
    @Query(new ZodValidationPipe(ledgerQuerySchema)) query: LedgerQuery,
  ): Promise<ReturnType<typeof toLedgerResponse>> {
    const ledger = await this.getLedger.execute(
      query.account,
      query.currency,
      rangeOf(query.from, query.to),
    )
    return toLedgerResponse(ledger)
  }

  // El CSV sale del mismo objeto que sirve el JSON: dos caminos para el mismo reporte
  // terminan divergiendo.
  @Get('trial-balance')
  async trialBalance(
    @Query(new ZodValidationPipe(trialBalanceQuerySchema)) query: TrialBalanceQuery,
    @Res({ passthrough: true }) response: Response,
  ): Promise<ReturnType<typeof toTrialBalanceResponse> | string> {
    const balance = await this.getTrialBalance.execute(
      rangeOf(query.from, query.to),
      query.currency,
    )
    if (query.format === 'json') return toTrialBalanceResponse(balance)

    response.setHeader('Content-Type', 'text/csv; charset=utf-8')
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="comprobacion-${query.from}-${query.to}.csv"`,
    )
    return trialBalanceToCsv(balance)
  }

  @Get('financial-position')
  async financialPosition(
    @Query(new ZodValidationPipe(financialPositionQuerySchema)) query: FinancialPositionQuery,
  ): Promise<ReturnType<typeof toFinancialPositionResponse>> {
    return toFinancialPositionResponse(
      await this.getFinancialPosition.execute(utc(query.at), query.currency),
    )
  }

  @Get('income-statement')
  async incomeStatement(
    @Query(new ZodValidationPipe(incomeStatementQuerySchema)) query: IncomeStatementQuery,
  ): Promise<ReturnType<typeof toIncomeStatementResponse>> {
    return toIncomeStatementResponse(
      await this.getIncomeStatement.execute(rangeOf(query.from, query.to), query.currency),
    )
  }
}
