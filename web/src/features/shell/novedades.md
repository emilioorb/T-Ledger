# Novedades

Las notas se escriben a mano a partir del historial: un mensaje de commit dice qué se tocó,
no qué cambia para quien usa la app, y la traducción entre las dos cosas no se puede
automatizar. Lo que no cambia nada en pantalla no se anota.

Cada entrega abre con `## AAAA-MM-DD`, y con `· vX.Y.Z` al lado cuando tenga versión. Adentro
van hasta tres grupos, `### Nuevo`, `### Mejorado` y `### Corregido`, con Markdown libre:
**negritas**, `código`, enlaces, listas anidadas y tablas. Lo que esté antes de la primera
entrega, como este texto, no se muestra.

Criterio: la negrita marca **de qué** habla la nota, para que la lista se pueda escanear sin
leerla entera. Las teclas y los formatos van como código.

## 2026-09-22 · v1.0.0

### Nuevo

- **Una portada pública** en la raíz del dominio: la página entera es una cuenta T, con el
  titular partido por la pata y tres asientos de ejemplo.
  - **Los totales corren como una sumadora** mientras se escribe cada asiento, y la doble
    raya se traza cuando cuadran.
  - **Pedir acceso** abre la dirección de correo con un botón de copiar, sin guardar nada.
- **El tablero se muda a** `/tablero`, y la raíz queda para la portada.
- **Tema claro u oscuro en las pantallas de entrada**, con un botón flotante; entrar y crear
  cuenta siguen lo que se elija en la portada.
- **Novedades y la guía en Markdown**: negritas, código, enlaces y listas anidadas.
- **Cuentas y libros**: se entra con correo y contraseña, por invitación, y cada persona puede
  llevar varios libros —el personal, el de la casa, el de la familia— con su gente y tres roles.
- **Una cuenta de administración** para la instancia, y **la pantalla de tu cuenta**.
- **El registro de auditoría** dice quién cambió qué en el libro, y quién sumó o sacó gente.
- **Comprobantes** adjuntos a cada movimiento, y la tabla dice en qué se fue la plata.
- **Colores propios** para cada cubeta y cada categoría.
- **El tablero** abre diciendo qué día es y cómo va el mes, y cada cifra dice cuánto cambió
  desde el mes pasado.
- **Nimbo**, una nube en la esquina que pone cara según cómo va el mes.

### Mejorado

- **La guía** se pliega en un índice: el mapa entero entra de una mirada.
- **Novedades** se lee como una bitácora de entregas.
- **El fondo de puntos** es uno solo para la portada, entrar y crear cuenta: ya no se
  reinicia al pasar de una a otra, y aparece de a poco cuando el lienzo está listo.
- **Las negritas** de la guía y de las novedades pesan más, y se distinguen del texto.
- **La portada entra entera** en una laptop de poco alto, sin desplazamiento.

### Corregido

- **Al pasar de la portada a entrar** en tema oscuro, la pantalla se veía gris unos
  400 ms: el fondo de puntos pintaba su papel más oscuro de lo que pedía el tema.
- **El buscador de la guía** cortaba su texto de ayuda.
- **El tablero** usaba anchos y colores que hacían leer mal las cifras.
- **Un monto mal escrito** devolvía un error del servidor en lugar de decir qué estaba mal.

## 2026-09-21

### Nuevo

- **Patrimonio en una sola moneda**, con el efecto del tipo de cambio mostrado aparte.
- **Sección de banco**, con cuentas bancarias, importación de extractos y conciliación.
- **Importación de extractos** `CSV`, con vista previa del mapeo antes de confirmar.
- **Conciliación** con sugerencias de coincidencia y acciones sobre cada línea del banco.
- **Detalle de una meta** con su historial de aportes, y **de una inversión** con la curva de cómo crece.
- **Atajos de teclado**:
  - `g` y una letra para ir a una pantalla.
  - `n` para la acción principal.
  - `?` para ver la lista completa.

### Mejorado

- **Movimientos, asientos y conciliación** se paginan de verdad, y el paginador nombra el tramo que estás viendo.
- **La proyección** deja a la vista los meses que cambian algo y esconde el desglose repetido detrás de un interruptor.
- **Movimientos** pasa a tabla, con búsqueda por contraparte sobre todo el historial y no sobre la página cargada.
- **El rango de fechas** se elige en un calendario de dos meses en lugar de dos campos sueltos.
- **Los formularios cortos** se abren en un modal y los largos se quedan en pantalla.
- **Las explicaciones de los controles** se alcanzan con el toque y con el teclado, no solo pasando el puntero.
- **Una línea mal conciliada** se puede deshacer, y **un perfil de importación** mal mapeado se puede editar.
- **La advertencia** pasa a naranja, y se separa del negativo por claridad además de por matiz.

### Corregido

- **El panel**, con la consulta caída, afirmaba que ninguna cubeta se había pasado y que ninguna cuota se liberaba.
- **El presupuesto** llamaba «Sin asignar» a lo que en realidad era «Sin gastar».
- **La conciliación** ofrecía crear una cuenta que ya existía, y no decía de qué lado sobraba la diferencia.
- **Una dirección inexistente** mostraba «Not Found» en inglés y con la miga de otra pantalla.
- **Un select** dentro de un formulario desalineaba el resto de su fila.
- **Los campos numéricos** pierden las flechitas de incremento, que además corrían el texto.

## 2026-09-20

### Nuevo

- **Deudas y préstamos otorgados**, con tabla de amortización y simulador de abono extraordinario.
- **Plan de pago** que ordena las deudas por avalancha, bola de nieve o a mano.
- **Contabilidad de partida doble**: plan de cuentas, asientos, categorías y movimientos que arman su asiento.
- **Reportes contables**: mayor, balance de comprobación, estado de situación y estado de resultados.
- **Cierre mensual** que bloquea el período, con reapertura.
- **Exportación** a `CSV` de los reportes de contabilidad.
- **Tipos de cambio del BCCR** al día, con un indicador que avisa cuando la tasa quedó vieja.
- **Presupuesto por porcentajes**, evaluado cubeta por cubeta contra los asientos del período.
- **Metas** con el aporte requerido y la fecha en que se alcanzan.
- **Inversiones** con capitalización y valor proyectado.
- **Proyección de flujo de caja** mes a mes.
- **Panel general** que responde qué pasa este mes.
- **Navegación** con barra lateral, miga de pan y tema claro u oscuro.
- **Búsqueda y orden por columna** en las tablas de deudas y préstamos.

### Mejorado

- **El alta y la edición de una deuda** pasan a pantallas propias, en vez de un modal apretado.
- **Editar y borrar** se hacen desde la misma fila, con confirmación.
- **El contenido** abarca el ancho del panel, y el formulario de deuda se reparte en tres columnas.
- **El tema** se cambia con una sola fila del menú, que dice a cuál se va.

### Corregido

- **Las listas de deudas** mostraban solo las primeras filas sin avisar que algo quedaba fuera.
