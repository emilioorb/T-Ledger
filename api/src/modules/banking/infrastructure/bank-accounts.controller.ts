import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common'
import { ZodValidationPipe } from '../../../shared/http/zod-validation.pipe.js'
import { ManageBankAccountsUseCase } from '../application/manage-bank-accounts.use-case.js'
import { toBankAccountResponse } from './banking.presenters.js'
import { bankAccountSchema, updateBankAccountSchema, type BankAccountInput, type UpdateBankAccountInput } from './banking.schemas.js'
import { Permiso } from '../../identity/infrastructure/permiso.guard.js'

type BankAccountResponse = ReturnType<typeof toBankAccountResponse>

@Controller('bank-accounts')
export class BankAccountsController {
  constructor(private readonly accounts: ManageBankAccountsUseCase) {}

  @Get()
  async list(): Promise<BankAccountResponse[]> {
    return (await this.accounts.list()).map(toBankAccountResponse)
  }

  @Get(':id')
  async get(@Param('id') id: string): Promise<BankAccountResponse> {
    return toBankAccountResponse(await this.accounts.find(id))
  }

  @Permiso('banco', 'write')
  @Post()
  async create(
    @Body(new ZodValidationPipe(bankAccountSchema)) input: BankAccountInput,
  ): Promise<BankAccountResponse> {
    return toBankAccountResponse(await this.accounts.create(input))
  }

  @Permiso('banco', 'write')
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body(new ZodValidationPipe(updateBankAccountSchema)) input: UpdateBankAccountInput,
  ): Promise<BankAccountResponse> {
    return toBankAccountResponse(await this.accounts.update(id, input))
  }
}
