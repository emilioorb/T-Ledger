import { randomUUID } from 'node:crypto'
import { Inject, Injectable } from '@nestjs/common'
import { SemanticValidationError } from '../../../shared/http/api-error.js'
import { isErr } from '../../../shared/kernel/result.js'
import type { ParsedLine } from '../domain/bank-line.js'
import {
  BANK_STATEMENT_REPOSITORY,
  type BankStatementRepository,
  type ImportResult,
  type StoredStatement,
} from '../domain/bank-statement-repository.port.js'
import { parseStatement } from '../domain/statement-parsing.js'
import type { UploadedFile } from '../infrastructure/uploaded-file.js'
import { ManageBankAccountsUseCase } from './manage-bank-accounts.use-case.js'
import { ManageImportProfilesUseCase } from './manage-import-profiles.use-case.js'

export interface ImportedStatement extends ImportResult {
  readonly statementId: string
  readonly fileName: string
}

@Injectable()
export class ImportStatementUseCase {
  constructor(
    @Inject(BANK_STATEMENT_REPOSITORY) private readonly statements: BankStatementRepository,
    private readonly accounts: ManageBankAccountsUseCase,
    private readonly profiles: ManageImportProfilesUseCase,
  ) {}

  // La vista previa no escribe nada: un perfil mal mapeado mete cien líneas con la fecha y el
  // monto cambiados de lugar, y deshacer eso cuesta más que revisarlo antes.
  async preview(
    file: UploadedFile,
    bankAccountId: string,
    profileId: string,
  ): Promise<ParsedLine[]> {
    return this.read(file, bankAccountId, profileId)
  }

  async list(
    page: number,
    pageSize: number,
  ): Promise<{ items: StoredStatement[]; totalItems: number }> {
    return this.statements.findAll(page, pageSize)
  }

  async execute(
    file: UploadedFile,
    bankAccountId: string,
    profileId: string,
  ): Promise<ImportedStatement> {
    const lines = await this.read(file, bankAccountId, profileId)

    const statementId = randomUUID()
    const result = await this.statements.save(
      { id: statementId, bankAccountId, fileName: file.originalname },
      lines,
    )

    return { statementId, fileName: file.originalname, ...result }
  }

  private async read(
    file: UploadedFile,
    bankAccountId: string,
    profileId: string,
  ): Promise<ParsedLine[]> {
    if (!file) throw new SemanticValidationError('Falta el archivo del extracto.')

    const [account, profile] = await Promise.all([
      this.accounts.find(bankAccountId),
      this.profiles.find(profileId),
    ])

    const text = file.buffer.toString(profile.encoding === 'latin1' ? 'latin1' : 'utf-8')
    const lines = parseStatement(text, profile, account.currency)
    if (isErr(lines)) throw new SemanticValidationError(lines.error.message)

    // Importar cero líneas en silencio dejaría a Emilio creyendo que el banco no tuvo
    // movimientos ese mes.
    if (lines.value.length === 0) {
      throw new SemanticValidationError(
        'El archivo no tiene ninguna línea legible con este perfil.',
      )
    }

    return lines.value
  }
}
