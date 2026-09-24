export class NotFoundError extends Error {
  readonly code = 'NOT_FOUND'
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  readonly code = 'CONFLICT'
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

export class SemanticValidationError extends Error {
  readonly code = 'SEMANTIC_VALIDATION_ERROR'
  constructor(
    message: string,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'SemanticValidationError'
  }
}

// Lo que se quería guardar cambió desde que se leyó: otra pestaña, otra persona o el mismo
// formulario abierto dos veces. El mensaje no culpa a nadie porque no se sabe quién fue.
export class EditadoPorOtroError extends Error {
  readonly code = 'EDITADO_POR_OTRO'
  constructor() {
    super('Esto cambió mientras lo editabas. Cargá lo último para ver cómo quedó antes de guardar.')
    this.name = 'EditadoPorOtroError'
  }
}
