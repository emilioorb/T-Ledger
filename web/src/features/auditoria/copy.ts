// El registro de auditoría. El tono es el del resto: se dice qué pasó, sin adjetivos.
export const copy = {
  nav: { auditLog: 'Registro' },
  audit: {
    title: 'Registro',
    description: 'Quién cambió qué en este libro, del cambio más reciente al más viejo.',
    // Qué se está mirando, arriba de la tabla.
    filterEntity: 'Qué',
    search: {
      label: 'Buscar en el registro',
      // Corto a propósito: el campo mide veinte caracteres de ancho y el anterior se cortaba
      // en «por lo que camt», que es peor que no explicar nada.
      placeholder: 'Buscar persona o cambio…',
    },
    noResults: {
      title: 'Nada coincide con esa búsqueda',
      description: 'Probá con otra palabra, o quitá el filtro de arriba.',
    },
    allEntities: 'Todo',
    // Nombres de cosas, no de tablas: quien lee esto no sabe qué es una «entity».
    entities: {
      movimiento: 'Movimientos',
      periodo: 'Meses',
      deuda: 'Deudas',
      meta: 'Metas',
      inversion: 'Inversiones',
      presupuesto: 'Presupuestos',
      miembro: 'Personas',
      libro: 'El libro',
    },
    // Cada acción se lee como una frase terminada, porque en la tabla va sola.
    actions: {
      crear: 'creó',
      editar: 'editó',
      aportar: 'aportó a',
      eliminar: 'eliminó',
      anular: 'anuló',
      cerrar: 'cerró',
      reabrir: 'reabrió',
      vaciar: 'vació',
    },
    // Singular: la fila cuenta un hecho, no una categoría.
    singular: {
      movimiento: 'un movimiento',
      periodo: 'un mes',
      deuda: 'una deuda',
      meta: 'una meta',
      inversion: 'una inversión',
      presupuesto: 'un presupuesto',
      miembro: 'una persona',
      // «vació el libro» y no «vació un libro»: es este, el que se está mirando.
      libro: 'el libro',
    },
    columns: { when: 'Cuándo', who: 'Quién', what: 'Qué pasó', changes: 'Detalle' },
    // Los campos se guardan con el nombre que tienen en el código, pero el registro lo lee una
    // persona: «desiredDate» no le dice nada a quien quiere saber si le movieron la fecha de
    // una meta. Lo que no esté acá se muestra tal cual, que es mejor que ocultarlo.
    fields: {
      date: 'fecha',
      kind: 'tipo',
      categoryId: 'categoría',
      counterparty: 'a quién',
      amount: 'monto',
      paymentAccountCode: 'cuenta de pago',
      receiptKey: 'comprobante',
      status: 'estado',
      name: 'nombre',
      target: 'objetivo',
      desiredDate: 'fecha deseada',
      priority: 'prioridad',
      accountCode: 'cuenta',
      principal: 'capital',
      rate: 'tasa',
      termMonths: 'plazo en meses',
      startDate: 'fecha de inicio',
      direction: 'dirección',
      budgetBucket: 'cubeta',
      buckets: 'cubetas',
      percentage: 'porcentaje',
      isSavings: 'es ahorro',
      currency: 'moneda',
      expectedReturn: 'rendimiento esperado',
      maturityDate: 'fecha de vencimiento',
    } as Record<string, string>,
    // Los valores que el dominio guarda en inglés porque son enumeraciones del código. En el
    // registro los lee una persona, así que se traducen igual que los nombres de campo.
    values: {
      EXPENSE: 'gasto',
      INCOME: 'ingreso',
      ACTIVE: 'activo',
      VOIDED: 'anulado',
      MONTHLY: 'mensual',
      ANNUAL: 'anual',
      FRENCH: 'cuota fija',
      GERMAN: 'amortización constante',
      INTEREST_FREE: 'sin intereses',
      BORROWED: 'prestada',
      LENT: 'prestada a alguien',
    } as Record<string, string>,
    // Cuando la cuenta ya no existe. Las entradas no se borran con la persona: serían
    // agujeros en la historia justo donde alguien querría mirar.
    deletedUser: 'Cuenta eliminada',
    // Abrir la fila para ver el detalle entero. El rótulo dice qué va a pasar, que es lo que
    // un lector de pantalla necesita para decidir si vale la pena activarlo.
    expand: 'Ver el detalle completo',
    collapse: 'Ocultar el detalle',
    // Un cierre de mes o una anulación no cambian campos: cambian el estado, y eso ya lo dice
    // la acción. Decir «sin cambios» sería sugerir que se buscó y no se encontró nada.
    noFields: '—',
    fieldChange: (campo: string) => campo,
    loading: 'Cargando el registro',
    error: {
      title: 'No se pudo cargar el registro',
      description: 'El servidor no contestó. Probá de nuevo.',
      retry: 'Reintentar',
    },
    empty: {
      title: 'Todavía no hay nada registrado',
      description:
        'Acá van a aparecer los cambios en movimientos, meses, deudas, metas, inversiones, presupuestos y personas del libro.',
    },
    pager: {
      previous: 'Anterior',
      next: 'Siguiente',
      range: (from: number, to: number, total: number) => `${from}–${to} de ${total}`,
    },
  },
} as const
