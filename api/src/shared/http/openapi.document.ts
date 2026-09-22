import { createDocument } from 'zod-openapi'
import { accountingOpenApiPaths } from '../../modules/accounting/infrastructure/accounting.openapi.js'
import { adminOpenApiPaths } from '../../modules/admin/infrastructure/admin.openapi.js'
import { auditoriaOpenApiPaths } from '../../modules/auditoria/infrastructure/auditoria.openapi.js'
import { bankingOpenApiPaths } from '../../modules/banking/infrastructure/banking.openapi.js'
import { budgetOpenApiPaths } from '../../modules/budget/infrastructure/budget.openapi.js'
import { debtsOpenApiPaths } from '../../modules/debts/infrastructure/debts.openapi.js'
import { goalsOpenApiPaths } from '../../modules/goals/infrastructure/goals.openapi.js'
import { investmentsOpenApiPaths } from '../../modules/investments/infrastructure/investments.openapi.js'
import { libroOpenApiPaths } from '../../modules/libro/infrastructure/libro.openapi.js'
import { exchangeRatesOpenApiPaths } from '../../modules/money/infrastructure/exchange-rates.openapi.js'
import { projectionOpenApiPaths } from '../../modules/projection/infrastructure/projection.openapi.js'

// Fuera de `main.ts` para que se pueda armar sin levantar el servidor. El front genera sus
// tipos de acá, y atarlos a un proceso escuchando en un puerto significaba que quien tocaba
// un contrato tenía que acordarse de reiniciar la API antes de regenerarlos: el síntoma era
// un tipo viejo que compila y falla en tiempo de ejecución.
// El tipo va escrito y no inferido: con `declaration` encendido, `tsc` no puede nombrar el
// tipo que devuelve `createDocument` sin apuntar a un archivo interno de la librería. Se
// nombra desde la función misma, que sí está importada: `oas31.OpenAPIObject` no sirve
// porque el documento de zod-openapi admite `in: 'querystring'`, que ese tipo no tiene.
export const openApiDocument: ReturnType<typeof createDocument> = createDocument({
  openapi: '3.1.0',
  info: { title: 'Finanzas API', version: '1.0.0' },
  servers: [{ url: '/api/v1' }],
  paths: {
    ...debtsOpenApiPaths,
    ...exchangeRatesOpenApiPaths,
    ...accountingOpenApiPaths,
    ...budgetOpenApiPaths,
    ...goalsOpenApiPaths,
    ...investmentsOpenApiPaths,
    ...projectionOpenApiPaths,
    ...bankingOpenApiPaths,
    ...auditoriaOpenApiPaths,
    ...libroOpenApiPaths,
    ...adminOpenApiPaths,
  },
})
