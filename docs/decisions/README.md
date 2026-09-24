# Decisiones de arquitectura

Una decisión por archivo, con lo que se rechazó y por qué. Las que ya no valen no se borran:
se escribe una nueva que las reemplaza y la vieja queda con su estado cambiado, porque el
valor de un ADR es el contexto de cuando se decidió, no la conclusión.

| # | Decisión | Estado |
|---|---|---|
| [001](ADR-001-un-usuario-varios-libros.md) | Un usuario pertenece a varios libros, con Better Auth | Aceptado |
| [002](ADR-002-aislamiento-entre-libros.md) | El aislamiento entre libros va en dos capas | Aceptado |
| [003](ADR-003-diferir-el-cifrado-extremo-a-extremo.md) | El cifrado extremo a extremo se difiere, no se descarta | Aceptado |
| [004](ADR-004-audit-log-en-la-transaccion-del-cambio.md) | El audit log se escribe en la misma transacción que el cambio | Aceptado |
| [005](ADR-005-sentry-sin-datos-del-libro.md) | Sentry no recibe un solo dato del libro | Aceptado |
| [006](ADR-006-candado-por-libro-para-la-concurrencia.md) | Las escrituras de un libro van en fila, con un candado por libro | Aceptado |

El diseño completo del que salen las cinco está en
[`../superpowers/specs/2026-09-21-multiusuario-design.md`](../superpowers/specs/2026-09-21-multiusuario-design.md).
