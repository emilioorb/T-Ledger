import { Body, Controller, Get, Param, Patch, Post, Query } from '@nestjs/common'
import { paginated, type Paginated } from '../../../shared/http/pagination.js'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { GetAccountUseCase } from '../application/get-account.use-case.js'
import { GetAccountsTreeUseCase } from '../application/get-accounts-tree.use-case.js'
import { ListAccountsUseCase } from '../application/list-accounts.use-case.js'
import { SaveAccountUseCase } from '../application/save-account.use-case.js'
import { toAccountResponse, toReportNodeResponse } from './accounting.presenters.js'
import type { ReportNodeResponse } from './accounting.responses.js'
import {
  accountsTreeQuerySchema,
  createAccountSchema,
  listAccountsQuerySchema,
  updateAccountSchema,
  type AccountsTreeQuery,
  type CreateAccountInput,
  type ListAccountsQuery,
  type UpdateAccountInput,
} from './accounting.schemas.js'
import { Permiso } from '../../identity/infrastructure/permiso.guard.js'

type AccountResponse = ReturnType<typeof toAccountResponse>

@Controller('accounts')
export class AccountsController {
  constructor(
    private readonly listAccounts: ListAccountsUseCase,
    private readonly getAccount: GetAccountUseCase,
    private readonly saveAccount: SaveAccountUseCase,
    private readonly getTree: GetAccountsTreeUseCase,
  ) {}

  @Get()
  async list(
    @Query(new ZodValidationPipe(listAccountsQuerySchema)) query: ListAccountsQuery,
  ): Promise<Paginated<AccountResponse>> {
    const { items, totalItems } = await this.listAccounts.execute(query)
    return paginated(items.map(toAccountResponse), query.page, query.pageSize, totalItems)
  }

  // Declarado antes de ':code': si no, Nest resolvería 'tree' como un código de cuenta.
  // Es la tercera vez que aparece el patrón en el proyecto: las rutas literales van
  // antes que las paramétricas.
  @Get('tree')
  async tree(
    @Query(new ZodValidationPipe(accountsTreeQuerySchema)) query: AccountsTreeQuery,
  ): Promise<ReportNodeResponse[]> {
    const nodes = await this.getTree.execute(query.currency, new Date(`${query.at}T00:00:00.000Z`))
    return nodes.map(toReportNodeResponse)
  }

  @Get(':code')
  async get(@Param('code') code: string): Promise<AccountResponse> {
    return toAccountResponse(await this.getAccount.execute(code))
  }

  @Permiso('cuenta', 'write')
  @Post()
  async create(
    @Body(new ZodValidationPipe(createAccountSchema)) input: CreateAccountInput,
  ): Promise<AccountResponse> {
    return toAccountResponse(await this.saveAccount.create(input))
  }

  @Permiso('cuenta', 'write')
  @Patch(':code')
  async update(
    @Param('code') code: string,
    @Body(new ZodValidationPipe(updateAccountSchema)) input: UpdateAccountInput,
  ): Promise<AccountResponse> {
    return toAccountResponse(await this.saveAccount.update(code, input))
  }
}
