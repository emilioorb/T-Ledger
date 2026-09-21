import { Injectable } from '@nestjs/common'
import { unwrap } from '../../../shared/kernel/result.js'
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
    }),
  )

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

  async save(profile: ImportProfile): Promise<void> {
    const props = profile.toProps()
    const data = {
      name: props.name,
      delimiter: props.delimiter,
      encoding: props.encoding,
      headerRows: props.headerRows,
      dateColumn: props.dateColumn,
      dateFormat: props.dateFormat,
      descriptionColumn: props.descriptionColumn,
      referenceColumn: props.referenceColumn,
      amountColumn: props.amountColumn,
      debitColumn: props.debitColumn,
      creditColumn: props.creditColumn,
      decimalSeparator: props.decimalSeparator,
      thousandsSeparator: props.thousandsSeparator,
    }
    await this.prisma.client.importProfile.upsert({
      where: { id: props.id },
      create: { id: props.id, ...data },
      update: data,
    })
  }
}
