import { Inject, Injectable } from '@nestjs/common'
import { ConflictError, SemanticValidationError } from '../../../shared/http/api-error.js'
import { isErr } from '../../../shared/kernel/result.js'
import { ManageCategoriesUseCase } from '../../accounting/application/manage-categories.use-case.js'
import { SaveAccountUseCase } from '../../accounting/application/save-account.use-case.js'
import { ACCOUNT_REPOSITORY, type AccountRepository } from '../../accounting/domain/account-repository.port.js'
import type { AccountClass } from '../../accounting/domain/account-class.js'
import type { ChartOfAccounts } from '../../accounting/domain/chart-of-accounts.js'
import { siguienteCodigoLibre } from '../../accounting/domain/codigo-libre.js'
import type { CategoriesInput } from '../infrastructure/onboarding.schemas.js'
import { PasoIdempotente } from './paso-idempotente.js'

type Tipo = 'EXPENSE' | 'INCOME'

export interface CategoriaCreada {
  name: string
  kind: Tipo
  accountCode: string
  categoryId: string
}

// Cada tipo cuelga de una agrupadora propia y no de «Gastos generales»: así el estado de
// resultados sale desglosado por categoría, y la cuenta de la semilla queda como estaba.
const AGRUPADORAS: Record<
  Tipo,
  { code: string; name: string; parentCode: string; accountClass: AccountClass; desde: number; hasta: number }
> = {
  EXPENSE: { code: '6200', name: 'Gastos por categoría', parentCode: '6000', accountClass: 'OPERATING_EXPENSE', desde: 6201, hasta: 6299 },
  INCOME: { code: '4200', name: 'Ingresos por categoría', parentCode: '4000', accountClass: 'INCOME', desde: 4201, hasta: 4299 },
}

const clave = (name: string, kind: Tipo) => `${kind}:${name.trim().toLocaleLowerCase('es')}`

@Injectable()
export class CrearCategoriasUseCase {
  constructor(
    private readonly paso: PasoIdempotente,
    private readonly cuentas: SaveAccountUseCase,
    private readonly categorias: ManageCategoriesUseCase,
    @Inject(ACCOUNT_REPOSITORY) private readonly plan: AccountRepository,
  ) {}

  execute({ categories }: CategoriesInput): Promise<CategoriaCreada[]> {
    return this.paso.correr('categories', async () => {
      await this.rechazarRepetidas(categories)
      const chart = await this.plan.loadChart()
      const ocupados = new Set(chart.all().map((cuenta) => cuenta.code))

      for (const kind of new Set(categories.map((categoria) => categoria.kind))) {
        await this.asegurarAgrupadora(kind, chart, ocupados)
      }

      const creadas: CategoriaCreada[] = []
      for (const [orden, { name, kind }] of categories.entries()) {
        const { code: madre, accountClass, desde, hasta } = AGRUPADORAS[kind]
        const codigo = siguienteCodigoLibre(ocupados, desde, hasta)
        if (isErr(codigo)) throw new SemanticValidationError(codigo.error.message)
        ocupados.add(codigo.value)

        await this.cuentas.create({ code: codigo.value, name: name.trim(), accountClass, parentCode: madre, active: true, sortOrder: orden })
        const categoria = await this.categorias.create({
          name: name.trim(),
          kind,
          accountCode: codigo.value,
          sortOrder: orden,
          active: true,
          colorIndex: null,
        })
        creadas.push({ name: categoria.name, kind, accountCode: codigo.value, categoryId: categoria.id })
      }
      return creadas
    })
  }

  // Antes de escribir nada: la base también lo rechazaría, pero a mitad del paso y con un error
  // que no dice cuál.
  private async rechazarRepetidas(categories: CategoriesInput['categories']): Promise<void> {
    const vistas = new Set((await this.categorias.list()).map((categoria) => clave(categoria.name, categoria.kind)))
    for (const { name, kind } of categories) {
      const suya = clave(name, kind)
      if (vistas.has(suya)) throw new ConflictError(`Ya hay una categoría «${name.trim()}».`)
      vistas.add(suya)
    }
  }

  private async asegurarAgrupadora(kind: Tipo, chart: ChartOfAccounts, ocupados: Set<string>): Promise<void> {
    const { code, name, parentCode, accountClass } = AGRUPADORAS[kind]
    if (!ocupados.has(code)) {
      await this.cuentas.create({ code, name, accountClass, parentCode, active: true, sortOrder: 20 })
      ocupados.add(code)
      return
    }
    // Colgarle hijas a una cuenta que ya acepta asientos la vuelve agrupadora sin avisar, y las
    // categorías que apuntan a ella dejan de poder asentarse.
    if (chart.isPostable(code)) {
      throw new SemanticValidationError(`La cuenta ${code} ya existe y acepta asientos: no se le pueden colgar categorías.`)
    }
  }
}
