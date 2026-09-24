import { Injectable } from '@nestjs/common'
import { unwrap } from '../../../shared/kernel/result.js'
import { SUBIR_VERSION, verificarEscritura } from '../../../shared/prisma/escribir-con-version.js'
import { PrismaService } from '../../../shared/prisma/prisma.service.js'
import { ImportProfile, type CsvDateFormat, type CsvEncoding } from '../domain/import-profile.js'
import type { ImportProfileRepository } from '../domain/import-profile-repository.port.js'

interface ImportProfileRow {
  id: string
  name: string
  delimiter: string
  encoding: string
  headerRows: number
  dateColumn: number
  dateFormat: string
  descriptionColumn: number
  referenceColumn: number | null
  amountColumn: number | null
  debitColumn: number | null
  creditColumn: number | null
  decimalSeparator: string
  thousandsSeparator: string | null
  version: number
}

const toDomain = (row: ImportProfileRow): ImportProfile =>
  unwrap(
    ImportProfile.create({
      id: row.id,
      name: row.name,
      delimiter: row.delimiter,
      encoding: row.encoding as CsvEncoding,
      headerRows: row.headerRows,
      dateColumn: row.dateColumn,
      dateFormat: row.dateFormat as CsvDateFormat,
      descriptionColumn: row.descriptionColumn,
      referenceColumn: row.referenceColumn,
      amountColumn: row.amountColumn,
      debitColumn: row.debitColumn,
      creditColumn: row.creditColumn,
      decimalSeparator: row.decimalSeparator as '.' | ',',
      thousandsSeparator: row.thousandsSeparator,
      version: row.version,
    }),
  )

const datosDe = (profile: ImportProfile) => ({
  name: profile.name,
  delimiter: profile.delimiter,
  encoding: profile.encoding,
  headerRows: profile.headerRows,
  dateColumn: profile.dateColumn,
  dateFormat: profile.dateFormat,
  descriptionColumn: profile.descriptionColumn,
  referenceColumn: profile.referenceColumn,
  amountColumn: profile.amountColumn,
  debitColumn: profile.debitColumn,
  creditColumn: profile.creditColumn,
  decimalSeparator: profile.decimalSeparator,
  thousandsSeparator: profile.thousandsSeparator,
})

@Injectable()
export class PrismaImportProfileRepository implements ImportProfileRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<ImportProfile[]> {
    const rows = await this.prisma.client.importProfile.findMany({ orderBy: { createdAt: 'asc' } })
    return rows.map((row) => toDomain(row as ImportProfileRow))
  }

  async findById(id: string): Promise<ImportProfile | null> {
    const row = await this.prisma.client.importProfile.findUnique({ where: { id } })
    return row ? toDomain(row as ImportProfileRow) : null
  }

  async add(profile: ImportProfile): Promise<void> {
    await this.prisma.client.importProfile.create({
      data: { bookId: this.prisma.libro, id: profile.id, ...datosDe(profile) },
    })
  }

  async update(profile: ImportProfile): Promise<ImportProfile> {
    const { count } = await this.prisma.client.importProfile.updateMany({
      where: { id: profile.id, version: profile.version },
      data: { ...datosDe(profile), ...SUBIR_VERSION },
    })
    await verificarEscritura(count, async () => (await this.prisma.client.importProfile.count({ where: { id: profile.id } })) > 0)
    return profile.guardado()
  }
}
