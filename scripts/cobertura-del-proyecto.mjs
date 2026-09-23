#!/usr/bin/env node
// El trinquete de la cobertura: compara el coverage-summary.json de cada proyecto contra el
// valor anotado en CONSTRAINTS.md, que es la única fuente del número. Avisa si bajó más que
// la tolerancia; si subió, sugiere anotar el valor nuevo.
// Uso: node scripts/cobertura-del-proyecto.mjs [--estricto]
import { existsSync, readFileSync } from 'node:fs'

const TOLERANCIA = 0.5
const estricto = process.argv.includes('--estricto')
const constraints = readFileSync('CONSTRAINTS.md', 'utf8')

let bajo = false
for (const proyecto of ['api', 'web']) {
  const fila = constraints.match(new RegExp(`\\|\\s*Cobertura de líneas \\(${proyecto}\\)\\s*\\|\\s*([\\d.,]+)`))
  const resumen = `${proyecto}/coverage/coverage-summary.json`
  if (!fila || !existsSync(resumen)) {
    console.log(`cobertura-del-proyecto: ${proyecto} sin fila en CONSTRAINTS.md o sin correr --coverage`)
    continue
  }
  const anotado = Number(fila[1].replace(',', '.'))
  const hoy = JSON.parse(readFileSync(resumen, 'utf8')).total.lines.pct
  const estado = hoy < anotado - TOLERANCIA ? 'BAJÓ' : hoy > anotado + TOLERANCIA ? 'subió: anotá el valor nuevo' : 'igual'
  if (hoy < anotado - TOLERANCIA) bajo = true
  console.log(`cobertura-del-proyecto: ${proyecto} ${hoy} % contra ${anotado} % anotado (${estado})`)
}
process.exit(bajo && estricto ? 1 : 0)
