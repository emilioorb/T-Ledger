// Las fechas llegan de la API como AAAA-MM-DD y se muestran sin pasar por Date:
// construir un Date con esa cadena y formatearlo en local desplaza el día.
export const formatIsoDate = (iso: string): string => {
  const [year, month, day] = iso.split('-')
  return year && month && day ? `${day}/${month}/${year}` : iso
}

export const formatIsoMonth = (iso: string): string => {
  const [year, month] = iso.split('-')
  return year && month ? `${month}/${year}` : iso
}
