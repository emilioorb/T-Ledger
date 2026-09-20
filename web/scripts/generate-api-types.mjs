import { writeFile } from 'node:fs/promises'
import openapiTS, { astToString } from 'openapi-typescript'

const source = process.env.OPENAPI_URL ?? 'http://localhost:3000/api/v1/openapi.json'
const target = 'src/lib/api-types.gen.ts'

// Se usa la API de la librería en vez de lanzar el CLI: un subproceso con npx no es
// portable en Windows y obliga a elegir entre un .cmd que Node no puede lanzar sin
// shell y un shell que concatena los argumentos sin escaparlos.
const ast = await openapiTS(new URL(source))
await writeFile(target, astToString(ast))

console.log(`${source} -> ${target}`)
