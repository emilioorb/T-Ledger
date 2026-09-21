// Un atajo que hay que adivinar no existe. El copy nombra la tecla y lo que hace, en el
// mismo idioma que el resto: «ir a», no «navegar a».
export const copy = {
  shortcuts: {
    title: 'Atajos de teclado',
    description: 'Funcionan desde cualquier pantalla, salvo mientras escribís en un campo.',
    close: 'Cerrar',
    groups: {
      navigation: 'Ir a',
      actions: 'En esta pantalla',
    },
    prefixHint: 'Primero g, después la letra.',
    help: 'Ver los atajos',
    noAction: 'Esta pantalla no tiene una acción principal.',
    keys: {
      help: '?',
      primary: 'n',
    },
  },
} as const
