# Flujo de skills

Qué skills del plugin [agent-skills](https://github.com/addyosmani/agent-skills) (v0.6.10) se usan en este proyecto y en qué orden, según el caso. Al invocarlas llevan el prefijo `agent-skills:`.

Primero se identifica el caso y después se invocan sus skills en el orden indicado. El tamaño del cambio define la ruta: un ajuste chico va por la corta. Si se nombran skills explícitas para una tarea, esas mandan.

## Reglas que valen siempre

- **Documentación oficial antes de escribir código.** `source-driven-development` con Context7 (`resolve-library-id` → `query-docs`) para NestJS, Prisma, Better Auth, TanStack, Vite, shadcn, Vercel, Railway o cualquier librería. Las fuentes se citan.
- **Test primero.** Toda lógica nueva o bug pasa por `test-driven-development`: el test falla antes del cambio y pasa después. En bugs se usa el patrón Prove-It.
- **Definition of Done.** Tests verdes, sin regresiones, verificado en ejecución, documentación y [`novedades.md`](web/src/features/shell/novedades.md) al día.
- **Commits.** `git-workflow-and-versioning` con Conventional Commits y gitmoji.
- **Duda metódica.** Toda decisión no trivial (cruza módulos, auth, datos, dinero, cambios irreversibles) pasa por `doubt-driven-development`: una revisión adversarial con contexto nuevo antes de darla por buena.
- **Preguntas.** Una pregunta se responde. No dispara skills de construcción.
- **Navegador.** Todo lo que corre en el navegador se verifica con `browser-testing-with-devtools` y el MCP de Chrome DevTools: reproducir → inspeccionar consola, red y DOM → arreglar → volver a verificar. Playwright queda para recorrer flujos completos.

## Por caso

### 1. Idea vaga

`interview-me` (una pregunta por vez hasta saber quién, por qué, qué es éxito y cuál es la restricción) → `idea-refine` si hay varias variantes → caso 2.

### 2. Feature nueva (varios archivos o módulos)

1. `spec-driven-development`: spec en `docs/plans/AAAA-MM-DD-nombre.md`, supuestos explícitos, aprobación.
2. `planning-and-task-breakdown`: tareas de ≤5 archivos con criterios de aceptación.
3. `context-engineering`: cargar solo lo necesario.
4. `source-driven-development`.
5. `incremental-implementation` + `test-driven-development` por slice, o `/agent-skills:build auto` si el plan entero está aprobado.
6. Según la capa:
   - API → `api-and-interface-design`
   - UI → `frontend-ui-engineering` + [DESIGN.md](DESIGN.md)
   - Input, auth, archivos o terceros → `security-and-hardening`
   - Rutas críticas → `observability-and-instrumentation` (en paralelo al build)
7. `doubt-driven-development` en las decisiones grandes.
8. `code-review-and-quality` (o el agente `code-reviewer`).
9. `code-simplification`.
10. `documentation-and-adrs`: ADR en `docs/decisions/` si hay decisión de arquitectura.
11. `shipping-and-launch` (`/agent-skills:ship`).

### 3. Ajuste chico (1–2 archivos, sin lógica nueva, texto o estilo)

Directo. Si es UI, `frontend-ui-engineering` y una verificación con Chrome DevTools. Sin spec ni plan.

### 4. Bug reportado

`debugging-and-error-recovery` (reproducir → localizar → reducir → causa raíz → guardia) → `test-driven-development` Prove-It → arreglo de raíz → suite completa y build → `code-review-and-quality`. Si es UI, `browser-testing-with-devtools`.

### 5. Error en producción

`debugging-and-error-recovery` sobre evidencia real: Sentry (`search_issues`, `search_events`), `railway logs`, logs de Vercel, `railway ssh` para la base. Luego, el caso 4. Al cerrar: `observability-and-instrumentation` si faltaron datos para diagnosticar, y volver a verificar en producción después del deploy.

### 6. Test o build roto

`debugging-and-error-recovery` con Stop-the-Line: no se sigue con otra cosa. Nunca se salta, borra ni afloja un test para que pase.

### 7. Cambio o endpoint nuevo en la API

`api-and-interface-design` → contrato en Zod + zod-openapi → `npm run api:types` para regenerar los tipos del web → `security-and-hardening` (guards, permisos, cobertura de permisos) → tests de integración con Testcontainers.

### 8. Esquema de base de datos o migración de Prisma

`deprecation-and-migration` (expand/contract si toca columnas que ya existen en producción) → `doubt-driven-development` → migración probada en local y con la suite → plan de rollback antes del deploy.

### 9. Refactor sin cambio de comportamiento

`code-simplification` (`/agent-skills:code-simplify`) → tests verdes antes y después → commit separado de cualquier feature.

### 10. Seguridad (auth, sesiones, invitaciones, archivos, secretos, dependencias)

`security-and-hardening` (OWASP, mínimo privilegio, `npm audit`) → agente `security-auditor` → `doubt-driven-development`.

### 11. Rendimiento, PWA o carga lenta

`performance-optimization` (medir primero) → `/agent-skills:webperf` (agente `web-performance-auditor`; modo profundo con Lighthouse si hay URL) → volver a medir después del cambio.

### 12. Quitar o reemplazar algo (feature, endpoint, dependencia)

`deprecation-and-migration`.

### 13. Documentar una decisión o un cambio público

`documentation-and-adrs` → ADR en `docs/decisions/` y entrada con versión en `novedades.md`.

### 14. Deploy

`shipping-and-launch` vía `/agent-skills:ship`: `code-reviewer`, `security-auditor` y `test-engineer` en paralelo → GO/NO-GO con plan de rollback. El fan-out se salta solo si el cambio son ≤2 archivos, <50 líneas y no toca auth, datos, pagos ni configuración. Después: verificar el deploy en Railway y Vercel y probar en producción.

### 15. CI/CD, Railway IaC, `vercel.json`

`ci-cd-and-automation` + `source-driven-development` (documentación de Railway y Vercel vía Context7).

### 16. Barra de calidad

[`CONSTRAINTS.md`](CONSTRAINTS.md) fija la vara del proyecto y se cumple en cada cambio: `npm run check:fast` después de editar, `npm run check:task` al cerrar una tarea y `npm run check:full` antes de cada push (no hay CI). Lo que no es piso avisa hasta el 2026-10-07 y después bloquea. Para cambiar umbrales, `/agent-skills:constraints`; para anotar un valor medido que mejoró, `/agent-skills:constraints ratchet`. Un valor que empeora no se sube para que pase: va a la tabla de excepciones, con motivo, dueño y vencimiento.

### 18. Criptografía (la fase 6c)

Las skills de addy no cubren cifrado de datos: la de seguridad solo habla de hashear contraseñas (ver [ADR-003](docs/decisions/ADR-003-diferir-el-cifrado-extremo-a-extremo.md)). Además de los casos 2, 8, 10 y 12, cada decisión de llaves se apoya en documentación oficial de criptografía (WebCrypto en MDN, o la librería que se elija) con `source-driven-development`, y en `doubt-driven-development` la segunda opinión de otro modelo es obligatoria, no una oferta. El orden es 6a → 6b → 6c: no se empieza el cifrado sin la concurrencia resuelta.

### 17. Revisar código ajeno o un PR

`code-review-and-quality` (`/agent-skills:review`), con hallazgos etiquetados Critical, Nit, Optional o FYI.
