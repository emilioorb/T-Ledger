import type { Money } from '../../../shared/kernel/money.js'
import type { StoredBankLine } from './bank-line.js'

export type MatchReason = 'EXACT' | 'NEAR_DATE' | 'REFERENCE'

export interface MovementCandidate {
  readonly id: string
  readonly date: Date
  readonly amount: Money
  readonly receiptUrl: string | null
  readonly kind: 'EXPENSE' | 'INCOME'
}

export interface MatchSuggestion {
  readonly lineId: string
  readonly movementId: string
  readonly score: number
  readonly reason: MatchReason
  readonly ambiguous: boolean
}

const NEAR_DAYS = 3
const MS_PER_DAY = 86_400_000

const daysApart = (a: Date, b: Date): number => Math.abs(a.getTime() - b.getTime()) / MS_PER_DAY

// El signo de la línea decide qué puede ser: lo que sale de la cuenta solo puede ser un gasto.
const kindOf = (line: StoredBankLine): 'EXPENSE' | 'INCOME' =>
  line.amount.isNegative() ? 'EXPENSE' : 'INCOME'

const sameAmount = (line: StoredBankLine, candidate: MovementCandidate): boolean => {
  const magnitude = line.amount.isNegative() ? line.amount.negate() : line.amount
  return magnitude.equals(candidate.amount)
}

const scoreOf = (
  line: StoredBankLine,
  candidate: MovementCandidate,
): { score: number; reason: MatchReason } | null => {
  if (kindOf(line) !== candidate.kind) return null

  if (sameAmount(line, candidate)) {
    const apart = daysApart(line.date, candidate.date)
    if (apart === 0) return { score: 100, reason: 'EXACT' }
    if (apart <= NEAR_DAYS) return { score: 80, reason: 'NEAR_DATE' }
  }

  const reference = line.reference?.trim()
  if (reference && candidate.receiptUrl?.includes(reference)) {
    return { score: 70, reason: 'REFERENCE' }
  }

  return null
}

// Se arman todos los pares posibles, se ordenan por puntaje y se van tomando mientras ni la
// línea ni el movimiento estén ya tomados. Cuando dos candidatos empatan en el mejor puntaje de
// una línea, salen los dos marcados como ambiguos: ofrecer uno solo y esconder el otro sería
// elegir por Emilio sin decírselo.
export const suggestMatches = (
  lines: readonly StoredBankLine[],
  candidates: readonly MovementCandidate[],
): MatchSuggestion[] => {
  const pairs = lines.flatMap((line) =>
    candidates.flatMap((candidate) => {
      const scored = scoreOf(line, candidate)
      return scored ? [{ line, candidate, ...scored }] : []
    }),
  )

  pairs.sort((a, b) => b.score - a.score || a.line.id.localeCompare(b.line.id))

  const takenLines = new Set<string>()
  const takenMovements = new Set<string>()
  const suggestions: MatchSuggestion[] = []

  for (const pair of pairs) {
    if (takenLines.has(pair.line.id) || takenMovements.has(pair.candidate.id)) continue

    const tied = pairs.filter(
      (other) =>
        other.line.id === pair.line.id &&
        other.score === pair.score &&
        other.candidate.id !== pair.candidate.id &&
        !takenMovements.has(other.candidate.id),
    )

    suggestions.push({
      lineId: pair.line.id,
      movementId: pair.candidate.id,
      score: pair.score,
      reason: pair.reason,
      ambiguous: tied.length > 0,
    })

    for (const other of tied) {
      suggestions.push({
        lineId: other.line.id,
        movementId: other.candidate.id,
        score: other.score,
        reason: other.reason,
        ambiguous: true,
      })
      takenMovements.add(other.candidate.id)
    }

    takenLines.add(pair.line.id)
    takenMovements.add(pair.candidate.id)
  }

  return suggestions
}
