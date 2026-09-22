import { writeFile } from 'node:fs/promises'
import openapiTS, { astToString } from 'openapi-typescript'

// El archivo que escribe la API, y no un servidor escuchando: el contrato tiene que poder
// regenerarse sin levantar nada, porque atarlo a un proceso significaba que quien tocaba un
// endpoint y no reiniciaba la API se quedaba con tipos viejos que compilan igual.
// `OPENAPI_URL` sigue sirviendo para apuntar a una instancia en marcha.
const source = process.env.OPENAPI_URL ?? new URL('../../api/openapi.json', import.meta.url).href
const target = 'src/lib/api-types.gen.ts'

// Se usa la API de la librería en vez de lanzar el CLI: un subproceso con npx no es
// portable en Windows y obliga a elegir entre un .cmd que Node no puede lanzar sin
// shell y un shell que concatena los argumentos sin escaparlos.
const ast = await openapiTS(new URL(source))
await writeFile(target, astToString(ast))

console.log(`${source} -> ${target}`)
