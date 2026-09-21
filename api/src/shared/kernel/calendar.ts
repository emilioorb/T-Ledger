// `Date.UTC` normaliza el desborde en silencio: el 30 de febrero se guarda como 2 de marzo
// y nadie se entera. El ida y vuelta es lo único que lo detecta, y de paso delata el
// archivo que viene en mm/dd cuando el perfil dice DD/MM.
export const toUtcDate = (year: number, month: number, day: number): Date | null => {
  const date = new Date(Date.UTC(year, month - 1, day))
  const sameDay =
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  return sameDay ? date : null
}
