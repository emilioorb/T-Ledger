#!/usr/bin/env node
// Qué parte de las líneas que cambiaron está cubierta por tests. Lee el lcov que la suite ya
// escribió (`vitest --coverage`) y lo cruza con el diff contra la rama base: no vuelve a
// correr nada. Una línea que el lcov no lista no es ejecutable (tipos, llaves, comentarios)
// y no cuenta.
// Uso: node scripts/cobertura-de-lo-nuevo.mjs [--base <ref>] [--estricto]
// Avisa por defecto; con --estricto sale con 1 si queda por debajo del umbral.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'

const UMBRAL = 80
const PROYECTOS = ['api', 'web']
const indice = process.argv.indexOf('--base')
const base = indice > -1 ? process.argv[indice + 1] : 'origin/main'
const estricto = process.argv.includes('--estricto')

const git = (args) => execFileSync('git', args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 })

let mergeBase
try {
  mergeBase = git(['merge-base', base, 'HEAD']).trim()
} catch {
  console.error(`cobertura-de-lo-nuevo: no hay merge base contra ${base}`)
  process.exit(2)
}

// { 'web/src/lib/api.ts': Map<línea, veces> }
const cubiertas = new Map()
for (const proyecto of PROYECTOS) {
  const lcov = path.join(proyecto, 'coverage', 'lcov.info')
  if (!existsSync(lcov)) continue
  let actual
  for (const linea of readFileSync(lcov, 'utf8').split('\n')) {
    if (linea.startsWith('SF:')) {
      const relativo = path.relative(process.cwd(), path.resolve(proyecto, linea.slice(3).trim()))
      actual = new Map()
      cubiertas.set(relativo.split(path.sep).join('/'), actual)
    } else if (linea.startsWith('DA:') && actual) {
      const [numero, veces] = linea.slice(3).split(',').map(Number)
      actual.set(numero, veces)
    }
  }
}

const esFuente = (archivo) =>
  /^(api|web)\/src\/.*\.tsx?$/.test(archivo) && !/\.(spec|test)\.tsx?$/.test(archivo)

const cambiadas = new Map()
const nuevos = git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(esFuente)
for (const archivo of nuevos) {
  const total = readFileSync(archivo, 'utf8').split('\n').length
  cambiadas.set(archivo, Array.from({ length: total }, (_, i) => i + 1))
}
let archivo = ''
for (const linea of git(['diff', '--unified=0', mergeBase, '--']).split('\n')) {
  if (linea.startsWith('+++ ')) archivo = linea.slice(4).replace(/^b\//, '')
  const bloque = linea.match(/^@@ -\S+ \+(\d+)(?:,(\d+))? @@/)
  if (!bloque || !esFuente(archivo)) continue
  const desde = Number(bloque[1])
  const cuantas = bloque[2] === undefined ? 1 : Number(bloque[2])
  const lista = cambiadas.get(archivo) ?? []
  for (let n = desde; n < desde + cuantas; n += 1) lista.push(n)
  cambiadas.set(archivo, lista)
}

let ejecutables = 0
let cubiertasPorTests = 0
const sinCubrir = []
for (const [en, lineas] of cambiadas) {
  const mapa = cubiertas.get(en)
  if (!mapa) continue
  for (const n of lineas) {
    if (!mapa.has(n)) continue
    ejecutables += 1
    if ((mapa.get(n) ?? 0) > 0) cubiertasPorTests += 1
    else sinCubrir.push(`${en}:${n}`)
  }
}

if (ejecutables === 0) {
  console.log('cobertura-de-lo-nuevo: ninguna línea ejecutable cambió (o falta correr la suite con --coverage)')
  process.exit(0)
}
const porcentaje = (cubiertasPorTests / ejecutables) * 100
console.log(`cobertura-de-lo-nuevo: ${porcentaje.toFixed(1)} % (${cubiertasPorTests}/${ejecutables} líneas), umbral ${UMBRAL} %`)
if (porcentaje >= UMBRAL) process.exit(0)
for (const lugar of sinCubrir.slice(0, 20)) console.log(`  sin cubrir: ${lugar}`)
process.exit(estricto ? 1 : 0)
