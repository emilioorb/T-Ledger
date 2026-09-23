const RAIZ_VACIA = '<div id="root"></div>'

// Pegado al div, sin saltos de línea: un espacio de más adentro del #root ya es un nodo que el
// cliente no renderiza, y la hidratación no calza.
// https://react.dev/reference/react-dom/client/hydrateRoot#hydrating-server-rendered-html
export const inyectarPortada = (plantilla: string, portada: string): string => {
  if (!plantilla.includes(RAIZ_VACIA)) {
    throw new Error(`La plantilla no tiene un ${RAIZ_VACIA} vacío donde escribir la portada (#root)`)
  }
  // Con una función y no un string: así `$&` o `$'` en la portada se escriben tal cual, en vez
  // de interpretarse como patrones de reemplazo.
  return plantilla.replace(RAIZ_VACIA, () => `<div id="root">${portada}</div>`)
}
