#!/usr/bin/env node
// El piso de CONSTRAINTS.md, mirado solo sobre el diff contra la rama base. Adaptado de la
// referencia de constraint-driven-development (addy agent-skills): mismo contrato de salida.
// Uso: node scripts/guardia-del-piso.mjs [--base <ref>]   (por defecto, origin/main)
// Sale con 0 si está limpio, 1 si algo baja la vara y 2 si no pudo correr.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'

const indice = process.argv.indexOf('--base')
const base = indice > -1 ? process.argv[indice + 1] : 'origin/main'

const git = (args) => {
  try {
    return execFileSync('git', args, {
      encoding: 'utf8',
      maxBuffer: 64 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
  } catch (error) {
    // `git diff --no-index` sale con 1 cuando hay diferencias, que es lo esperado.
    return error.stdout ?? null
  }
}

const mergeBase = git(['merge-base', base, 'HEAD'])?.trim()
if (!mergeBase) {
  console.error(`guardia-del-piso: no hay merge base contra ${base}`)
  process.exit(2)
}

// Los archivos que definen los patrones se nombrarían a sí mismos.
const PROPIOS = new Set(['scripts/guardia-del-piso.mjs', 'CONSTRAINTS.md'])
const ignorados = existsSync('.constraintsignore')
  ? readFileSync('.constraintsignore', 'utf8').split('\n').map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))
  : []
const ignorado = (archivo) => ignorados.some((prefijo) => archivo.startsWith(prefijo))

const seguidos = git(['diff', '--unified=0', mergeBase, '--']) ?? ''
const nuevos = (git(['ls-files', '--others', '--exclude-standard']) ?? '')
  .split('\n')
  .filter(Boolean)
  .map((archivo) => git(['diff', '--no-index', '--unified=0', '/dev/null', archivo]) ?? '')
  .join('\n')

const agregadas = []
const quitadas = []
let archivo = ''
for (const linea of `${seguidos}\n${nuevos}`.split('\n')) {
  if (linea.startsWith('+++ ')) archivo = linea.slice(4).replace(/^b\//, '')
  else if (linea.startsWith('--- ')) continue
  else if (linea.startsWith('+')) agregadas.push({ archivo, texto: linea.slice(1) })
  else if (linea.startsWith('-')) quitadas.push({ archivo, texto: linea.slice(1) })
}

const hallazgos = []
const marcar = (regla, en, texto) => hallazgos.push({ regla, en, texto: texto.trim().slice(0, 120) })

const SILENCIOS = /@ts-ignore|@ts-nocheck|@ts-expect-error|eslint-disable|oxlint-disable|istanbul ignore|v8 ignore|c8 ignore|nosemgrep|gitleaks:allow|Stryker disable/
// Sin /i: en castellano «Todo» es una palabra, no un pendiente.
const SIN_TERMINAR = /throw new Error\(.*([Nn]ot implemented|[Ss]in implementar)|catch\s*(\(\w*\))?\s*\{\s*\}|\bTODO\b|\bFIXME\b/
const esCodigo = (en) => /\.(m?[jt]sx?|cjs)$/.test(en)
const TESTS_SALTADOS = /\b(it|test|describe)\.(skip|todo|only)\b|\bx(it|describe)\(/

for (const { archivo: en, texto } of agregadas) {
  if (PROPIOS.has(en) || ignorado(en)) continue
  if (!esCodigo(en)) continue
  if (SILENCIOS.test(texto)) marcar('checker-silenciado', en, texto)
  if (SIN_TERMINAR.test(texto)) marcar('trabajo-sin-terminar', en, texto)
  if (TESTS_SALTADOS.test(texto)) marcar('test-mas-facil', en, texto)
}

const esTest = (en) => /\.(spec|test)\.[jt]sx?$/.test(en)
// Llamadas y no la palabra: un `import { expect }` que cambia no es una aserción que se va.
const ASERCION = /\bexpect\(|\bassert[.(]/g
for (const { archivo: en, texto } of quitadas) {
  if (esTest(en) && new RegExp(ASERCION.source).test(texto)) marcar('asercion-quitada', en, texto)
}

// Un test que cambió de extensión (.ts → .tsx) no está borrado, aunque cambie tanto que git no
// lo reconozca como renombre. Pero solo si el de la extensión nueva es nuevo en este diff (si ya
// existía, borrar el otro es borrar tests) y trae al menos tantas aserciones como el borrado.
const aserciones = (texto) => (texto.match(ASERCION) ?? []).length
const nuevosEnElDiff = new Set([
  ...(git(['diff', '--name-only', '--diff-filter=A', mergeBase, '--']) ?? '').split('\n'),
  ...(git(['ls-files', '--others', '--exclude-standard']) ?? '').split('\n'),
])
const movidoConSusAserciones = (en) => {
  const antes = aserciones(git(['show', `${mergeBase}:${en}`]) ?? '')
  return ['.ts', '.tsx', '.js', '.jsx']
    .map((extension) => en.replace(/\.[jt]sx?$/, extension))
    .some((hermano) => hermano !== en && nuevosEnElDiff.has(hermano) && existsSync(hermano) && aserciones(readFileSync(hermano, 'utf8')) >= antes)
}
const borrados = (git(['diff', '--name-only', '--diff-filter=D', '-M', mergeBase, '--']) ?? '').split('\n')
for (const en of borrados) if (esTest(en) && !movidoConSusAserciones(en)) marcar('test-borrado', en, en)

// CONSTRAINTS.md: una fila de excepción nueva, o un número que bajó en una fila que siguió.
const numeros = (s) => (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => Number(n.replace(',', '.')))
const clave = (s) => s.split('|')[1]?.trim() ?? s.split(':')[0]
// El commit que crea el archivo fija la vara inicial: no hay contra qué compararla.
const existiaEnLaBase = (() => {
  try {
    execFileSync('git', ['cat-file', '-e', `${mergeBase}:CONSTRAINTS.md`], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
})()
const enConstraints = (lineas) =>
  existiaEnLaBase ? lineas.filter((l) => l.archivo === 'CONSTRAINTS.md') : []
for (const { texto } of enConstraints(agregadas)) {
  if (/^\|\s*E\d+\s*\|/.test(texto)) marcar('excepcion-nueva', 'CONSTRAINTS.md', texto)
}
for (const antes of enConstraints(quitadas)) {
  const despues = enConstraints(agregadas).find((l) => clave(l.texto) === clave(antes.texto))
  if (!despues) {
    if (/^\s*-\s/.test(antes.texto)) marcar('piso-quitado', 'CONSTRAINTS.md', antes.texto)
    continue
  }
  // Apretar es silencioso, aflojar no. La fila dice hacia dónde no puede moverse; sin
  // dirección declarada, cualquier cambio se trata como aflojar.
  const [a, d] = [numeros(antes.texto), numeros(despues.texto)]
  const afloja = (n, i) => {
    if (a[i] === undefined || n === a[i]) return false
    if (/no baja/i.test(antes.texto)) return n < a[i]
    if (/no sube/i.test(antes.texto)) return n > a[i]
    return true
  }
  if (d.some(afloja)) marcar('umbral-aflojado', 'CONSTRAINTS.md', `${antes.texto}  →  ${despues.texto}`)
}

if (hallazgos.length === 0) {
  console.log('guardia-del-piso: limpio')
  process.exit(0)
}
console.error(`guardia-del-piso: ${hallazgos.length} cosa(s) que bajan la vara:`)
for (const h of hallazgos) console.error(`  [${h.regla}] ${h.en}: ${h.texto}`)
console.error('\nArreglá el código, o pasalo por una excepción anotada en CONSTRAINTS.md.')
process.exit(1)
