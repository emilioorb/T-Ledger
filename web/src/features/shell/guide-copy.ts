// La guía está escrita para alguien que nunca llevó una contabilidad. Cada pantalla se
// cuenta en tres bloques: para qué sirve, cómo se usa paso a paso, y qué conviene saber
// antes. Si una frase supone que el lector ya sabe qué es un asiento, la frase está mal.
//
// Los pasos nombran controles que existen: el texto entre ** es literal, el mismo que se
// lee en pantalla. Si un botón cambia de nombre, acá hay que cambiarlo también.
//
// Los nombres de los módulos y sus secciones no viven acá: salen del copy de cada
// funcionalidad, el mismo que alimenta la navegación. Si la guía los repitiera a mano,
// dejaría de ser un mapa el día que alguno cambie.
export const copy = {
  guide: {
    title: 'Guía',
    description:
      'Cómo llevar el control de tu plata con esta app, pantalla por pantalla. Si es la primera vez, empezá por «Cómo funciona esto».',
    index: 'Índice de la guía',
    search: {
      placeholder: 'Buscar una pantalla o tarea',
      label: 'Buscar en la guía',
    },
    matches: (count: number) =>
      count === 1 ? '1 pantalla coincide' : `${count} pantallas coinciden`,
    parts: {
      purpose: 'Para qué sirve',
      steps: 'Paso a paso',
      notes: 'Tener en cuenta',
    },
    // El panel no cuelga de ninguna sección en la barra lateral, pero el índice necesita
    // un rótulo: una entrada suelta arriba de los grupos se leería como un error.
    groups: { home: 'Panel', basics: 'Empezá acá' },
    open: 'Abrir',
    openOf: (title: string) => `Abrir ${title}`,
    empty: {
      title: 'Nada en la guía coincide con la búsqueda',
      description:
        'Probá con el nombre de una pantalla, o con lo que querés hacer: gastar, ahorrar, conciliar, cerrar el mes.',
      action: 'Limpiar la búsqueda',
    },

    basics: {
      id: 'como-funciona',
      title: 'Cómo funciona esto',
      intro:
        'Llevar el control de tu plata acá es anotar lo que entra y lo que sale. La parte contable la hace el sistema solo. Con estas cinco ideas alcanza para entender el resto de la guía.',
      concepts: [
        {
          term: 'Una cuenta es un lugar donde está tu plata',
          text: 'Tu billetera, la cuenta del banco, el plazo fijo, la tarjeta que todavía debés: cada uno es una cuenta. Están numeradas para que queden siempre en el mismo orden y agrupadas por parecido: las que empiezan con 1 son cosas que tenés, las que empiezan con 2 son cosas que debés, y de la 4 en adelante son lo que entra y lo que se gasta. El número no significa nada más que eso.',
        },
        {
          term: 'Un movimiento lo anotás vos; el asiento lo anota el sistema',
          text: 'Vos anotás «gasté 20 mil en el súper». Por detrás el sistema escribe la otra mitad: salieron 20 mil de la cuenta con la que pagaste y entraron 20 mil a la cuenta de gastos de mercado. Esa doble anotación se llama asiento, y es lo que hace que los números cuadren siempre: nada aparece ni desaparece sin decir de dónde vino y a dónde fue.',
        },
        {
          term: 'Una categoría es el puente entre tu palabra y la cuenta',
          text: 'Vos decís «mercado», «alquiler», «salario». El sistema necesita saber a qué cuenta va cada una de esas palabras. La categoría guarda esa correspondencia una sola vez, y después cada movimiento que la use ya sabe dónde asentarse. Una categoría sin cuenta deja el movimiento anotado, pero fuera de los reportes.',
        },
        {
          term: 'Mover plata no es gastarla',
          text: 'Pasar plata a una meta o a una inversión no te empobrece: la misma plata cambia de lugar. Por eso esos aportes no son gastos y no bajan tu patrimonio, y por eso el sistema siempre pregunta de qué cuenta sale. Sin esa respuesta, la meta diría que ya ahorraste y los libros que la plata sigue en caja.',
        },
        {
          term: 'Cerrar un mes es darlo por terminado',
          text: 'Cuando ya no queda nada por anotar de un mes, lo cerrás. A partir de ahí ese mes no acepta anotaciones nuevas con esa fecha, así que lo que revisaste una vez no se te mueve por detrás. Se puede reabrir si aparece algo, y conviene cerrar porque es lo que convierte los reportes en números firmes.',
        },
      ],
      start: {
        label: 'Por dónde empezar',
        steps: [
          {
            text: 'Mirá qué cuentas trae la app y agregá las que te falten.',
            to: 'plan-de-cuentas',
            link: 'Plan de cuentas',
          },
          {
            text: 'Creá una categoría por cada cosa que se repite: mercado, alquiler, salario.',
            to: 'categorias',
            link: 'Categorías',
          },
          {
            text: 'Anotá lo que vas gastando y cobrando, día a día.',
            to: 'movimientos',
            link: 'Movimientos',
          },
          {
            text: 'Decidí cómo se reparte tu ingreso entre cubetas.',
            to: 'modelos',
            link: 'Modelos',
          },
          {
            text: 'Declará cuánto entró este mes y mirá cuánto se fue de cada cubeta.',
            to: 'presupuesto',
            link: 'Presupuesto',
          },
          {
            text: 'Cuando no quede nada por anotar, cerrá el mes.',
            to: 'cierre',
            link: 'Cierre',
          },
        ],
      },
    },

    modules: {
      dashboard: {
        purpose:
          'Es la primera pantalla y un resumen de cómo estás hoy: cuánto tenés, cuánto debés, cuánto te queda libre este mes y qué conviene atender. No se anota nada acá: se mira y se salta a la pantalla donde se resuelve.',
        steps: [
          'Mirá la fila de arriba: **Patrimonio** es todo lo que tenés menos todo lo que debés, y **Queda libre este mes** es lo que sobra después de lo ya comprometido.',
          'Bajá a **Qué atender**: cada línea nombra algo que va a pasar si no hacés nada.',
          'Tocá el enlace del panel que te interese para ir a resolverlo: **Ver el presupuesto**, **Ver las metas**, **Ver los movimientos** o **Ir al cierre**.',
        ],
        notes: [
          'El panel se arma con lo que ya anotaste. Recién instalada la app aparece casi vacío, y eso no es una falla.',
          'Si alguna consulta no responde, el panel lo dice en vez de mostrar un número a medias.',
        ],
      },

      debts: {
        purpose:
          'La lista de lo que debés y de lo que te deben. Con el monto prestado, la tasa y el plazo, la app calcula cuánto pagás por mes, en qué mes terminás de pagar y cuánto interés te cuesta el préstamo completo.',
        steps: [
          'Elegí la pestaña **Lo que debo** o **Lo que me deben**.',
          'Tocá **Nueva deuda**.',
          'En **Dirección** marcá **La debo** o **La presté**, y completá **Nombre**, **Contraparte**, **Capital**, **Tasa anual**, **Plazo** e **Inicio**.',
          'Elegí el **Sistema** de pago y, si la debés, la **Cubeta de presupuesto** de donde sale la cuota cada mes.',
          'Guardá con **Guardar deuda**.',
          'Tocá el nombre en la lista para ver la **Tabla de amortización** y probar un pago extra en **Abonar de más**.',
        ],
        notes: [
          'La primera cuota vence un mes después de la fecha que pongas en **Inicio**.',
          'Lo que prestaste usa la misma tabla con el flujo al revés: no consume presupuesto, lo alimenta.',
          'Borrar una deuda borra también su tabla de amortización, y no se puede deshacer.',
        ],
      },
      payoffPlan: {
        purpose:
          'Cuando te sobra plata en el mes y tenés varias deudas, esta pantalla dice a cuál conviene mandarla. Ordena tus deudas según el criterio que elijas. No cambia nada: solo ordena.',
        steps: [
          'Elegí el criterio en la pestaña **Avalancha** o **Bola de nieve**.',
          'Leé la explicación que aparece debajo: dice qué hace el criterio que elegiste.',
          'Mandá el excedente del mes a la deuda que quedó primera en **Orden**.',
          'Si tenés muchas, encontrá una con el buscador **Buscar por nombre**.',
        ],
        notes: [
          'Hace falta al menos una deuda vigente cargada; si no, no hay nada que ordenar.',
          '**Avalancha** ordena por tasa más alta y es lo que menos interés cuesta en total. **Bola de nieve** ordena por saldo más chico: cuesta algo más y cierra deudas antes.',
          'Los préstamos que hiciste vos quedan fuera de la lista: no compiten por el excedente, lo alimentan.',
        ],
      },

      budget: {
        purpose:
          'Reparte tu ingreso del mes en cubetas (mercado, casa, ahorro) y muestra cuánto se fue de cada una. Lo gastado no se lo declarás vos: se cuenta solo, con los movimientos que ya anotaste.',
        steps: [
          'Elegí la **Moneda** y el **Mes**.',
          'Si todavía no hay reparto, tocá **Crear un modelo** y armá uno.',
          'Tocá **Declarar ingreso**, escribí cuánto entró en **Ingreso del mes** y guardá con **Guardar ingreso**.',
          'Mirá cada cubeta: dice **Se pasó**, **En línea** o **Por debajo**, y cuánto lleva consumido de lo asignado.',
          'Para ver qué la hizo pasarse, tocá **Ver los movimientos de** esa cubeta.',
        ],
        notes: [
          'El ingreso es el único dato que declarás. El consumo sale del saldo de los asientos de las cuentas de gasto que cada cubeta tiene asignadas.',
          'Sin un modelo activo, las cubetas no tienen contra qué medirse y la pantalla te manda a crear uno.',
          'Una cubeta sin cuentas de gasto asignadas consume cero por más que gastes: el reparto se define en **Modelos**.',
        ],
      },
      budgetModels: {
        purpose:
          'Acá definís el reparto: qué porcentaje de tu ingreso va a cada cubeta. Es la regla contra la que el presupuesto mide el mes. Podés tener varios modelos guardados y cambiar de uno a otro.',
        steps: [
          'Tocá **Nuevo modelo** y ponele un **Nombre**.',
          'Marcá **Dejarlo activo al guardar** para que el presupuesto del mes se mida contra este modelo.',
          'Agregá cubetas con **Agregar cubeta** y escribí su **Nombre** y su **Porcentaje**.',
          'En cada cubeta marcá las **Cuentas de gasto** de donde sale su consumo.',
          'Marcá **Es la cubeta de ahorro** en una sola de ellas.',
          'Revisá que **Suma** llegue a 100 y guardá con **Guardar modelo**.',
        ],
        notes: [
          'No se puede guardar si los porcentajes no suman 100, ni si no hay exactamente una cubeta de ahorro.',
          'Solo un modelo puede estar activo a la vez: activar este desactiva el que estaba.',
          'Los porcentajes son un dato más: cambiarlos no toca código y el presupuesto se recalcula solo.',
        ],
      },
      goals: {
        purpose:
          'Una meta es un monto que querés juntar para una fecha: un viaje, la prima del seguro. La pantalla dice cuánto falta, cuánto tenés que apartar por mes y si al ritmo que llevás vas a llegar a tiempo.',
        steps: [
          'Tocá **Nueva meta** y completá **Nombre**, **Objetivo** y **Fecha deseada**.',
          'Elegí la **Cuenta de ahorro**: es dónde se guarda la plata que vayas apartando.',
          'Guardá con **Guardar meta**.',
          'Cada vez que apartes plata, tocá **Aportar** y completá **Fecha**, **Monto** y **De qué cuenta sale**.',
          'Registrá con **Registrar aporte**.',
        ],
        notes: [
          'Sin **Cuenta de ahorro** elegida no se puede aportar: la meta diría que ya ahorraste y los libros que la plata sigue en caja.',
          'Aportar no es gastar. La plata sale de una cuenta y entra a la de la meta, y tu patrimonio queda igual.',
          'Borrar una meta borra también todos sus aportes, y no se puede deshacer.',
        ],
      },
      investments: {
        purpose:
          'Registra la plata que pusiste a rendir: un plazo fijo, una cuenta que paga intereses. Muestra cuánto pusiste, cuánto vale hoy con los intereses y cuándo vuelve a estar disponible.',
        steps: [
          'Tocá **Nueva inversión** y completá **Nombre**, **Capital**, **Tasa anual** y **Apertura**.',
          'Elegí el **Tipo**: **A plazo** si tiene fecha de vencimiento, **Abierta** si no la tiene.',
          'Elegí la **Cuenta** donde queda el capital y guardá con **Guardar inversión**.',
          'Para poner más plata, tocá **Agregar capital**, completá **Fecha**, **Monto** y **De qué cuenta sale**, y tocá **Registrar aporte**.',
        ],
        notes: [
          'Sin **Cuenta** elegida no se puede agregar capital, igual que en las metas.',
          'Agregar capital no es una ganancia: la plata sale de una cuenta y entra a la inversión.',
          'La cuenta 1300, Inversiones, separa lo invertido del efectivo disponible, para que el saldo del banco no muestre como disponible una plata que está comprometida.',
        ],
      },
      projection: {
        purpose:
          'Mira hacia adelante: mes por mes, cuánto va a entrar, cuánto ya está comprometido en cuotas y aportes, y cuánto queda libre. Sirve para enterarte con meses de anticipación de que un mes no va a cerrar.',
        steps: [
          'Elegí el **Horizonte** y la **Moneda**.',
          'Leé la columna **Queda**: si un mes dice **El mes no cierra**, lo comprometido pasa lo que entra.',
          'Tocá **Ver el desglose** para ver de qué se compone lo comprometido de cada mes.',
          'Buscá las líneas **Se libera**: marcan el mes en que termina la cuota de una deuda.',
        ],
        notes: [
          'Se arma con tus deudas, metas e inversiones, más el ingreso que declarás en el presupuesto.',
          'Un mes sin ingreso declarado arrastra el del último mes declarado, y la fila lo marca como **Ingreso supuesto**.',
        ],
      },

      movements: {
        purpose:
          'Acá anotás cada gasto y cada ingreso: qué pagaste, a quién y con qué cuenta. Es la pantalla que más vas a usar, y la única que hace falta para llevar el día a día.',
        steps: [
          'Tocá **Nuevo movimiento**.',
          'Poné la **Fecha**, elegí el **Tipo** entre **Gasto** e **Ingreso**, y elegí la **Categoría**.',
          'Escribí en **Quién** el comercio o la fuente, y el **Monto**.',
          'Elegí la **Cuenta de pago**: de dónde salió o a dónde entró la plata.',
          'Guardá con **Guardar**.',
          'Para corregir uno, tocá **Editar**. Para dejarlo sin efecto, tocá **Anular** y confirmá con **Anular y revertir**.',
        ],
        notes: [
          'Cada movimiento genera su asiento solo. Si la categoría no tiene cuenta contable, queda marcado **Sin contabilizar**: se guarda, pero no llega a los reportes hasta que le asignes una.',
          'Editar no reescribe el asiento: revierte el vigente y emite uno nuevo, así el mayor conserva lo que se registró y lo que se corrigió.',
          'Anular tampoco borra: registra la reversión, y el movimiento y su reversión quedan con saldo neto cero.',
        ],
      },
      journal: {
        purpose:
          'El registro contable completo, línea por línea. Casi todos los asientos aparecen solos cuando anotás un movimiento. Entrás acá para ver de dónde salió un saldo, o para cargar a mano algo que no es un gasto ni un ingreso simple, como cambiar colones a dólares.',
        steps: [
          'Elegí el **Rango de fechas** para ver los asientos de esos días.',
          'Para cargar uno a mano, tocá **Asiento manual**.',
          'Poné la **Fecha** y la **Descripción**, y si tenés el papel, la **Referencia**.',
          'Agregá una línea por cuenta con **Agregar línea**: elegí la **Cuenta**, si la plata va en **Debe** o en **Haber**, y escribí el monto con su moneda.',
          'Mirá **Suma por moneda** hasta que diga **Cuadra**, y registrá con **Registrar asiento**.',
        ],
        notes: [
          'Cada moneda cuadra por su cuenta: una conversión cuadra en colones por un lado y en dólares por el otro.',
          'Un mes cerrado no acepta asientos con fecha de ese mes.',
          'Los asientos marcados **De un movimiento** o **Reversión** los generó la app sola y no se editan desde acá: se corrigen editando o anulando el movimiento.',
        ],
      },
      netWorth: {
        purpose:
          'Un solo número: todo lo que tenés menos todo lo que debés, a la fecha que elijas. Es el único reporte que suma colones con dólares, y por eso dice a qué tipo de cambio lo hace.',
        steps: [
          'Elegí la fecha en **Al**.',
          'Leé **Patrimonio**, y debajo **Activo**, que es lo que tenés, y **Pasivo**, que es lo que debés.',
          'Mirá la línea **Patrimonio = libros + tipo de cambio**: separa lo que anotaste de lo que se movió la tasa.',
          'Abrí **Por moneda** para ver cuánto hay en cada moneda y a qué tasa se tradujo.',
          'Tocá **Ver el detalle por cuenta** si querés el desglose cuenta por cuenta.',
        ],
        notes: [
          'Sin el tipo de cambio publicado de esa fecha el reporte no se arma: inventar una tasa sería inventar el patrimonio.',
          'El efecto del tipo de cambio no lo reconoce ningún asiento. Es la diferencia entre valuar lo que tenés a la tasa de hoy y a la del día en que entró.',
          'La cuenta 1190, Traslados entre monedas, queda fuera de la valuación: sus dos lados son la misma conversión contada en dos monedas, y valuarlos por separado inventaría una ganancia.',
        ],
      },
      trialBalance: {
        purpose:
          'Revisa que la contabilidad esté sana: suma todo lo que entró a cada cuenta contra todo lo que salió. Si los dos lados no dan igual, hay algo a medio anotar, y acá aparece de cuánto es la diferencia.',
        steps: [
          'Elegí la **Moneda** y el **Rango de fechas**.',
          'Mirá **Diferencia**: si dice **Cuadra**, no hay nada que revisar.',
          'Si dice **No cuadra**, buscá en la tabla la cuenta con el saldo raro.',
          'Tocá esa fila para ir a **Ver el mayor de** esa cuenta y ver qué pasó adentro.',
          'Si querés llevarte los números a una hoja de cálculo, tocá **Descargar CSV**.',
        ],
        notes: [
          'Los saldos se leen de a una moneda por vez: colones y dólares no se suman en este reporte.',
          'Un período sin asientos cuadra en cero. Es correcto, pero no dice nada.',
          'Una comprobación que no cuadra bloquea el cierre del mes.',
        ],
      },
      ledger: {
        purpose:
          'El detalle de una sola cuenta: todo lo que entró y salió de ella, en orden, con el saldo que quedó después de cada línea. Es a donde vas cuando un saldo no da lo que esperabas.',
        steps: [
          'Elegí la **Cuenta** que querés revisar.',
          'Elegí la **Moneda** y el **Rango de fechas**.',
          'Leé el **Saldo inicial**, recorré las líneas y comparalo con el **Saldo final**.',
        ],
        notes: [
          'Sin cuenta y sin moneda elegidas no hay nada que mostrar: el mayor es siempre una cuenta en una moneda.',
          'El **Saldo inicial** es lo que la cuenta traía antes del primer día del rango, no cero.',
        ],
      },
      financialPosition: {
        purpose:
          'Una foto a una fecha: qué tenés, qué debés y qué te queda, abierto cuenta por cuenta. Es el mismo patrimonio, pero con el detalle en vez de un solo número.',
        steps: [
          'Elegí la **Moneda** y la fecha en **Al**.',
          'Recorré los bloques **Activo**, **Pasivo** y **Patrimonio**.',
          'Confirmá que la línea **Activo = Pasivo + Patrimonio** diga **La identidad cuadra**.',
        ],
        notes: [
          'Es una foto a una fecha, no un período: por eso se elige un día y no un rango.',
          '**Resultado del período** no es una cuenta: es lo que va del año, ingresos menos costos y gastos, sumado al patrimonio.',
        ],
      },
      incomeStatement: {
        purpose:
          'Lo que entró menos lo que costó, entre dos fechas. Dice si el período cerró con ganancia o con pérdida, y en qué se fue la plata.',
        steps: [
          'Elegí la **Moneda** y el **Rango de fechas**.',
          'Leé **Ingresos**, **Costo de ingresos** y **Gastos operativos**.',
          'Mirá **Resultado** al final: dice **Ganancia** o **Pérdida**.',
        ],
        notes: [
          'Mide lo que pasó entre dos fechas. **Situación** mide cómo estás a una fecha: son preguntas distintas.',
          'Un resultado en cero con movimiento en el período puede ser un gasto anulado y su reversión, que se cancelan entre sí.',
        ],
      },
      accounts: {
        purpose:
          'La lista de todas las cuentas: dónde está tu plata, qué debés, y dónde se anota cada tipo de gasto y de ingreso. La app trae unas cuantas armadas; acá agregás las que te falten y mirás el saldo de cada una.',
        steps: [
          'Elegí la **Moneda** y la fecha en **Al** para ver los saldos.',
          'Desplegá cada raíz para ver las cuentas que cuelgan de ella.',
          'Para agregar una, tocá **Nueva cuenta** y poné el **Código**, el **Nombre** y la **Clase**.',
          'En **Cuelga de** elegí de qué cuenta depende, o dejala vacía para que sea raíz.',
          'Guardá con **Guardar**.',
        ],
        notes: [
          'El **Código** define el orden y no se cambia después de creada la cuenta.',
          'Una cuenta **Agrupadora** acumula el saldo de las que cuelgan de ella y no recibe asientos: solo las reciben las cuentas activas sin cuentas hijas.',
          'Marcar una cuenta como inactiva la deja sin aceptar asientos nuevos, pero no borra los que ya tiene.',
        ],
      },
      categories: {
        purpose:
          'Acá le ponés nombre a las cosas que se repiten (mercado, alquiler, salario) y decís con qué cuenta contable se anota cada una. Es lo que te deja registrar un gasto sin pensar en contabilidad.',
        steps: [
          'Tocá **Nueva categoría**.',
          'Poné el **Nombre** y elegí el **Tipo**: **Gasto** o **Ingreso**.',
          'Elegí la **Cuenta contable** donde se van a asentar sus movimientos.',
          'Guardá con **Guardar**.',
          'Revisá el bloque **Sin cuenta** de arriba: esas categorías todavía no llegan a la contabilidad.',
        ],
        notes: [
          'Una categoría sin cuenta deja sus movimientos registrados, pero fuera de los reportes hasta que le asignes una.',
          'Solo aparecen las cuentas que aceptan asientos: las agrupadoras no se pueden elegir.',
          'Borrar una categoría deja sus movimientos sin categoría y sin asiento nuevo.',
        ],
      },
      closing: {
        purpose:
          'Cerrar un mes es darlo por terminado: deja de aceptar anotaciones con esa fecha, así lo que revisaste una vez no se te mueve por detrás. Acá ves qué meses están cerrados y qué falta para cerrar el que sigue.',
        steps: [
          'Buscá en la lista el mes más viejo que siga **Abierto**.',
          'Leé la columna **Qué falta para cerrar**.',
          'Si hay pendientes, tocá **Ver los movimientos del mes** o **Ver la comprobación** y resolvelos.',
          'Cuando diga **Nada. Se puede cerrar.**, tocá **Cerrar** ese mes y confirmá con **Cerrar el mes**.',
        ],
        notes: [
          'Los meses se cierran en orden: no se cierra uno mientras el anterior siga abierto.',
          'Bloquean el cierre los movimientos sin asiento y una comprobación que no cuadre. Un mes sin actividad se puede cerrar igual.',
          'Se puede reabrir, pero reabrir un mes reabre también todos los posteriores: un mes abierto no puede quedar debajo de uno cerrado.',
        ],
      },

      reconciliation: {
        purpose:
          'Compara lo que el banco registró con lo que vos anotaste. Lo que no coincide es lo que se te pasó anotar. La diferencia entre los dos saldos es exactamente lo que falta explicar.',
        steps: [
          'Elegí la **Cuenta** bancaria y el **Rango de fechas**.',
          'Mirá **Diferencia**, entre **Saldo contable** y **Saldo del banco**.',
          'En **Pendientes**, cuando la app propone un movimiento tuyo, confirmá con **Es este**.',
          'Si la app no propone nada, es un gasto que no anotaste: elegí su **Categoría** y tocá **Crear movimiento**.',
          'Lo que nunca vas a anotar, sacalo de la lista con **Ignorar**.',
          'Si te equivocaste, buscá la línea en **Ya resueltas** y tocá **Deshacer**.',
        ],
        notes: [
          'Hace falta un extracto ya importado y una cuenta bancaria elegida.',
          'Las propuestas salen de tres criterios: **Mismo monto y misma fecha**, **Mismo monto, con unos días de diferencia**, y **La referencia coincide con el comprobante**.',
          'Cuando hay más de un candidato con la misma confianza, la app no elige por vos: te pide que elijas cuál.',
        ],
      },
      bankImport: {
        purpose:
          'Sube el archivo que te da el banco con los movimientos de tu cuenta, para no tener que anotarlos uno por uno. Antes de meterlos te muestra cómo quedaron interpretados, para que revises.',
        steps: [
          'Elegí la **Cuenta bancaria** y el **Perfil**.',
          'Cargá el **Archivo CSV** tal como lo exporta el banco, sin abrirlo en Excel.',
          'Tocá **Ver cómo queda** y revisá en **Así se va a importar** que la **Fecha** y el **Monto** hayan caído en su lugar.',
          'Si algo quedó corrido, el perfil está mal armado: ajustalo antes de seguir.',
          'Tocá **Importar**, y después **Ir a conciliar**.',
        ],
        notes: [
          'Antes hace falta una cuenta bancaria registrada y un perfil que diga cómo leer el CSV de ese banco.',
          'Una línea que ya se había importado no se duplica: el resultado las cuenta aparte, como líneas que ya estaban.',
          'Importar no crea movimientos tuyos: deja las líneas del banco esperando en la conciliación.',
        ],
      },
      bankAccounts: {
        purpose:
          'Acá le decís a la app qué cuenta del banco corresponde a qué cuenta de tu plan contable. Ese enlace es contra qué se concilia. En la misma pantalla se guardan los perfiles, que explican cómo leer el archivo de cada banco.',
        steps: [
          'Tocá **Nueva cuenta** y ponele un **Nombre** que reconozcas.',
          'Elegí la **Cuenta contable** a la que apunta y la **Moneda** en la que el banco exporta el extracto.',
          'Guardá con **Guardar cuenta**.',
          'Bajá a **Perfiles de importación** y tocá **Nuevo perfil**.',
          'Completá el **Separador**, la **Codificación** y en qué número de columna vienen la fecha, la descripción y el monto; guardá con **Guardar perfil**.',
          'Volvé a la cuenta y elegile ese **Perfil de importación**.',
        ],
        notes: [
          'Solo se pueden elegir cuentas contables que aceptan asientos.',
          'Las columnas se cuentan desde cero: la primera del archivo es la 0.',
          'Se usa una columna de monto con signo, o el par débito y crédito, nunca los dos a la vez.',
        ],
      },
    },
  },
} as const
