# Novedades

Qué cambió en cada entrega, contado para quien usa la app y no para quien la programa. Lo que
no cambia nada en pantalla no se anota.

Cada entrega abre con `## AAAA-MM-DD · vX.Y.Z` y lleva hasta tres grupos: `### Nuevo`,
`### Mejorado` y `### Corregido`. Adentro vale Markdown: **negritas**, `código`, enlaces,
listas anidadas y tablas. La negrita marca **de qué** habla cada nota, para recorrer la lista
sin leerla entera. Lo que está antes de la primera entrega, como este texto, no se muestra.

## 2026-09-24 · v1.4.0

### Nuevo

- **Dos personas en el mismo libro ya no se pisan.** Si alguien guardó algo mientras lo
  editabas, en vez de sobrescribirlo sin aviso te lo dice y ofrece «Cargar lo último»: ves lo
  que guardó la otra persona y decidís.
- **Cubetas en monto.** En un modelo de presupuesto podés cargar cada cubeta en colones, y se
  convierte sola al porcentaje del ingreso del mes. Si los montos suman el ingreso, dan 100 %
  justo.

### Mejorado

- **La app abre más liviana:** lo que se descarga antes de la primera pantalla pesa un 13 % menos.
- **El tipo de cambio del BCCR se ve también en el teléfono**, arriba en el tablero.
- **Nadie se queda sin libro.** Si borran un libro compartido, te sacan del único que tenías o
  te vas de él, se te abre uno propio, vacío, con su plan de cuentas.
- **Pagar, deshacer o anular dos veces a la vez** registra una sola vez: sin gastos de más ni
  reversiones dobles.

### Corregido

- **Cerrar un mes mientras entraba un movimiento** podía dejarlo sin asentar adentro del mes
  cerrado.
- **Un error al pagar una cuota** se avisaba dos veces.

## 2026-09-24 · v1.3.1

### Mejorado

- **Nimbo aparece también en el teléfono**, chiquito, al final de la fila de la fecha.
- **En el plan de cuentas, las cuentas que agrupan a otras** llevan la fila entera en un tono
  neutro: se ve de un vistazo dónde empieza cada grupo.

### Corregido

- **Un saldo muy grande en el plan de cuentas** se salía de su fila en el teléfono.

## 2026-09-23 · v1.3.0

### Nuevo

- **«Enlace nuevo»** en cada invitación que sigue esperando, en «Dar acceso» y en la gente del
  libro. Saca otro enlace y el anterior deja de servir: sirve si lo perdiste o si se lo
  mandaste a quien no era.
- **Unirte a un libro con tu cuenta.** El enlace de una invitación a un libro abre una pantalla
  para entrar con tu cuenta y unirte. Si la persona todavía no tiene cuenta, primero le da
  acceso quien administra T-Ledger.

### Mejorado

- **En el teléfono se lee mejor:**
  - El saludo del tablero va entero, debajo de la fecha.
  - La proyección muestra cada mes de arriba abajo: lo que entra, lo comprometido y lo que
    queda, alineados.
  - Las ecuaciones de Patrimonio y Situación ponen cada término en su renglón, sin dejar un
    «=» o un «+» colgando.
  - Las acciones de cada meta pasan a otro renglón en vez de salirse de la tarjeta.
  - El campo de fecha ya no se sale de los formularios en el iPhone.

### Corregido

- **Sacar a alguien de un libro o cambiarle el rol daba error.** Ahora funciona, y el registro
  anota quién lo hizo.
- **Una meta, deuda o inversión en dólares tiraba la proyección y el tablero.** Ahora cada
  moneda se proyecta por separado, como en el resto del tablero.
- **Los enlaces de invitación ahora son de quien los recibe.** Llevan una clave que sirve una
  sola vez, y hace falta para crear la cuenta y para unirse a un libro: saber el correo
  invitado ya no alcanza.
  - Las cuentas nuevas se crean solo con el enlace de «Dar acceso». Con el de un libro ya no se
    puede crear una cuenta con el correo de otra persona.
  - Los enlaces que mandaste antes de esta versión dejan de servir: sacá uno nuevo desde la
    invitación.
  - Las invitaciones a la app que estaban esperando se borraron: volvé a darle acceso a esa
    persona.

## 2026-09-23 · v1.2.0

### Mejorado

- **La portada aparece enseguida.** Llega escrita desde el servidor y se lee antes de que
  termine de cargar la app: en un teléfono lento, de unos cuatro segundos a uno o dos.
- **En el teléfono la portada va en papel liso**, sin el campo de puntos, que era lo que más
  la trababa al cargar. Con mouse, los puntos siguen.
- **«Pedir acceso» anda desde el primer momento**: si tocás antes de que la página termine de
  cargar, se abre tu correo con el mensaje listo.
- **La app instalada abre directo en el tablero**, sin pasar por la portada.
- **Los reportes de errores cuidan más lo que hacés**: ya no incluyen clics, lo que escribiste
  ni los filtros de las pantallas.

## 2026-09-23 · v1.1.0

### Nuevo

- **T-Ledger se instala como app** en el teléfono y en la compu: abre en su propia ventana,
  sin la barra del navegador, y arranca rápido porque la interfaz queda guardada. El ícono es
  Nimbo, tímido, en blanco sobre negro.
- **Aviso de versión nueva.** Después de cada entrega la app lo dice y se actualiza cuando
  tocás «Actualizar», nunca sola: lo que estés escribiendo no se pierde.
- **El pago de cada cuota.** Registrarlo anota el gasto en la contabilidad; las que pagaste
  antes de empezar el libro se marcan sin movimiento, y el último pago se puede deshacer. La
  tabla marca cada cuota como pagada, atrasada o pendiente.
- **Notas y contrato de una deuda**, en un modal desde su detalle: lo que conviene recordar,
  en Markdown, y el `PDF` del contrato adjunto.
- **Dar acceso con una invitación.** Desde Cuenta mandás un enlace y la otra persona se
  registra con su propia contraseña.

### Mejorado

- **El saldo de una deuda sale de lo que pagaste**, no del calendario: una cuota atrasada se
  sigue debiendo. El detalle muestra el saldo pendiente y cuántas cuotas quedan, y «Capital»
  pasa a llamarse «Monto original», como en el estado de cuenta.
- **Las metas se pausan** desde su tarjeta, y se reactivan cuando quieras.
- **Un libro que ya no usás se elimina**, con la contraseña de quien lo creó.
- **Sin conexión, la app lo explica** en vez de quedarse cargando, y vuelve sola cuando
  vuelve la red. Tus cifras no se guardan en el dispositivo: siguen solo en el servidor.
- **Si una pantalla no puede cargar**, lo dice en castellano y ofrece reintentar.

### Corregido

- **Anular el gasto de una cuota** desde Movimientos no la dejaba otra vez sin pagar.
- **Borrar un libro o una deuda** dejaba guardados sus comprobantes y contratos.
- **Volver con la sesión abierta** pasaba por la portada en vez de entrar directo.
- **Un libro sin presupuesto armado** mostraba el tablero como si hubiera fallado.

## 2026-09-22 · v1.0.0

### Nuevo

- **Una portada pública.** La página entera es una cuenta T: tres asientos de ejemplo se
  escriben solos y los totales corren hasta cuadrar.
- **El tablero se muda a** `/tablero`. La raíz del dominio queda para la portada.
- **Tema claro u oscuro antes de entrar.** Lo elegís en la portada y el login lo respeta.
- **Novedades y la guía en Markdown**, con negritas, código y enlaces.

### Corregido

- **Al pasar de la portada a entrar** en oscuro, la pantalla parpadeaba en gris.

## 2026-09-18 · v0.5.0

### Nuevo

- **Varios libros por persona**: el personal, el de la casa, el de la familia. Cada uno con
  su gente, invitaciones y tres roles.
- **Registro de auditoría.** Cada cambio dice quién lo hizo y cuándo.
- **Comprobantes** adjuntos a cada movimiento.
- **Colores propios** para cada cubeta y cada categoría.

### Mejorado

- **El tablero** abre con cómo va el mes, y cada cifra dice cuánto cambió desde el anterior.
- **La guía** se pliega en un índice: el mapa entero entra de una mirada.

## 2026-09-14 · v0.4.0

### Nuevo

- **Banco.** Subís el extracto `CSV`, revisás el mapeo antes de confirmar y conciliás contra
  lo anotado, con sugerencias de coincidencia.
- **Patrimonio en una sola moneda**, con el efecto del tipo de cambio aparte.
- **Atajos de teclado**: `g` y una letra para ir a una pantalla, `n` para la acción
  principal, `?` para verlos todos.

### Mejorado

- **Las tablas largas se paginan de verdad**, y la búsqueda recorre todo el historial.
- **La proyección** muestra solo los meses que cambian algo.

### Corregido

- **Con la consulta caída**, el panel afirmaba que todo estaba en orden.
- **El presupuesto** llamaba «Sin asignar» a lo que era «Sin gastar».

## 2026-09-08 · v0.3.0

### Nuevo

- **Presupuesto por porcentajes.** Repartís el ingreso en cubetas y ves cuánto se fue de cada
  una.
- **Metas** con el aporte que hace falta y la fecha en que llegan.
- **Inversiones** con capitalización y valor proyectado.
- **Proyección de flujo de caja**, mes a mes.
- **Un panel** que responde qué pasa este mes.

## 2026-09-01 · v0.2.0

### Nuevo

- **Contabilidad de partida doble.** Anotás un movimiento y el sistema arma el asiento.
- **Reportes**: mayor, comprobación, situación y resultados, exportables a `CSV`.
- **Cierre mensual.** Un mes cerrado no acepta cambios, y se puede reabrir.

## 2026-08-25 · v0.1.0

### Nuevo

- **Deudas y préstamos** con tabla de amortización y simulador de abono extraordinario.
- **Plan de pago** por avalancha, bola de nieve o a mano.
- **Tipo de cambio del BCCR** al día, con aviso cuando la tasa quedó vieja.
