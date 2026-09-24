// A dónde volver después de entrar, solo si es una ruta de acá. Hoy el router ya no saldría del
// sitio con un `//otro.com` ni con un `https://`, pero que dependa de cómo se comporte la
// librería en la próxima versión es dejar abierta una redirección hacia afuera.
export const destinoPropio = (valor: unknown): string | undefined =>
  typeof valor === 'string' && /^\/(?![/\\])/.test(valor) ? valor : undefined
