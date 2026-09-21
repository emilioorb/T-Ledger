// Un enlace de texto mide lo que su renglón: con el dedo, 16 px de alto se falla. El relleno
// vertical agranda el área de toque sin mover nada, porque en un elemento en línea no cambia
// la altura de la línea.
export const TEXT_LINK =
  'text-muted-foreground underline underline-offset-2 hover:text-foreground pointer-coarse:py-1.5'
