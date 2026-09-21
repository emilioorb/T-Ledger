import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { paginated, type Paginated } from '../../../shared/http/pagination.js'
import { isErr } from '../../../shared/kernel/result.js'
import { ClosePeriodUseCase } from '../application/close-period.use-case.js'
import { ListPeriodsUseCase } from '../application/list-periods.use-case.js'
import { ReopenPeriodUseCase } from '../application/reopen-period.use-case.js'
import { PeriodKey } from '../domain/accounting-period.js'
import { toPeriodResponse, toPeriodSummaryResponse } from './accounting.presenters.js'
import { Permiso } from '../../identity/infrastructure/permiso.guard.js'

type PeriodSummaryResponse = ReturnType<typeof toPeriodSummaryResponse>
type PeriodResponse = ReturnType<typeof toPeriodResponse>

const keyOf = (period: string): PeriodKey => {
  const key = PeriodKey.parse(period)
  if (isErr(key)) throw new SemanticValidationError(key.error.message)
  return key.value
}

@Controller('periods')
export class PeriodsController {
  constructor(
    private readonly listPeriods: ListPeriodsUseCase,
    private readonly closePeriod: ClosePeriodUseCase,
    private readonly reopenPeriod: ReopenPeriodUseCase,
  ) {}

  @Get()
  async list(): Promise<Paginated<PeriodSummaryResponse>> {
    const summaries = await this.listPeriods.execute()
    const data = summaries.map(({ snapshot, blockers }) =>
      toPeriodSummaryResponse(snapshot, blockers),
    )
    return paginated(data, 1, Math.max(data.length, 1), data.length)
  }

  // 200 y no 201: cerrar un mes no crea un recurso nuevo, cambia el estado de uno.
  @Permiso('periodo', 'close')
  @Post(':period/close')
  @HttpCode(200)
  async close(@Param('period') period: string): Promise<PeriodResponse> {
    return toPeriodResponse(await this.closePeriod.execute(keyOf(period)))
  }

  @Permiso('periodo', 'reopen')
  @Post(':period/reopen')
  @HttpCode(200)
  async reopen(@Param('period') period: string): Promise<{ reopened: PeriodResponse[] }> {
    const reopened = await this.reopenPeriod.execute(keyOf(period))
    return { reopened: reopened.map(toPeriodResponse) }
  }
}
