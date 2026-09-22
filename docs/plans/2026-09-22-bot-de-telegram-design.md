# Diseño: el bot de Telegram de T-Ledger

Fecha: 2026-09-22 · Estado: borrador, sin aprobar

## Para qué existe

PRODUCT.md dice que el producto fracasa si Emilio deja de anotar, y que el camino
de alta de un movimiento es el más corto del producto: una mano, de pie, en un
teléfono. El bot no es una segunda app ni una interfaz alternativa. Es un atajo a
ese único gesto, para el caso en que la app ya perdió: cuando desbloquear,
encontrar el ícono, esperar la carga y tocar «nuevo movimiento» son más pasos que
los segundos que la persona tiene.

Telegram ya está abierto en la pantalla. Esa es toda la ventaja, y es la única que
el bot puede reclamar. Todo lo que este documento decide sale de ahí: si algo no
hace que anotar cueste menos, no entra.

El precio también sale de ahí, y conviene decirlo antes que nada porque atraviesa
el documento entero: **anotar en Telegram es anotar en el servidor de un tercero**.
La sección de seguridad lo trata de frente, y la primera decisión abierta es si,
sabiendo eso, el bot debe existir.

## La pregunta central: cómo una persona de Telegram queda ligada a su libro

### El problema

Hoy la autorización de la API se apoya en dos cosas, las dos verificables. La
primera es una sesión de Better Auth: una cookie firmada con `AUTH_SECRET`, que el
navegador manda y que `LibroMiddleware` canjea llamando a `auth.api.getSession`. La
segunda es el libro: `elegirLibro` cruza lo que pidió la pantalla, lo que dice
`activeOrganizationId` de la sesión y las membresías reales de esa persona, y si no
hay coincidencia contesta 403. Nada de eso es declarativo. Todo se comprueba contra
la base.

Un `chat_id` de Telegram no es nada de eso. Es un número que aparece en el cuerpo
de un update y que cualquiera puede escribir en un mensaje. Si el bot aceptara
«soy el chat 12345, anotame esto», el modelo de autorización entero se caería a un
identificador autodeclarado, que es la definición de Broken Access Control.

Entonces la pregunta no es «cómo guardo el `chat_id`», sino **de dónde sale la
prueba de que esa cuenta de Telegram es de esa persona**. Y la respuesta tiene que
salir de donde ya hay una prueba: la sesión web.

### La propuesta: un código de un solo uso, emitido desde la sesión, canjeado por deep link

El flujo, completo:

1. En la app, con sesión abierta y un libro activo, la persona entra a «Cuenta →
   Telegram» y toca «Vincular». La petición viaja como cualquier otra: pasa por
   `LibroMiddleware`, así que el servidor ya sabe `userId`, `bookId` y `rol` sin
   que nadie se los diga.
2. El servidor genera un token opaco aleatorio (32 bytes de `randomBytes`, en
   base64url), guarda **su hash** con vencimiento corto —cinco minutos— y un solo
   uso, y devuelve el enlace `https://t.me/<bot>?start=<token>`.
3. La persona toca el enlace. El cliente de Telegram abre el chat con el bot y le
   muestra un botón START; al tocarlo manda `/start <token>`. La documentación es
   explícita en que el cliente **no le muestra el payload al usuario** —ve solo
   `/start`— pero el bot sí lo recibe, y grammY lo entrega ya separado en
   `ctx.match`.
4. El bot toma `from.id` del update, busca el token por hash, comprueba que esté
   vigente y sin usar, y en una sola transacción crea el vínculo y marca el token
   como usado.
5. Contesta nombrando la persona y el libro: «Listo. Vas a anotar en *Casa*.» Y
   borra el mensaje que traía el token, que `deleteMessage` permite hacer sobre
   mensajes entrantes de un chat privado dentro de las 48 horas.

El vínculo se guarda como `(telegramUserId → userId, bookId)`. Lleva `userId` y no
solo `bookId`, y esa es la parte que no es negociable: ADR-004 exige que ningún
cambio exista sin decir quién lo hizo, y un bot que escriba «lo anotó el bot» es
exactamente el registro que miente y al que igual se le cree. Con el `userId` del
vínculo, un movimiento anotado por Telegram queda firmado por la persona, idéntico
a uno anotado en la app.

Va `from.id` y no `chat.id`. En un chat privado hoy coinciden, pero el que
identifica a la persona es `from.id`; guardar el otro sería guardar el número
correcto por el motivo equivocado, y el motivo equivocado es el que se rompe.

### Las alternativas, y el ataque que cada una deja abierto

**Un comando `/vincular emilio@ejemplo.com`.** Es lo primero que uno escribe.
El ataque es de una línea: cualquiera que conozca un correo escribe ese comando y
queda vinculado al libro ajeno. La única defensa sería pedir después la contraseña
—por el chat, o sea, escribirla en un servidor de terceros—. Rechazada dos veces.

**Un código de seis dígitos que la app muestra y la persona escribe en el chat.**
Mejor: el código sale de una sesión verificada, igual que la propuesta. Dos
problemas. El espacio es de un millón y el canal de prueba es gratis, ilimitado y
anónimo —cuentas de Telegram nuevas cuestan un número de teléfono—, así que exige
límite de intentos por código y por cuenta o se fuerza bruta en minutos. Y obliga a
copiar seis dígitos a mano, que es lo contrario del principio que justifica el
proyecto. **No queda descartada del todo:** es el plan B si el deep link falla en
algún cliente, y en ese caso el límite de intentos es obligatorio, no una mejora.

**El Telegram Login Widget, o el botón `login_url`.** Invierte la dirección: la
persona se autentica *en la web* con su cuenta de Telegram, y Telegram firma los
datos con HMAC-SHA-256 del token del bot, que el servidor verifica —la
documentación advierte que el hash hay que comprobarlo siempre—. Criptográficamente
es sólido y no hay token que expire. Se rechaza por una razón de producto, no de
seguridad: ata la identidad de T-Ledger a Telegram, y ADR-001 ya decidió que la
identidad es Better Auth con correo, con Google, 2FA y passkeys esperando detrás de
una configuración. Vincular un canal es una cosa; convertir a Telegram en el
proveedor de identidad es otra, y nadie la pidió. Además obliga a `/setdomain` en
BotFather y a que el dominio del botón coincida con el del sitio, que es una atadura
de infraestructura por una comodidad que el deep link ya da.

**Una Mini App, con `initData` verificado.** Telegram firma los datos de la Mini App
con `HMAC_SHA256(<bot_token>, "WebAppData")` como clave secreta, y el backend puede
comprobarlo. Es el mecanismo más fuerte de la lista y es el que usaría si el bot
tuviera pantallas. Se rechaza para el alta de un movimiento por el mismo motivo por
el que existe el bot: abrir una WebView es volver a la app, y ahí el atajo dejó de
serlo.

**Una lista blanca de `telegram_user_id` en el entorno.** Cero código, cero tablas,
y para Emilio solo funciona perfecto. Se rechaza porque el producto es «Emilio más
quienes él invite a un libro»: esto mete personas en la configuración en vez de en
la base, donde vive la membresía, y el día que alguien entra o sale de un libro hay
que acordarse de editar un `.env` y reiniciar. Se anota igual, porque es lo que
haría un MVP y hay que poder decir por qué no.

### El ataque que la propuesta sí deja abierto

Quien consiga el enlace dentro de la ventana de cinco minutos y lo abra antes que el
dueño se queda con el vínculo. No es teórico: el enlace puede quedar en una captura,
en un portapapeles compartido, en un chat donde se pegó por error.

Lo que lo acota: la ventana corta, el único uso, y que la app muestre la lista de
vínculos activos con su fecha y un botón de revocar, más un aviso por correo cuando
se crea uno. No se cierra del todo, y decirlo es parte del diseño.

El segundo ataque no tiene defensa acá: quien tenga el teléfono desbloqueado del
dueño tiene el bot. Eso vale para cualquier app del teléfono. Lo que sí se puede
decidir —y se decide, más abajo— es cuánto daño alcanza a hacer desde ahí.

## Por dónde entra

**El bot es un módulo más dentro de la misma aplicación Nest**, `modules/telegram`,
que llama a los casos de uso que ya existen.

La razón es una sola y está escrita en ADR-002: el aislamiento no vive en el
controlador, vive en `AsyncLocalStorage` más la extensión de Prisma. Un caso de uso
que corra dentro de `conLibro(contexto, correr)` —con el contexto `{ bookId, userId,
rol }`— obtiene exactamente el mismo
filtro por libro y el mismo rastro firmado que una petición del navegador, sin una
línea nueva de seguridad. `CreateMovementUseCase` no se entera de que quien lo llamó
fue un mensaje de Telegram, y esa ignorancia es la garantía.

El detalle que hay que escribir para que no se pierda: el webhook **no** pasa por
`LibroMiddleware`, porque no hay cookie de sesión que canjear. El módulo abre el
contexto él mismo, con `conLibro`, tomando `bookId` y `userId` del vínculo. De ahí
salen dos consecuencias que son deuda de diseño, no detalles:

- **El rol se lee de `bookMember` en cada update, no se guarda en el vínculo.** Si a
  alguien lo bajan a `viewer`, el bot tiene que enterarse en el mensaje siguiente. Un
  rol congelado en una tabla de vínculos es un permiso que sobrevive a su revocación.
- **`PermisoGuard` no corre.** Es un guard de HTTP y se dispara sobre los
  controladores decorados con `@Permiso(...)`. El módulo tiene que comprobar el
  permiso explícitamente con `puede(rol, 'movimiento', 'create')` antes de llamar al
  caso de uso, y hace falta un test como el de `cobertura-de-permisos.spec.ts` que
  falle si un manejador del bot escribe sin haberlo hecho. Sin eso, este módulo es
  el agujero que ADR-002 existe para que no haya.

### Las otras dos formas, y por qué no

**Un proceso aparte que le hable a la API por HTTP.** Aísla el despliegue y una
caída del bot no se lleva la API. Se rompe en la autorización: el proceso necesita
una credencial de máquina para escribir *en nombre de una persona*. O es un token de
servicio con permiso sobre todos los libros —una llave maestra, que es lo que ADR-002
pasó dos capas evitando—, o es una sesión impersonada, o es un encabezado «en nombre
de» con el `userId` adentro, que es un `x-user-id` confiable y la peor idea de las
tres. Y en cualquiera de los tres casos el rastro deja de ser verificable: el
servidor estaría creyéndole al bot sobre quién hizo el cambio, que es justo lo que
ADR-004 descartó cuando se negó a firmar un cambio de rol con la persona afectada.

**Un proceso aparte con su propio Prisma contra la misma base.** Tendría que
reimplementar la extensión de libro, la guardia de rol y el rastro, o importarlos
desde `api/src` y volverse un segundo despliegue del mismo código. Dos copias de la
regla de aislamiento es exactamente lo que ADR-002 declaró inaceptable cuando
rechazó filtrar a mano en catorce repositorios.

La consecuencia aceptada de meter el bot adentro es que comparte el proceso con la
API, y un pico de updates compite con las peticiones del navegador. Para un producto
de una persona y sus invitados eso no es medible. Si algún día lo fuera, la salida es
poner `webhookCallback` en un proceso que solo encole y devuelva 200, no partir el
dominio.

### Webhook, no long polling

Con la API ya publicada en HTTPS, el webhook es un controlador más. El long polling
obliga a un proceso que mantenga una conexión abierta contra Telegram, que grammY
documenta como el otro tipo de despliegue y que acá no compra nada. Además el
webhook trae autenticación del remitente —el `secret_token`— que el polling no tiene
porque no la necesita: en polling nadie te habla.

Dos notas honestas. En desarrollo local no hay HTTPS público, así que ahí se usa
long polling y el módulo tiene que soportar los dos modos según el entorno; no es un
lujo, es la única forma de probarlo sin túneles. Y los puertos que Telegram acepta
para webhooks son 443, 80, 88 y 8443, lo cual condiciona el despliegue.

## La librería: grammY

Se miraron las dos que el encargo pedía mirar. Las dos tienen webhook con secreto,
adaptador de Express y tipos de TypeScript de primera. El empate se rompe por dos
cosas concretas.

**grammY estrecha el tipo del contexto con las filter queries.** Con
`bot.on("message")` el texto es `string | undefined`; con `bot.on("message:text")`
es `string`. En un repositorio cuya regla es no escribir `any` nunca, eso es la
diferencia entre un manejador honesto y uno lleno de `!`, que la propia
documentación de grammY desaconseja explícitamente.

**El timeout de `webhookCallback` tira en vez de devolver.** Son 10 segundos por
omisión, y grammY documenta la decisión con su razón: un error visible en el log es
lo que permite investigar, y suprimirlo escondería pérdidas de datos y carreras.
Esa es, palabra por palabra, la regla de esta casa: una consulta sin libro tira, un
rastro sin autor tira. Elegir la librería que falla igual que el proyecto vale más
que cualquier comparación de API.

Telegraf hace lo mismo con `createWebhook({ secretToken })`, que además llama a
`setWebhook` por uno, y con `bot.launch({ webhook: { domain, port, path,
secretToken } })`. Es una librería perfectamente capaz y la decisión no es contra
ella; es a favor del tipado.

**Descartado: escribirle a la Bot API con `fetch` a mano.** Son cuatro métodos
—`sendMessage`, `answerCallbackQuery`, `editMessageText`, `setMyCommands`— y sería
defendible. Se descarta porque lo que uno termina escribiendo mal no son las
llamadas, es el enrutado de updates y el estrechamiento de tipos.

**Descartado: un envoltorio de NestJS para el bot.** El proyecto ya paga un
envoltorio de comunidad, `@thallesp/nestjs-better-auth`, y ADR-001 documenta lo que
costó verificar que funcionara. Sumar otro para lo que resuelve un controlador de
tres líneas montando `webhookCallback(bot, "express")` no se justifica: grammY es
agnóstico del framework a propósito y trae el adaptador de Express en la caja.

**Una cosa que hay que verificar antes de escribir código**, no asumir: `main.ts`
arranca Nest con `bodyParser: false` porque Better Auth lo exige, y el paquete repone
los parsers para las rutas que no son de auth. ADR-001 lo dejó verificado para
`POST /api/v1/categories`. La ruta del webhook necesita el JSON parseado, así que hay
que medir que llegue —y si no llega, la salida es montar el parser de JSON solo para
esa ruta, no apagar la configuración de auth.

## Qué se puede hacer desde el bot y qué no

La regla que resume la sección: **el bot escribe movimientos y lee una cifra. Todo
lo demás vive en la app.**

Adentro:

- Anotar un gasto o un ingreso desde un mensaje de texto.
- Confirmar o corregir la categoría de lo que acaba de anotar.
- Deshacer lo último, dentro de una ventana corta.
- Preguntar una cifra puntual: cuánto va gastado este mes.
- `/libro` para cambiar a qué libro se anota, entre los que la persona ya tiene.
- `/vincular` y `/desvincular`.

Afuera, y el motivo de cada uno:

- **Cerrar o reabrir un mes.** Es el modo «cuadrar», y lo que hay que mirar antes de
  cerrar no cabe en un chat. Un cierre a ciegas es un cierre que después hay que
  reabrir, y las dos cosas quedan en el registro.
- **Presupuestos, metas, deudas, inversiones, plan de cuentas, categorías.** Es el
  modo «decidir», y PRODUCT.md lo pone en escritorio, sesiones largas, sin apuro.
- **Ver el mayor, los asientos, cualquier informe.** El principio dice que todo
  número es rastreable y que ninguna cifra existe sin un camino a lo que la compone.
  Un chat no da ese camino: da un número sin fondo, que es lo que el producto
  rechaza. Y un informe mandado por el bot es una copia del libro en un servidor
  ajeno, que es lo que la sección de seguridad no permite.
- **Todo lo destructivo:** vaciar el libro, eliminar la cuenta, sacar a alguien,
  cambiar roles, invitar. El spec de multiusuario ya diseñó esos flujos con
  exportación previa, contraseña y nombre escrito a mano. Repetirlos en un chat sería
  reemplazar todo eso por un «sí» de un toque.
- **Adjuntar el comprobante como foto.** Es la funcionalidad más tentadora del
  proyecto —la foto del tiquete ya está en el teléfono— y queda **abierta**, no
  descartada: ver decisiones abiertas. El motivo de la duda es que subir la foto la
  manda a los servidores de Telegram y bajarla vuelve a pasar por una URL que lleva
  el token del bot adentro.

## Cómo se anota un gasto en un mensaje

La persona escribe una línea. «20000 super». «gasté 20 mil en el súper». «ayer 8500
gasolina».

### Qué entiende

Un analizador **determinista**, escrito como función pura en el dominio, probable sin
base y sin red, igual que `elegirLibro` o `puedeRegistrarse`. Lee, en este orden:

- **El monto.** La primera cifra con forma de monto. No se inventa validación: el
  `moneySchema` que ya existe decide qué es un monto y qué no, y su mensaje de error
  no repite el valor que lo causó, que es la regla que ADR-005 dejó escrita después
  de ver un valor escaparse por el título de una excepción.
- **La moneda.** Colones salvo que el mensaje diga otra cosa.
- **La fecha.** Hoy, salvo «ayer» o un día del mes explícito.
- **La contraparte.** Lo que queda del texto, que el dominio exige no vacía.
- **La cuenta de pago.** `null`, igual que el valor por omisión del esquema. Se
  completa después en la app, o no se completa nunca; es opcional por diseño porque
  el principio dice que lo que no se puede contestar en el momento se infiere o se
  omite.

### Qué pregunta

La categoría, y nada más. No se adivina: el bot manda los botones de las categorías
más usadas de ese libro en un teclado en línea, y la respuesta llega como
`callback_query`, que es un toque y no una escritura. Un mensaje, un toque, listo.

### Qué pasa cuando no entiende

**No adivina y no guarda nada.** Contesta qué le faltó —«No encontré el monto»— y
ahí termina. No repite lo que la persona escribió: el mensaje ya está en Telegram y
devolvérselo no agrega nada, pero sí duplica el dato en un segundo mensaje que puede
terminar en un log, en una notificación de la pantalla bloqueada o en la vista previa
de otro dispositivo. Es la regla de ADR-005 aplicada a una puerta que el `beforeSend`
no ve.

### La confirmación, y el deshacer

El mensaje de vuelta dice qué quedó anotado **y en qué libro**, con un botón
«Deshacer» activo por unos minutos. Nombrar el libro es la única defensa real contra
el error más probable de todos, que es anotar en el libro equivocado; y el deshacer
usa `void_()`, que ya existe, anula el movimiento y revierte su asiento en vez de
borrar nada.

### Lo que este documento no decide

**Que un modelo de lenguaje interprete el mensaje.** No hay ninguna decisión de IA
tomada en este repositorio y este diseño no inventa una. Si algún día se quiere, es
un ADR aparte con su propio análisis, porque significa mandar el texto de un
movimiento a un cuarto servicio y ADR-005 ya fijó el criterio con el que se juzga
eso.

## Seguridad

### Validación del webhook

`setWebhook` acepta un parámetro `secret_token` de 1 a 256 caracteres —y solo
`A-Z`, `a-z`, `0-9`, `_` y `-`, así que se genera en base64url o en hexadecimal,
nunca con un base64 común, que mete `+`, `/` y `=`—, y Telegram lo manda en la
cabecera `X-Telegram-Bot-Api-Secret-Token` en cada petición al webhook;
la documentación dice para qué sirve con todas las letras: asegurarse de que la
petición viene de un webhook puesto por uno mismo. Se compara con comparación de
tiempo constante, y si no coincide se responde 401 sin procesar nada.

Hay un detalle que no es obvio y que conviene dejar anotado: Telegram **reintenta**
toda petición que no responda 2XX, y se rinde después de unos cuantos intentos. O sea
que un 401 a un impostor genera reintentos que mueren solos, pero un 500 porque se
cayó la base también genera reintentos —y esos sí son los que uno quiere—. Las dos
situaciones se ven igual desde afuera y hay que poder distinguirlas en el log.

Además:

- `allowed_updates: ["message", "callback_query"]` en `setWebhook`, que es la lista
  de tipos de update que uno quiere recibir. Menos superficie y menos datos
  entrando. Con la advertencia que la propia documentación hace: no afecta a los
  updates creados antes de la llamada, así que por un rato pueden llegar otros.
- El camino de la ruta lleva un componente secreto propio. **No el token del bot**,
  aunque la mitad de los ejemplos de grammY y de Telegraf usen el token como path: una
  URL termina en un log de acceso, en un proxy o en una traza, y ahí el token queda
  regalado. Secreto aparte, y distinto del `secret_token` de la cabecera.
- El filtro por las subredes de Telegram —`149.154.160.0/20` y `91.108.4.0/22`, con
  la lista actualizada publicada por ellos— es refuerzo opcional, nunca sustituto:
  depende de dónde esté desplegado y de que el proxy preserve la IP real.

### El secreto del bot

Dos secretos, no uno: `TELEGRAM_BOT_TOKEN` y `TELEGRAM_WEBHOOK_SECRET`, más el
componente secreto del camino. Los tres van por `loadEnv`, con el resto de la
configuración, siguiendo el criterio que ya está ahí: obligatorios cuando el módulo
está prendido, ausentes cuando no. El bot tiene que poder apagarse sin romper el
arranque, igual que el DSN de Sentry —«quedarse sin servicio porque falta la
telemetría sería cambiar un problema chico por uno grande»—, y al revés que
`AUTH_SECRET`, que sin él no hay sesión que valga.

El token nunca aparece en un log ni en una URL que se registre. Si se filtra, se
revoca en BotFather y se pone el nuevo: el vínculo sobrevive, porque no depende del
token. Rotar el secreto del webhook es llamar a `setWebhook` otra vez.

### Qué se guarda de Telegram

Lo mínimo que hace falta para que el vínculo funcione: el `telegram_user_id`
numérico, el `userId`, el `bookId`, cuándo se vinculó y cuándo se usó por última vez.

**No se guarda** el nombre, ni el `@username`, ni la foto, ni el idioma, ni el texto
de los mensajes. El texto se analiza y se descarta; lo que queda en la base es el
movimiento y su entrada de rastro, indistinguibles de los que hubiera creado la app.
Es el mismo criterio de ADR-005 con el usuario de Sentry: un identificador opaco y
nada más, porque quién es esa persona se resuelve contra la propia base, que es donde
vive esa relación.

### Si alguien se equivoca de chat

Tres casos, con tres respuestas distintas:

- **Se equivocó de libro.** La confirmación nombra el libro y ofrece deshacer. Es la
  única defensa posible, porque el bot no puede saber qué quería.
- **Escribió el gasto en otro chat.** El dato ya salió y no hay nada que hacer. Lo
  que sí se decide es que **el bot solo funciona en chats privados**: si el update
  viene de un grupo, no contesta y no anota. Así el bot no se puede agregar al grupo
  de la familia y convertirse en una filtración por diseño.
- **El mensaje queda en Telegram.** `deleteMessage` deja a un bot borrar mensajes
  entrantes de un chat privado dentro de las 48 horas. Se usa para una sola cosa: el
  mensaje que traía el token de vinculación. **No** se usa para borrar los mensajes
  de movimientos, porque eso le mentiría a la persona sobre dónde están sus datos —el
  movimiento seguiría en el servidor de Telegram en sus respaldos, y la pantalla
  limpia diría lo contrario—.

### Qué llega a los servidores de Telegram, a la luz de ADR-005

Acá hay que ser franco, porque es la mitad del problema y la parte que un diseño
cómodo dejaría en una nota al pie.

**Telegram es un tercero, como Sentry. Pero al revés que con Sentry, acá el dato del
libro no es un efecto colateral: es el contenido.** El chat con un bot es un chat en
la nube, no un chat secreto; los mensajes viven en los servidores de Telegram. Todo
lo que la persona escriba —el monto, el comercio, la fecha— y todo lo que el bot
conteste está ahí, en claro para quien opere esa infraestructura, fuera del país y
fuera de cualquier borrado de cuenta de T-Ledger.

De eso salen tres consecuencias:

1. **El filtro de ADR-005 no aplica y no puede aplicar.** No hay nada que filtrar: el
   canal *es* el dato. Lo único que se puede decidir es **cuánto devuelve el bot**, y
   la decisión es: repite lo mínimo para confirmar y nunca manda algo que la persona
   no haya escrito o pedido explícitamente. Un saldo es un número que alguien pidió;
   una lista de los últimos veinte movimientos sería copiar el libro al chat, y por
   eso esa capacidad está afuera.
2. **La pantalla de vinculación tiene que decirlo con esas palabras**, antes de que
   nadie toque el botón, sin letra chica y sin eufemismo: lo que anotés por Telegram
   queda también en Telegram. El mismo criterio con el que el spec exige explicarle a
   la gente que la contraseña se resetea y la frase de recuperación no.
3. **El bot es incompatible con 6c tal como está diseñado.** Si el cifrado extremo a
   extremo llega, la llave vive en el navegador y el servidor no puede leer ni
   escribir el libro; un bot que recibe texto plano por HTTP y lo guarda no tiene
   dónde pararse. No es un detalle de implementación: es una decisión de producto que
   hay que tomar ahora —queda abierta— y no descubrir el día del volteo.

Aparte: el controlador del webhook tiene que quedar cubierto por el mismo `beforeSend`
que borra el cuerpo de la petición, y eso hay que **verificarlo**, no suponerlo. Un
update de Telegram es un cuerpo JSON con el texto del movimiento adentro, así que si
ese camino no está cubierto, el bot manda a Sentry exactamente lo que ADR-005 pasó un
día entero cerrando.

### Límite de tasa

Un update es una escritura en la base sin sesión previa, que es la clase de puerta
donde la guía de seguridad pide límite explícito. Dos límites distintos:

- Por `telegram_user_id`, sobre los mensajes que el bot procesa. Un update de un id no
  vinculado se descarta con una sola consulta y no toca nada más.
- Sobre los canjes de token, que son el camino de autenticación de este módulo y el
  único donde la fuerza bruta compra algo.

### Idempotencia

Telegram reintenta ante cualquier respuesta que no sea 2XX, y grammY tira a los diez
segundos. Un reintento después de que el movimiento se guardó lo duplicaría, y un
movimiento duplicado en una contabilidad de partida doble se lleva dos asientos, no
uno. Se guarda el `update_id` —único y creciente— de cada update procesado y se
descarta el repetido. Es barato y evita el error más obvio de todo el diseño.

## Qué cambia en la base de datos

Tres tablas nuevas. Ningún cambio en las 27 que ya están en el esquema, ningún
backfill, migración puramente aditiva que se aplica y se revierte sin tocar un
dato.

- **`telegram_link`** — `id`, `telegramUserId` (BigInt, único), `userId`, `bookId`,
  `createdAt`, `lastUsedAt`. Claves foráneas a `authUser` y a `book` con
  `onDelete: Cascade`: si la cuenta se va o el libro se borra, el vínculo se va con
  ellos. Es lo contrario de lo que ADR-004 decidió para el rastro, y a propósito: el
  rastro pertenece al libro y sobrevive a la persona; el vínculo pertenece a la
  persona y no le sirve a nadie más.

  Único por `telegramUserId`: una cuenta de Telegram apunta a una persona y a un
  libro a la vez, y `/libro` cambia el `bookId` de esa misma fila. La alternativa
  —varios vínculos y un libro activo, replicando `activeOrganizationId`— queda
  anotada como decisión abierta.

- **`telegram_link_token`** — `id`, `tokenHash` (SHA-256; el token en claro no se
  guarda nunca), `userId`, `bookId`, `expiresAt`, `usedAt`, `createdAt`. Se poda por
  vencimiento con una tarea del `ScheduleModule`, que ya está montado.

- **`telegram_update`** — `updateId` único y `seenAt`, podada por edad. Es la tabla
  de idempotencia y no tiene libro.

**Las tres van en `SIN_LIBRO`, y el motivo importa.** Dos de ellas tienen `bookId`,
así que la tentación es dejarlas pasar por el filtro. No se puede: se consultan
*antes* de que haya libro en el contexto, exactamente como `bookMember` en
`LibroMiddleware`, que por eso se consulta con `clientSinFiltroDeLibro`. El comentario
que ya está escrito en ese archivo es el que manda —pasarlas por el filtro sería
pedirle al portero que muestre la llave antes de entrar— y hay que repetirlo ahí,
porque esa lista es «la única forma de que algo quede sin filtrar» y agregarle tres
entradas es una decisión que hay que poder defender.

La consecuencia que hay que aceptar: son tres agujeros más si alguien las usa mal.
`clasificacion-de-modelos.spec.ts` ya existe y hay que extenderlo para que cubra las
tres.

**Y hay una segunda lista que también hay que tocar, o el día de la migración se
rompe una prueba.** `vaciado.spec.ts` lee `schema.prisma`, junta toda tabla que
tenga un campo `bookId` y exige que cada una esté clasificada en `SE_BORRA` o en
`SE_CONSERVA`. `telegram_link` y `telegram_link_token` llevan `bookId`, así que la
prueba se pone roja en cuanto la migración entre. No es papeleo: es la decisión de
qué pasa con el vínculo cuando alguien vacía su libro.

La respuesta es `SE_CONSERVA` para las dos, por el mismo argumento que `bookMember`:
vaciar un libro no borra el libro ni echa a su gente, y desvincular el bot sin que
nadie lo pidiera sería castigar con una desconexión silenciosa a quien solo quería
empezar de cero. El vínculo muere cuando muere la persona o el libro, y de eso ya se
encargan las claves foráneas con `onDelete: Cascade`. `telegram_update` no tiene
`bookId` y queda fuera de esa prueba.

Al entorno, en `loadEnv`: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`,
`TELEGRAM_WEBHOOK_PATH` y un modo (`webhook`, `polling` o apagado).

## Decisiones abiertas

Estas no las resuelve este documento. Son del dueño del producto.

1. **Si el bot existe.** Es la primera y no es técnica. Poner la contabilidad en
   Telegram contradice el espíritu de ADR-003 y ADR-005: el producto pasa a tener una
   copia del libro en un servidor de terceros, para siempre y fuera de control. Todo
   lo demás de esta lista depende de que la respuesta sea que sí.
2. **Qué pasa con el bot el día que llegue 6c.** Muere, convive con un libro sin
   cifrar, o 6c se rediseña. Decidirlo ahora cuesta una frase; descubrirlo después
   cuesta el volteo entero.
3. **Comprobantes por foto: sí o no.** Es la capacidad más útil del bot y la que más
   datos manda a Telegram.
4. **Reglas de categoría aprendidas.** Que «súper» caiga solo en Mercado la segunda
   vez ahorra el único toque que queda. También es una inferencia que puede
   equivocarse en silencio, y el producto entero está construido sobre no equivocarse
   en silencio.
5. **Un vínculo por persona, o uno por persona y libro.** Cambia la tabla y cambia
   qué hace `/libro`.
6. **Qué puede hacer un `viewer`.** ¿Puede vincular y consultar un saldo, o el bot
   es solo para quien escribe?
7. **La ventana de deshacer**, y si deshacer anula —dejando el movimiento anulado y
   su asiento de reversión, que es lo que hace el dominio hoy— o si para un error de
   segundos se quiere otra cosa.
8. **Qué puede leer el bot.** Este diseño propone una sola cifra, el gasto del mes.
   Podría ser ninguna.
9. **El nombre del bot, y si su `@username` es descubrible.** Un `@tledger_bot`
   público le anuncia al mundo que la instancia existe.
10. **Un bot por instancia de T-Ledger, o uno solo.** Ya hay noción de instancia en
    `ADMIN_EMAILS`, y un bot compartido entre instancias es un tercero más en el
    medio.

## Lo que queda explícitamente afuera de este diseño

Mini App de Telegram, modo inline, bots en grupos, notificaciones que el bot mande
sin que nadie le pregunte —recordatorios, avisos de presupuesto, resúmenes del mes—,
pagos, y cualquier interpretación del mensaje por un modelo de lenguaje. Cada una es
una decisión aparte y ninguna hace que anotar cueste menos.

## Referencias

Toda afirmación sobre la Bot API o sobre las librerías sale de su documentación,
consultada el 2026-09-22:

- Bot API — `setWebhook`, `secret_token`, la cabecera
  `X-Telegram-Bot-Api-Secret-Token`, `allowed_updates`, los reintentos ante respuestas
  que no son 2XX y los puertos 443/80/88/8443: <https://core.telegram.org/bots/api>
- Bot API — `deleteMessage` y su límite de 48 horas sobre mensajes entrantes en chats
  privados: <https://core.telegram.org/bots/api>
- Bot API — `LoginUrl` y la obligación de comprobar el hash de los datos de
  autorización: <https://core.telegram.org/bots/api>
- Bot API changelog — las subredes `149.154.160.0/20` y `91.108.4.0/22` desde julio
  de 2019, y la lista viva en <https://core.telegram.org/bots/webhooks>:
  <https://core.telegram.org/bots/api-changelog>
- Bots — deep linking con `https://t.me/<bot>?start=<payload>`:
  <https://core.telegram.org/bots/features>
- Mini Apps — verificación de `initData` con
  `secret_key = HMAC_SHA256(<bot_token>, "WebAppData")`:
  <https://core.telegram.org/bots/webapps>
- grammY — deep linking y `ctx.match`; el cliente no le muestra el payload al
  usuario: <https://grammy.dev/guide/commands>
- grammY — `webhookCallback`, adaptadores de framework, el timeout de 10 segundos y
  por qué tira en vez de devolver: <https://grammy.dev/guide/deployment-types>
- grammY — filter queries y el estrechamiento de tipos del contexto:
  <https://grammy.dev/guide/filter-queries>
- Telegraf — `createWebhook({ secretToken })` y `bot.launch({ webhook: { … } })`:
  <https://github.com/telegraf/telegraf>
