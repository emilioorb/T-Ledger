# ADR-004: El audit log se escribe en la misma transacción que el cambio

## Estado

Aceptado

## Fecha

2026-09-21

## Contexto

Con varias personas en un mismo libro, «quién tocó esto» deja de ser curiosidad y pasa a ser
la pregunta que más se hace. Hoy nada lo registra.

Los asientos del libro diario ya son inmutables: se revierten con `reversesEntryId` en vez de
editarse. O sea que la contabilidad ya tiene su propia trazabilidad, y un audit log que la
repitiera sería ruido sobre la parte que menos falta hace.

Lo que hoy no deja rastro es todo lo demás: quién editó un movimiento, quién cerró agosto,
quién cambió el presupuesto, quién sacó a alguien del libro.

`PrismaService` ya expone `withTransaction`, que varios casos de uso usan para escribir dos
veces (el movimiento y su asiento) sin dejar la mitad hecha.

## Decisión

Se registra **donde hay plata o decisiones**: movimientos, cierres y reaperturas de mes,
deudas, metas, inversiones, presupuestos, y cambios de miembros o roles.

La escritura del rastro va **dentro del mismo `withTransaction` que el cambio**. No puede
existir un cambio sin su rastro ni un rastro sin su cambio.

`changes` guarda qué campo cambió, con su valor anterior y el nuevo.

Cuando una cuenta se elimina, sus entradas no se borran: el `userId` pasa a `null` y se
muestran como «cuenta eliminada».

## Alternativas consideradas

### Solo eventos sensibles

- Cierres, invitaciones, cambios de rol, expulsiones y borrados. Mucho menos código y mucho
  menos volumen.
- Rechazada: no contesta la pregunta que más se hace en un libro compartido, que es quién
  cambió el monto de un movimiento.

### Todo lo que escribe, desde un interceptor

- Un registro por cada POST, PATCH y DELETE, automático. No hay que decidir qué entra ni
  acordarse de instrumentar nada nuevo.
- Rechazada: crece rápido, obliga a decidir cuándo podar, y entierra la señal entre el ruido
  de catálogos y consultas administrativas.

### Escribirlo fuera de la transacción, con un evento

- A favor: no acopla el rastro al camino crítico y no puede hacer fallar un guardado.
- Rechazada: un audit log que puede perder entradas no sirve para lo único que se le pide,
  que es resolver una discusión sobre qué pasó. Si el rastro se pierde justo cuando algo sale
  mal, se pierde cuando más hace falta.

### Borrar las entradas de una cuenta eliminada

- Rechazada: ese rastro pertenece al libro, no al usuario. Borrarlo le saca a otra persona la
  historia de su propia contabilidad por una decisión que no tomó.

## Consecuencias

- Cada caso de uso instrumentado paga una escritura más dentro de su transacción.
- No hay endpoint que edite ni borre entradas. El log es de solo agregar.
- Los catálogos (categorías, plan de cuentas) y los asientos quedan fuera a propósito. Si
  alguna vez hace falta el rastro de un catálogo, se agrega esa entidad; no se cambia la
  política.
- La estructura de `changes` separa el campo del valor, lo que deja el camino abierto para
  recortar los valores bajo cifrado sin rediseñar la tabla (ver ADR-003).

## Qué pasó con los cambios de gente (22 de setiembre de 2026)

Los seis dominios de contabilidad registran el rastro dentro de la misma transacción que el
cambio, como manda este ADR. Las personas no pasan por nuestros casos de uso —las maneja Better
Auth— y eso obligó a dos decisiones que conviene dejar escritas.

**Se usan los ganchos `before` y no los `after`.** El código de Better Auth encola los `after` y
los ejecuta después del commit, fuera de la transacción, y su propio comentario dice que un
fallo ahí «no puede revertir el trabajo ya confirmado». Con un `after`, a alguien podrían
sacarlo del libro sin que quede registrado: exactamente lo que este ADR rechazó al descartar la
alternativa de escribir el rastro con un evento. Desde un `before`, si el rastro falla se lanza
y la operación se aborta.

La atomicidad, aun así, es parcial y en una sola dirección: no puede haber cambio sin rastro,
pero sí podría quedar un rastro sin cambio si la operación falla después del gancho. La
transacción de Better Auth es interna —su código deja dicho que nunca se expone— así que
nuestra escritura no puede entrar en ella. Se acepta el desbalance porque la dirección que
importa es la que queda cubierta: el registro no pierde entradas.

**Se registran tres de los cinco caminos**, y los otros dos quedan pendientes a propósito:

| Camino | Registra | Por qué |
|---|---|---|
| Invitar | sí | El gancho recibe `inviter: session.user` |
| Cancelar una invitación | sí | Recibe `cancelledBy: session.user` |
| Aceptar una invitación | sí | Autor y afectado son la misma persona, y es cierto |
| Cambiar un rol | **no** | El gancho solo recibe al afectado |
| Sacar a alguien | **no** | Ídem |

En los dos últimos, el único usuario que llega al gancho es la persona afectada. Anotarlo como
autor diría que alguien se degradó o se expulsó a sí mismo, y un registro que miente sobre
quién hizo el cambio es peor que uno que no lo tiene, porque se le cree. Se probó y se
descartó: la primera versión registró un cambio de rol firmado por la persona equivocada.

La salida, cuando se retome, son los `databaseHooks`: su gancho recibe un `ctx` con la sesión y
ahí sí se sabe quién ejecuta.

