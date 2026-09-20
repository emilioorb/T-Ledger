const lastDayOfMonth = (year: number, monthIndex: number): number =>
  new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()

// Avanza meses en UTC recortando el día cuando el mes destino es más corto:
// el 31 de enero más un mes es el 28 o 29 de febrero, no el 2 o 3 de marzo.
export const addMonths = (date: Date, months: number): Date => {
  const year = date.getUTCFullYear()
  const monthIndex = date.getUTCMonth() + months
  const day = Math.min(
    date.getUTCDate(),
    lastDayOfMonth(year + Math.floor(monthIndex / 12), ((monthIndex % 12) + 12) % 12),
  )
  return new Date(Date.UTC(year, monthIndex, day))
}
