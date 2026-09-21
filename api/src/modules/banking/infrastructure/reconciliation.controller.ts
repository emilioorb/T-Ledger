import { Body, Controller, Get, HttpCode, Param, Post, Query } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { DateRange } from '../../../shared/kernel/date-range.js'
import { isErr } from '../../../shared/kernel/result.js'
import { LineToMovementUseCase } from '../application/line-to-movement.use-case.js'
import { MatchLineUseCase } from '../application/match-line.use-case.js'
import { ReconcileUseCase } from '../application/reconcile.use-case.js'
import { toBankLineResponse } from './banking.presenters.js'
import { fromMoney } from '../../../shared/http/money.schema.js'
import {
  lineToMovementSchema,
  matchLineSchema,
  reconciliationQuerySchema,
  type LineToMovementInput,
  type MatchLineInput,
  type ReconciliationQuery,
} from './banking.schemas.js'

const utc = (date: string): Date => new Date(`${date}T00:00:00.000Z`)

const rangeOf = (from: string, to: string): DateRange => {
  const range = DateRange.create(utc(from), utc(to))
  if (isErr(range)) throw new SemanticValidationError(range.error.message)
  return range.value
}

// La conciliación cuelga de la cuenta bancaria: sin cuenta no existe, y un endpoint con un
// filtro obligatorio es un sub-recurso disfrazado.
@Controller()
export class ReconciliationController {
  constructor(
    private readonly reconcile: ReconcileUseCase,
    private readonly matchLine: MatchLineUseCase,
    private readonly lineToMovement: LineToMovementUseCase,
  ) {}

  @Get('bank-accounts/:id/reconciliation')
  async reconciliation(
    @Param('id') id: string,
    @Query(new ZodValidationPipe(reconciliationQuerySchema)) query: ReconciliationQuery,
  ) {
    const result = await this.reconcile.execute(
      id,
      rangeOf(query.from, query.to),
      query.page,
      query.pageSize,
    )

    return {
      bankAccountId: result.bankAccountId,
      ledgerBalance: fromMoney(result.ledgerBalance),
      statementBalance: fromMoney(result.statementBalance),
      difference: fromMoney(result.difference),
      lines: result.lines.map(toBankLineResponse),
      suggestions: result.suggestions,
      pagination: {
        page: query.page,
        pageSize: query.pageSize,
        totalItems: result.totalItems,
        totalPages: Math.ceil(result.totalItems / query.pageSize),
      },
    }
  }

  @Post('bank-lines/:id/match')
  @HttpCode(200)
  async match(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(matchLineSchema)) input: MatchLineInput,
  ): Promise<void> {
    await this.matchLine.match(id, input.movementId)
  }

  @Post('bank-lines/:id/unmatch')
  @HttpCode(200)
  async unmatch(@Param('id') id: string): Promise<void> {
    await this.matchLine.unmatch(id)
  }

  @Post('bank-lines/:id/ignore')
  @HttpCode(200)
  async ignore(@Param('id') id: string): Promise<void> {
    await this.matchLine.ignore(id)
  }

  @Post('bank-lines/:id/to-movement')
  async toMovement(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(lineToMovementSchema)) input: LineToMovementInput,
  ): Promise<{ movementId: string }> {
    return this.lineToMovement.execute(id, input)
  }
}
