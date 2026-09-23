type Consulta = (medios: string) => { matches: boolean }

// El campo de puntos es decoración, y cuesta: en una traza de la portada con el móvil de
// PageSpeed, compilar y arrancar three.js se llevó ~690 ms de tiempo trabado después del primer
// pintado (CONSTRAINTS.md, excepción E2). En una pantalla táctil (teléfono o tablet) la portada va
// en papel liso; con mouse, con sus puntos.
export const llevaFondo = (consultar: Consulta = window.matchMedia.bind(window)): boolean =>
  !consultar('(pointer: coarse)').matches
