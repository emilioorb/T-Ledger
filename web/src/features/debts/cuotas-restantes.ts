// Las que faltan pagar, sin importar si ya vencieron: una atrasada sigue siendo una cuota que
// queda por delante.
export const cuotasRestantes = (cuotas: readonly { status: string }[]): number =>
  cuotas.filter((cuota) => cuota.status !== 'PAID').length
