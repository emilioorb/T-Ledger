import { writeFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { openApiDocument } from '../src/shared/http/openapi.document.js'

// El contrato a un archivo, sin levantar el servidor. Es lo que consume `npm run api:types`
// del front: antes había que acordarse de reiniciar la API después de tocar un endpoint, y
// olvidarlo dejaba tipos viejos que compilan igual.
const destino = fileURLToPath(new URL('../openapi.json', import.meta.url))
writeFileSync(destino, `${JSON.stringify(openApiDocument, null, 2)}\n`)
console.log(destino)
