// De un `user-agent` a algo que alguien pueda reconocer como suyo.
//
// No es identificación de dispositivos: es la pregunta «¿esta sesión abierta soy yo?», y para
// contestarla alcanza con el navegador y el sistema. Por eso son pocas reglas y en orden, no
// una librería de dos mil: lo que no se reconoce se dice que no se reconoce, que es más útil
// que inventar un nombre.
const NAVEGADORES: [RegExp, string][] = [
  // Edge y Opera van antes que Chrome porque los dos se anuncian también como Chrome, y Chrome
  // antes que Safari por lo mismo. El orden ES la regla.
  [/Edg\//, 'Edge'],
  [/OPR\/|Opera/, 'Opera'],
  [/Firefox\//, 'Firefox'],
  [/Chrome\//, 'Chrome'],
  [/Safari\//, 'Safari'],
]

const SISTEMAS: [RegExp, string][] = [
  // iPadOS se anuncia como Macintosh en modo escritorio, así que iPad va antes que Mac.
  [/iPad/, 'iPad'],
  [/iPhone/, 'iPhone'],
  [/Android/, 'Android'],
  [/Windows/, 'Windows'],
  [/Mac OS X|Macintosh/, 'Mac'],
  [/Linux/, 'Linux'],
]

const primero = (reglas: [RegExp, string][], texto: string): string | null =>
  reglas.find(([patron]) => patron.test(texto))?.[1] ?? null

export const describirAparato = (userAgent: string | null | undefined): string | null => {
  if (!userAgent) return null

  const navegador = primero(NAVEGADORES, userAgent)
  const sistema = primero(SISTEMAS, userAgent)

  if (navegador && sistema) return `${navegador} en ${sistema}`
  return navegador ?? sistema
}
