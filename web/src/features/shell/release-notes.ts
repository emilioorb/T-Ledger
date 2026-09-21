// Las notas se escriben a mano a partir del historial: un mensaje de commit dice qué se
// tocó, no qué cambia para quien usa la app, y la traducción entre las dos cosas no se
// puede automatizar. Lo que no cambia nada en pantalla no se anota.
export interface Release {
  date: string
  // Solo va donde exista de verdad. Mientras el paquete siga en 0.0.0, la fecha es el
  // único identificador honesto de una entrega.
  version?: string
  added: string[]
  improved: string[]
  fixed: string[]
}

export const releases: Release[] = [
  {
    date: '2026-09-21',
    added: [
      'Patrimonio en una sola moneda, con el efecto del tipo de cambio mostrado aparte.',
      'Sección de banco, con cuentas bancarias, importación de extractos y conciliación.',
      'Importación de extractos CSV con vista previa del mapeo antes de confirmar.',
      'Conciliación con sugerencias de coincidencia y acciones sobre cada línea del banco.',
      'Detalle de una meta con su historial de aportes, y de una inversión con la curva de cómo crece.',
      'Atajos de teclado: g y una letra para ir a una pantalla, n para la acción principal, ? para ver la lista.',
    ],
    improved: [
      'Movimientos, asientos y conciliación se paginan de verdad, y el paginador nombra el tramo que estás viendo.',
      'La proyección deja a la vista los meses que cambian algo y esconde el desglose repetido detrás de un interruptor.',
      'Movimientos pasa a tabla, con búsqueda por contraparte sobre todo el historial y no sobre la página cargada.',
      'El rango de fechas se elige en un calendario de dos meses en lugar de dos campos sueltos.',
      'Los formularios cortos se abren en un modal y los largos se quedan en pantalla.',
      'Las explicaciones de los controles se alcanzan con el toque y con el teclado, no solo pasando el puntero.',
      'Una línea mal conciliada se puede deshacer, y un perfil de importación mal mapeado se puede editar.',
      'La advertencia pasa a naranja, y se separa del negativo por claridad además de por matiz.',
    ],
    fixed: [
      'Con la consulta caída, el panel afirmaba que ninguna cubeta se había pasado y que ninguna cuota se liberaba.',
      'El presupuesto llamaba «Sin asignar» a lo que en realidad era «Sin gastar».',
      'La conciliación ofrecía crear una cuenta que ya existía, y no decía de qué lado sobraba la diferencia.',
      'Una dirección inexistente mostraba «Not Found» en inglés y con la miga de otra pantalla.',
      'Un select dentro de un formulario desalineaba el resto de su fila.',
      'Los campos numéricos pierden las flechitas de incremento, que además corrían el texto.',
    ],
  },
  {
    date: '2026-09-20',
    added: [
      'Deudas y préstamos otorgados, con tabla de amortización y simulador de abono extraordinario.',
      'Plan de pago que ordena las deudas por avalancha, bola de nieve o a mano.',
      'Contabilidad de partida doble: plan de cuentas, asientos, categorías y movimientos que arman su asiento.',
      'Mayor, balance de comprobación, estado de situación y estado de resultados.',
      'Cierre mensual que bloquea el período, con reapertura.',
      'Exportación a CSV de los reportes de contabilidad.',
      'Tipos de cambio del BCCR al día, con un indicador que avisa cuando la tasa quedó vieja.',
      'Presupuesto por porcentajes, evaluado cubeta por cubeta contra los asientos del período.',
      'Metas con el aporte requerido y la fecha en que se alcanzan.',
      'Inversiones con capitalización y valor proyectado.',
      'Proyección de flujo de caja mes a mes.',
      'Panel general que responde qué pasa este mes.',
      'Navegación con barra lateral, miga de pan y tema claro u oscuro.',
      'Búsqueda y orden por columna en las tablas de deudas y préstamos.',
    ],
    improved: [
      'El alta y la edición de una deuda pasan a pantallas propias, en vez de un modal apretado.',
      'Editar y borrar se hacen desde la misma fila, con confirmación.',
      'El contenido abarca el ancho del panel y el formulario de deuda se reparte en tres columnas.',
      'El tema se cambia con una sola fila del menú, que dice a cuál se va.',
    ],
    fixed: [
      'Las listas de deudas mostraban solo las primeras filas sin avisar que algo quedaba fuera.',
    ],
  },
]
