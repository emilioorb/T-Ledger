export interface paths {
    "/debts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lista las deudas con paginación */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Página de deudas */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Debt"][];
                    };
                };
            };
        };
        put?: never;
        /** Crea una deuda o un préstamo otorgado */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["CreateDebtInput"];
                };
            };
            responses: {
                /** @description Deuda creada */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Debt"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/debts/payoff-plan": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Ordena las deudas según la estrategia de pago elegida */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Plan de pago */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PayoffPlan"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/debts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Devuelve una deuda */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Deuda */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Debt"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        /** Borra una deuda */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Deuda borrada */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        /** Actualiza parcialmente una deuda */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["UpdateDebtInput"];
                };
            };
            responses: {
                /** @description Deuda actualizada */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Debt"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/debts/{id}/schedule": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Devuelve la tabla de amortización, con el estado de cada cuota */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Tabla de amortización */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["DebtSchedule"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/debts/{id}/payments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Paga la siguiente cuota y registra su gasto en la contabilidad */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["PagarCuotaInput"];
                };
            };
            responses: {
                /** @description Deuda con la cuota pagada */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Debt"];
                    };
                };
                /** @description El mes del pago está cerrado */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description No quedan cuotas o la fecha es anterior al último pago */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/debts/{id}/payments/settled": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Salda la siguiente cuota sin movimiento, para lo pagado antes de llevar el libro */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["MarcarCuotaPagadaInput"];
                };
            };
            responses: {
                /** @description Deuda con la cuota saldada */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Debt"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/debts/{id}/document": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Redirige al enlace firmado del documento */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Enlace de lectura */
                302: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Sin documento */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /** Adjunta el contrato de la deuda (PDF o foto, hasta 20 MB) en multipart/form-data, campo `archivo` */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Deuda con documento */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Debt"];
                    };
                };
                /** @description El archivo no es un PDF o una foto, está vacío o pesa de más */
                400: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        /** Quita el documento de la deuda */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Deuda sin documento */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Debt"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/debts/{id}/payments/last": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Deshace el último pago y anula su movimiento, si tiene */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Deuda sin ese pago */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Debt"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/debts/{id}/simulate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Simula un abono extraordinario y reporta el ahorro */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["SimulateExtraPaymentInput"];
                };
            };
            responses: {
                /** @description Proyección del abono */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ExtraPaymentProjection"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/exchange-rates": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lista las tasas publicadas en un rango */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Tasas del rango */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ExchangeRate"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/exchange-rates/latest": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Devuelve la última tasa de compra y de venta, y si está desactualizada */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Últimas tasas */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["LatestExchangeRates"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/accounts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lista el plan de cuentas */
        get: {
            parameters: {
                query?: {
                    page?: number;
                    pageSize?: number;
                    accountClass?: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "COST_OF_REVENUE" | "OPERATING_EXPENSE";
                    active?: "true" | "false";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Cuentas del plan */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Account"][];
                    };
                };
            };
        };
        put?: never;
        /** Agrega una cuenta al plan */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["CreateAccountInput"];
                };
            };
            responses: {
                /** @description Cuenta creada */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Account"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/accounts/tree": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Devuelve el plan de cuentas como árbol, con el saldo acumulado a una fecha */
        get: {
            parameters: {
                query: {
                    currency: "CRC" | "USD";
                    at: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Árbol de cuentas con saldos */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ReportNode"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/accounts/{code}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Devuelve una cuenta */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Cuenta */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Account"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Modifica una cuenta */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["UpdateAccountInput"];
                };
            };
            responses: {
                /** @description Cuenta modificada */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Account"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/categories": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lista las categorías */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Categorías */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Category"][];
                    };
                };
            };
        };
        put?: never;
        /** Crea una categoría */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["CreateCategoryInput"];
                };
            };
            responses: {
                /** @description Categoría creada */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Category"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/categories/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Devuelve una categoría */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Categoría */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Category"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        /** Borra una categoría */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Borrada */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        /** Modifica una categoría */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["UpdateCategoryInput"];
                };
            };
            responses: {
                /** @description Categoría modificada */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Category"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/movements": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lista movimientos */
        get: {
            parameters: {
                query?: {
                    page?: number;
                    pageSize?: number;
                    kind?: "EXPENSE" | "INCOME";
                    status?: "ACTIVE" | "VOIDED";
                    categoryId?: string;
                    from?: string;
                    to?: string;
                    search?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Movimientos */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Movement"][];
                    };
                };
            };
        };
        put?: never;
        /** Registra un gasto o un ingreso, y su asiento si la categoría tiene cuenta */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["CreateMovementInput"];
                };
            };
            responses: {
                /** @description Movimiento registrado */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Movement"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/movements/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Suma por categoría de los movimientos que cumplen el filtro, sin paginar */
        get: {
            parameters: {
                query?: {
                    kind?: "EXPENSE" | "INCOME";
                    status?: "ACTIVE" | "VOIDED";
                    categoryId?: string;
                    from?: string;
                    to?: string;
                    search?: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Totales por categoría */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["CategoryTotal"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/movements/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Devuelve un movimiento */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Movimiento */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Movement"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Corrige un movimiento: revierte su asiento vigente y emite uno nuevo */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["UpdateMovementInput"];
                };
            };
            responses: {
                /** @description Movimiento corregido */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Movement"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/movements/{id}/receipt": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Redirige al comprobante, con un enlace que vence en minutos */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Al archivo */
                302: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /** Sube el comprobante de un movimiento: una foto o un PDF, hasta 5 MB */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "multipart/form-data": {
                        /** Format: binary */
                        archivo: string;
                    };
                };
            };
            responses: {
                /** @description Movimiento con su comprobante */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Movement"];
                    };
                };
            };
        };
        /** Quita el comprobante de un movimiento */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Movimiento sin comprobante */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Movement"];
                    };
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/movements/{id}/void": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Anula un movimiento y registra el asiento de reversión */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Movimiento anulado */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Movement"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/journal-entries": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lista los asientos de un rango */
        get: {
            parameters: {
                query: {
                    page?: number;
                    pageSize?: number;
                    from: string;
                    to: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Asientos */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["JournalEntry"][];
                    };
                };
            };
        };
        put?: never;
        /** Registra un asiento manual, con invariante por moneda */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["CreateJournalEntryInput"];
                };
            };
            responses: {
                /** @description Asiento registrado */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["JournalEntry"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/journal-entries/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Devuelve un asiento */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Asiento */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["JournalEntry"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reports/ledger": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Mayor de una cuenta en una moneda */
        get: {
            parameters: {
                query: {
                    currency: "CRC" | "USD";
                    from: string;
                    to: string;
                    account: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Mayor con saldo inicial, corrido y final */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["GeneralLedger"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reports/trial-balance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Balance de comprobación, en JSON o CSV */
        get: {
            parameters: {
                query: {
                    currency: "CRC" | "USD";
                    from: string;
                    to: string;
                    format?: "json" | "csv";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Comprobación del período */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["TrialBalance"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reports/financial-position": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Estado de situación a una fecha, con el resultado del período en patrimonio */
        get: {
            parameters: {
                query: {
                    currency: "CRC" | "USD";
                    at: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Estado de situación */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["FinancialPosition"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reports/net-worth": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Patrimonio consolidado a una fecha, con el efecto del tipo de cambio separado */
        get: {
            parameters: {
                query: {
                    at: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Patrimonio consolidado */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["NetWorth"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/reports/income-statement": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Estado de resultados de un rango */
        get: {
            parameters: {
                query: {
                    currency: "CRC" | "USD";
                    from: string;
                    to: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Estado de resultados */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["IncomeStatement"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/periods": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Estado de cada mes con actividad y qué falta para poder cerrarlo */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Períodos */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["PeriodSummary"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/periods/{period}/close": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Cierra un mes si no hay bloqueos */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Período cerrado */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["AccountingPeriod"];
                    };
                };
                /** @description El período tiene bloqueos */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/periods/{period}/reopen": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Reabre un mes y todos los posteriores que estén cerrados */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Períodos reabiertos */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ReopenedPeriods"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/budget/evaluation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Evalúa un mes: cuánto se asignó por cubeta y cuánto se consumió de verdad */
        get: {
            parameters: {
                query: {
                    month: string;
                    currency: "CRC" | "USD";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Evaluación del mes */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["BudgetEvaluation"];
                    };
                };
                /** @description No hay modelo de presupuesto activo */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/budget/income/{period}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Devuelve el ingreso declarado del mes */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Ingreso del mes */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["MonthlyIncome"];
                    };
                };
            };
        };
        /** Declara el ingreso estimado del mes */
        put: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["MonthlyIncomeInput"];
                };
            };
            responses: {
                /** @description Ingreso declarado */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["MonthlyIncome"];
                    };
                };
            };
        };
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/budget-models": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lista los modelos de presupuesto */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Modelos */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["BudgetModelResponse"][];
                    };
                };
            };
        };
        put?: never;
        /** Crea un modelo de presupuesto; activarlo desactiva el resto */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["BudgetModelInput"];
                };
            };
            responses: {
                /** @description Modelo creado */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["BudgetModelResponse"];
                    };
                };
                /** @description Los porcentajes no suman 100 o falta la cubeta de ahorro */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/budget-models/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Devuelve un modelo de presupuesto */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Modelo */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["BudgetModelResponse"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Modifica un modelo de presupuesto */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["BudgetModelInput"];
                };
            };
            responses: {
                /** @description Modelo modificado */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["BudgetModelResponse"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/goals": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lista las metas por prioridad, con su avance y su fecha proyectada */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Metas */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Goal"][];
                    };
                };
            };
        };
        put?: never;
        /** Crea una meta */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["CreateGoalInput"];
                };
            };
            responses: {
                /** @description Meta creada */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Goal"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/goals/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Devuelve una meta */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Meta */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Goal"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        /** Borra una meta y sus aportes */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Borrada */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        /** Modifica una meta */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["UpdateGoalInput"];
                };
            };
            responses: {
                /** @description Meta modificada */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Goal"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/goals/{id}/contributions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Registra un aporte a la meta */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["CreateContributionInput"];
                };
            };
            responses: {
                /** @description Aporte registrado */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Goal"];
                    };
                };
                /** @description El aporte es de otra moneda */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/investments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lista las inversiones con su valor de hoy */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Inversiones */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Investment"][];
                    };
                };
            };
        };
        put?: never;
        /** Registra una inversión, a plazo o abierta */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["CreateInvestmentInput"];
                };
            };
            responses: {
                /** @description Inversión registrada */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Investment"];
                    };
                };
                /** @description Un plazo fijo necesita vencimiento */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/investments/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Devuelve una inversión */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Inversión */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Investment"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        /** Borra una inversión y sus aportes */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Borrada */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        /** Modifica una inversión */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["UpdateInvestmentInput"];
                };
            };
            responses: {
                /** @description Inversión modificada */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Investment"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/investments/{id}/projection": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Valor capitalizado a una fecha; una inversión a plazo no pasa de su vencimiento */
        get: {
            parameters: {
                query: {
                    at: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Valor proyectado */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Investment"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/investments/{id}/contributions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Agrega capital, que capitaliza desde su propia fecha */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["InvestmentContributionInput"];
                };
            };
            responses: {
                /** @description Aporte registrado */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Investment"];
                    };
                };
                /** @description El aporte es de otra moneda */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/projections": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Proyecta el flujo mes a mes: ingreso, egreso comprometido, excedente y qué cuotas se liberan */
        get: {
            parameters: {
                query?: {
                    months?: number;
                    currency?: "CRC" | "USD";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Flujo proyectado por mes */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/bank-accounts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lista las cuentas bancarias */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Cuentas */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["BankAccount"][];
                    };
                };
            };
        };
        put?: never;
        /** Registra una cuenta bancaria contra una cuenta del plan */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["BankAccountInput"];
                };
            };
            responses: {
                /** @description Cuenta creada */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["BankAccount"];
                    };
                };
                /** @description La cuenta contable no acepta asientos */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/bank-accounts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Devuelve una cuenta bancaria */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Cuenta */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["BankAccount"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Modifica una cuenta bancaria */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["BankAccountInput"];
                };
            };
            responses: {
                /** @description Cuenta modificada */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["BankAccount"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/import-profiles": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lista los perfiles de importación */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Perfiles */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ImportProfile"][];
                    };
                };
            };
        };
        put?: never;
        /** Crea un perfil: cómo leer el CSV de un banco */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["ImportProfileInput"];
                };
            };
            responses: {
                /** @description Perfil creado */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ImportProfile"];
                    };
                };
                /** @description El perfil necesita monto con signo o el par débito y crédito */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/import-profiles/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Devuelve un perfil */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Perfil */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ImportProfile"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Modifica un perfil */
        patch: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["ImportProfileInput"];
                };
            };
            responses: {
                /** @description Perfil modificado */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ImportProfile"];
                    };
                };
            };
        };
        trace?: never;
    };
    "/bank-statements": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lista los extractos importados */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Extractos */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        /** Importa un extracto en CSV, saltando las líneas que ya estaban */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Extracto importado */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ImportResult"];
                    };
                };
                /** @description El archivo no coincide con el perfil */
                422: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/bank-statements/preview": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Lee el archivo con el perfil y devuelve las líneas sin guardar nada */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Líneas leídas */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ParsedBankLine"][];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/bank-accounts/{id}/reconciliation": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Líneas pendientes, sugerencias y los tres saldos */
        get: {
            parameters: {
                query: {
                    page?: number;
                    pageSize?: number;
                    from: string;
                    to: string;
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Conciliación */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Reconciliation"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/bank-lines/{id}/match": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Concilia la línea con un movimiento */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["MatchLineInput"];
                };
            };
            responses: {
                /** @description Línea conciliada */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description El movimiento ya está conciliado con otra línea */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/bank-lines/{id}/unmatch": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Deshace la conciliación */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Pendiente otra vez */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/bank-lines/{id}/ignore": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Saca la línea de pendientes sin crear nada */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Línea ignorada */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/bank-lines/{id}/to-movement": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Crea el movimiento desde la línea y la concilia con él */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["LineToMovementInput"];
                };
            };
            responses: {
                /** @description Movimiento creado */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description El período está cerrado o la línea ya está conciliada */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/audit-log": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Lista quién cambió qué en el libro, del más reciente al más viejo */
        get: {
            parameters: {
                query?: {
                    page?: number;
                    pageSize?: number;
                    entity?: "movimiento" | "periodo" | "deuda" | "meta" | "inversion" | "presupuesto" | "miembro";
                    entityId?: string;
                    userId?: string;
                    search?: string;
                    sort?: "cuando" | "quien" | "que";
                    direction?: "asc" | "desc";
                };
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Entradas del registro */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["EntradaDeRastro"][];
                    };
                };
                /** @description Solo el dueño del libro ve el registro */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/book/invitations/{id}/link": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Un enlace nuevo para una invitación pendiente del libro; el anterior deja de servir */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description El token del enlace (se muestra una sola vez) */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["EnlaceDeInvitacionAlLibro"];
                    };
                };
                /** @description Tu rol no puede invitar a este libro */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description No es una invitación pendiente de este libro */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/book": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Borra el libro activo entero, para todos sus miembros. No se puede con el último */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["BorrarLibro"];
                };
            };
            responses: {
                /** @description Borrado */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description La contraseña no es la de quien pide */
                401: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Es el único libro de la persona */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/book/mine": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Los libros a los que pertenece quien pregunta, con su rol en cada uno */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Tus libros */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["LibroPropio"][];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/book/empty": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Borra lo anotado en el libro y conserva los catálogos y el registro */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["VaciarLibro"];
                };
            };
            responses: {
                /** @description Lo que se borró */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["Vaciado"];
                    };
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Dice si quien pregunta administra la instancia */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Sí o no */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["SoyAdmin"];
                    };
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/invitations": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Las invitaciones a la app que siguen esperando */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Pendientes */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["InvitacionALaApp"][];
                    };
                };
            };
        };
        put?: never;
        /** Invita a un correo a registrarse en la app, sin meterlo en ningún libro */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: {
                content: {
                    "application/json": components["schemas"]["InvitarALaAppInput"];
                };
            };
            responses: {
                /** @description Invitación vigente por una semana, con el token de su enlace (se muestra una sola vez) */
                201: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["InvitacionALaAppConEnlace"];
                    };
                };
                /** @description No administrás esta instancia */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description Ese correo ya tiene cuenta */
                409: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/invitations/{id}/link": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Un enlace nuevo para una invitación a la app; el anterior deja de servir */
        post: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description El token del enlace nuevo (se muestra una sola vez) */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["EnlaceDeInvitacion"];
                    };
                };
                /** @description No existe, venció o ya se usó */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/invitations/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Cancela una invitación a la app sin usar */
        delete: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Cancelada */
                204: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
                /** @description No existe o ya se usó */
                404: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/summary": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Los números del servidor entero, solo para la administración */
        get: {
            parameters: {
                query?: never;
                header?: never;
                path?: never;
                cookie?: never;
            };
            requestBody?: never;
            responses: {
                /** @description Resumen */
                200: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content: {
                        "application/json": components["schemas"]["ResumenDeInstancia"];
                    };
                };
                /** @description No administrás esta instancia */
                403: {
                    headers: {
                        [name: string]: unknown;
                    };
                    content?: never;
                };
            };
        };
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** CreateDebtInput */
        CreateDebtInput: {
            name: string;
            counterparty: string;
            principal: components["schemas"]["Money"];
            annualRate: string;
            /** @enum {string} */
            compounding: "MONTHLY" | "ANNUAL";
            termMonths: number;
            startDate: string;
            /** @enum {string} */
            kind: "FRENCH" | "FIXED_PRINCIPAL" | "INTEREST_FREE";
            /** @enum {string} */
            direction: "BORROWED" | "LENT";
            budgetBucket: string | null;
            notes?: string | null;
        };
        /** Money */
        Money: {
            minorUnits: string;
            /** @enum {string} */
            currency: "CRC" | "USD";
        };
        /** UpdateDebtInput */
        UpdateDebtInput: {
            name?: string;
            counterparty?: string;
            principal?: components["schemas"]["Money"];
            annualRate?: string;
            /** @enum {string} */
            compounding?: "MONTHLY" | "ANNUAL";
            termMonths?: number;
            startDate?: string;
            /** @enum {string} */
            kind?: "FRENCH" | "FIXED_PRINCIPAL" | "INTEREST_FREE";
            /** @enum {string} */
            direction?: "BORROWED" | "LENT";
            budgetBucket?: string | null;
            notes?: string | null;
        };
        /** PagarCuotaInput */
        PagarCuotaInput: {
            date: string;
            paymentAccountCode: string;
            categoryId: string;
        };
        /** MarcarCuotaPagadaInput */
        MarcarCuotaPagadaInput: {
            date: string;
        };
        /** SimulateExtraPaymentInput */
        SimulateExtraPaymentInput: {
            amount: components["schemas"]["Money"];
            afterInstallment: number;
            /** @enum {string} */
            mode: "REDUCE_TERM" | "REDUCE_PAYMENT";
        };
        /** CreateAccountInput */
        CreateAccountInput: {
            code: string;
            name: string;
            /** @enum {string} */
            accountClass: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "COST_OF_REVENUE" | "OPERATING_EXPENSE";
            /** @default null */
            parentCode: string | null;
            /** @default true */
            active: boolean;
            /** @default 0 */
            sortOrder: number;
        };
        /** UpdateAccountInput */
        UpdateAccountInput: {
            name?: string;
            /** @enum {string} */
            accountClass?: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "COST_OF_REVENUE" | "OPERATING_EXPENSE";
            parentCode?: string | null;
            active?: boolean;
            sortOrder?: number;
        };
        /** CreateCategoryInput */
        CreateCategoryInput: {
            name: string;
            /** @enum {string} */
            kind: "EXPENSE" | "INCOME";
            /** @default null */
            accountCode: string | null;
            /** @default 0 */
            sortOrder: number;
            /** @default true */
            active: boolean;
            /** @default null */
            colorIndex: number | null;
        };
        /** UpdateCategoryInput */
        UpdateCategoryInput: {
            name?: string;
            /** @enum {string} */
            kind?: "EXPENSE" | "INCOME";
            accountCode?: string | null;
            sortOrder?: number;
            active?: boolean;
            colorIndex?: number | null;
        };
        /** CreateMovementInput */
        CreateMovementInput: {
            date: string;
            /** @enum {string} */
            kind: "EXPENSE" | "INCOME";
            categoryId: string;
            counterparty: string;
            amount: components["schemas"]["Money"];
            /** @default null */
            paymentAccountCode: string | null;
        };
        /** UpdateMovementInput */
        UpdateMovementInput: {
            date?: string;
            /** @enum {string} */
            kind?: "EXPENSE" | "INCOME";
            categoryId?: string;
            counterparty?: string;
            amount?: components["schemas"]["Money"];
            paymentAccountCode?: string | null;
        };
        /** CreateJournalEntryInput */
        CreateJournalEntryInput: {
            date: string;
            description: string;
            /** @default null */
            reference: string | null;
            lines: {
                accountCode: string;
                amount: components["schemas"]["Money"];
                /** @enum {string} */
                side: "DEBIT" | "CREDIT";
            }[];
        };
        /** MonthlyIncomeInput */
        MonthlyIncomeInput: {
            amount: components["schemas"]["NonNegativeMoney"];
        };
        /** NonNegativeMoney */
        NonNegativeMoney: components["schemas"]["Money"];
        /** BudgetModelInput */
        BudgetModelInput: {
            name: string;
            /** @default false */
            active: boolean;
            buckets: components["schemas"]["BudgetBucketInput"][];
        };
        /** BudgetBucketInput */
        BudgetBucketInput: {
            id: string;
            name: string;
            percentage: string;
            /** @default false */
            isSavings: boolean;
            /** @default [] */
            accountCodes: string[];
            /** @default null */
            colorIndex: number | null;
        };
        /** CreateGoalInput */
        CreateGoalInput: {
            name: string;
            target: components["schemas"]["Money"];
            desiredDate: string;
            /** @default 0 */
            priority: number;
            /** @default null */
            accountCode: string | null;
            /** @default true */
            active: boolean;
        };
        /** UpdateGoalInput */
        UpdateGoalInput: {
            name?: string;
            target?: components["schemas"]["Money"];
            desiredDate?: string;
            priority?: number;
            accountCode?: string | null;
            active?: boolean;
        };
        /** CreateContributionInput */
        CreateContributionInput: {
            date: string;
            amount: components["schemas"]["Money"];
            fromAccountCode: string;
        };
        /** CreateInvestmentInput */
        CreateInvestmentInput: {
            name: string;
            principal: components["schemas"]["Money"];
            annualRate: string;
            /** @enum {string} */
            compounding: "MONTHLY" | "ANNUAL";
            openedAt: string;
            /** @enum {string} */
            kind: "FIXED_TERM" | "OPEN";
            /** @default null */
            maturesAt: string | null;
            /** @default null */
            accountCode: string | null;
        };
        /** UpdateInvestmentInput */
        UpdateInvestmentInput: {
            name?: string;
            principal?: components["schemas"]["Money"];
            annualRate?: string;
            /** @enum {string} */
            compounding?: "MONTHLY" | "ANNUAL";
            openedAt?: string;
            /** @enum {string} */
            kind?: "FIXED_TERM" | "OPEN";
            maturesAt?: string | null;
            accountCode?: string | null;
        };
        /** InvestmentContributionInput */
        InvestmentContributionInput: {
            date: string;
            amount: components["schemas"]["Money"];
            fromAccountCode: string;
        };
        /** BankAccountInput */
        BankAccountInput: {
            name: string;
            accountCode: string;
            /** @enum {string} */
            currency: "CRC" | "USD";
            /** @default null */
            profileId: string | null;
            /** @default true */
            active: boolean;
        };
        /** ImportProfileInput */
        ImportProfileInput: {
            name: string;
            delimiter: string;
            /** @enum {string} */
            encoding: "utf-8" | "latin1";
            /** @default 1 */
            headerRows: number;
            dateColumn: number;
            /** @enum {string} */
            dateFormat: "DD/MM/YYYY" | "YYYY-MM-DD";
            descriptionColumn: number;
            /** @default null */
            referenceColumn: number | null;
            /** @default null */
            amountColumn: number | null;
            /** @default null */
            debitColumn: number | null;
            /** @default null */
            creditColumn: number | null;
            /** @enum {string} */
            decimalSeparator: "." | ",";
            /** @default null */
            thousandsSeparator: string | null;
        };
        /** MatchLineInput */
        MatchLineInput: {
            movementId: string;
        };
        /** LineToMovementInput */
        LineToMovementInput: {
            categoryId: string;
            counterparty?: string;
        };
        /** BorrarLibro */
        BorrarLibro: {
            password: string;
        };
        /** VaciarLibro */
        VaciarLibro: {
            password: string;
        };
        /** InvitarALaAppInput */
        InvitarALaAppInput: {
            /** Format: email */
            email: string;
        };
        /** Debt */
        Debt: {
            id: string;
            name: string;
            counterparty: string;
            principal: components["schemas"]["MoneyOutput"];
            outstanding: components["schemas"]["MoneyOutput"];
            annualRate: string;
            /** @enum {string} */
            compounding: "MONTHLY" | "ANNUAL";
            termMonths: number;
            startDate: string;
            /** @enum {string} */
            kind: "FRENCH" | "FIXED_PRINCIPAL" | "INTEREST_FREE";
            /** @enum {string} */
            direction: "BORROWED" | "LENT";
            budgetBucket: string | null;
            notes: string | null;
            hasDocument: boolean;
            monthlyPayment: components["schemas"]["MoneyOutput"];
            totalInterest: components["schemas"]["MoneyOutput"];
            payoffDate: string;
        };
        /** PayoffPlan */
        PayoffPlan: {
            /** @enum {string} */
            strategy: "avalanche" | "snowball" | "manual";
            order: {
                id: string;
                name: string;
                balance: components["schemas"]["MoneyOutput"];
                annualRate: string;
                monthlyPayment: components["schemas"]["MoneyOutput"];
            }[];
        };
        /** DebtSchedule */
        DebtSchedule: {
            installments: components["schemas"]["DebtInstallment"][];
            totalInterest: components["schemas"]["MoneyOutput"];
            totalPaid: components["schemas"]["MoneyOutput"];
        };
        /** DebtInstallment */
        DebtInstallment: {
            number: number;
            dueDate: string;
            payment: components["schemas"]["MoneyOutput"];
            principal: components["schemas"]["MoneyOutput"];
            interest: components["schemas"]["MoneyOutput"];
            balance: components["schemas"]["MoneyOutput"];
            /** @enum {string} */
            status: "PAID" | "OVERDUE" | "PENDING";
            paidOn: string | null;
            withMovement: boolean;
        };
        /** ExtraPaymentProjection */
        ExtraPaymentProjection: {
            baseline: components["schemas"]["AmortizationSchedule"];
            withExtraPayment: components["schemas"]["AmortizationSchedule"];
            extraPayment: components["schemas"]["MoneyOutput"];
            interestSaved: components["schemas"]["MoneyOutput"];
            monthsSaved: number;
            totalPaidWithExtra: components["schemas"]["MoneyOutput"];
        };
        /** AmortizationSchedule */
        AmortizationSchedule: {
            installments: components["schemas"]["Installment"][];
            totalInterest: components["schemas"]["MoneyOutput"];
            totalPaid: components["schemas"]["MoneyOutput"];
        };
        /** Installment */
        Installment: {
            number: number;
            dueDate: string;
            payment: components["schemas"]["MoneyOutput"];
            principal: components["schemas"]["MoneyOutput"];
            interest: components["schemas"]["MoneyOutput"];
            balance: components["schemas"]["MoneyOutput"];
        };
        /** ExchangeRate */
        ExchangeRate: {
            /** @enum {string} */
            indicator: "317" | "318";
            value: string;
            publishedAt: string;
        };
        /** LatestExchangeRates */
        LatestExchangeRates: {
            buy: components["schemas"]["ExchangeRate"] | null;
            sell: components["schemas"]["ExchangeRate"] | null;
            stale: boolean;
            checkedAt: string;
        };
        /** Account */
        Account: {
            code: string;
            name: string;
            /** @enum {string} */
            accountClass: "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "COST_OF_REVENUE" | "OPERATING_EXPENSE";
            parentCode: string | null;
            active: boolean;
            sortOrder: number;
        };
        /** ReportNode */
        ReportNode: {
            code: string;
            name: string;
            balance: components["schemas"]["MoneyOutput"];
            level: number;
            children: components["schemas"]["ReportNode"][];
        };
        /** Category */
        Category: {
            id: string;
            name: string;
            /** @enum {string} */
            kind: "EXPENSE" | "INCOME";
            accountCode: string | null;
            sortOrder: number;
            active: boolean;
            colorIndex: number | null;
            postable: boolean;
        };
        /** Movement */
        Movement: {
            id: string;
            date: string;
            /** @enum {string} */
            kind: "EXPENSE" | "INCOME";
            categoryId: string;
            counterparty: string;
            amount: components["schemas"]["MoneyOutput"];
            paymentAccountCode: string | null;
            receiptKey: string | null;
            /** @enum {string} */
            status: "ACTIVE" | "VOIDED";
            version: number;
            posted: boolean;
            journalEntryId: string | null;
        };
        /** CategoryTotal */
        CategoryTotal: {
            categoryId: string;
            total: components["schemas"]["MoneyOutput"];
        };
        /** JournalEntry */
        JournalEntry: {
            id: string;
            date: string;
            description: string;
            reference: string | null;
            sourceMovementId: string | null;
            reversesEntryId: string | null;
            lines: {
                accountCode: string;
                amount: components["schemas"]["MoneyOutput"];
                /** @enum {string} */
                side: "DEBIT" | "CREDIT";
            }[];
        };
        /** GeneralLedger */
        GeneralLedger: {
            openingBalance: components["schemas"]["MoneyOutput"];
            rows: {
                date: string;
                entryId: string;
                description: string;
                debit: components["schemas"]["MoneyOutput"];
                credit: components["schemas"]["MoneyOutput"];
                runningBalance: components["schemas"]["MoneyOutput"];
            }[];
            closingBalance: components["schemas"]["MoneyOutput"];
        };
        /** TrialBalance */
        TrialBalance: {
            rows: {
                accountCode: string;
                accountName: string;
                debits: components["schemas"]["MoneyOutput"];
                credits: components["schemas"]["MoneyOutput"];
                balance: components["schemas"]["MoneyOutput"];
            }[];
            totalDebits: components["schemas"]["MoneyOutput"];
            totalCredits: components["schemas"]["MoneyOutput"];
            difference: components["schemas"]["MoneyOutput"];
            balances: boolean;
        };
        /** FinancialPosition */
        FinancialPosition: {
            assets: components["schemas"]["MoneyOutput"];
            liabilities: components["schemas"]["MoneyOutput"];
            equity: components["schemas"]["MoneyOutput"];
            periodResult: components["schemas"]["MoneyOutput"];
            balances: boolean;
            sections: {
                assets: components["schemas"]["ReportNode"][];
                liabilities: components["schemas"]["ReportNode"][];
                equity: components["schemas"]["ReportNode"][];
            };
        };
        /** NetWorth */
        NetWorth: {
            at: string;
            currency: string;
            assets: components["schemas"]["MoneyOutput"];
            liabilities: components["schemas"]["MoneyOutput"];
            equity: components["schemas"]["MoneyOutput"];
            netWorth: components["schemas"]["MoneyOutput"];
            exchangeDifference: components["schemas"]["MoneyOutput"];
            balances: boolean;
            byCurrency: {
                currency: string;
                rate: string;
                netWorthNative: components["schemas"]["MoneyOutput"];
                netWorthTranslated: components["schemas"]["MoneyOutput"];
            }[];
        };
        /** IncomeStatement */
        IncomeStatement: {
            income: components["schemas"]["MoneyOutput"];
            costOfRevenue: components["schemas"]["MoneyOutput"];
            operatingExpenses: components["schemas"]["MoneyOutput"];
            result: components["schemas"]["MoneyOutput"];
            sections: {
                income: components["schemas"]["ReportNode"][];
                costOfRevenue: components["schemas"]["ReportNode"][];
                operatingExpenses: components["schemas"]["ReportNode"][];
            };
        };
        /** PeriodSummary */
        PeriodSummary: {
            period: string;
            /** @enum {string} */
            status: "OPEN" | "CLOSED";
            entryCount: number;
            unpostedMovementCount: number;
            trialBalanceBalances: boolean;
            blockers: {
                code: string;
                reason: string;
            }[];
        };
        /** AccountingPeriod */
        AccountingPeriod: {
            period: string;
            /** @enum {string} */
            status: "OPEN" | "CLOSED";
            closedAt: string | null;
        };
        /** ReopenedPeriods */
        ReopenedPeriods: {
            reopened: components["schemas"]["AccountingPeriod"][];
        };
        /** BudgetEvaluation */
        BudgetEvaluation: {
            modelId: string;
            modelName: string;
            period: string;
            income: components["schemas"]["MoneyOutput"];
            incomeDeclared: boolean;
            totalConsumed: components["schemas"]["MoneyOutput"];
            surplus: components["schemas"]["MoneyOutput"];
            buckets: {
                bucketId: string;
                name: string;
                allocated: components["schemas"]["MoneyOutput"];
                consumed: components["schemas"]["MoneyOutput"];
                deviation: components["schemas"]["MoneyOutput"];
                /** @enum {string} */
                status: "UNDER" | "ON_TRACK" | "OVER";
            }[];
        };
        /** MonthlyIncome */
        MonthlyIncome: {
            period: string;
            amount: components["schemas"]["MoneyOutput"];
        };
        /** BudgetModelResponse */
        BudgetModelResponse: {
            id: string;
            name: string;
            active: boolean;
            buckets: {
                id: string;
                name: string;
                percentage: string;
                isSavings: boolean;
                accountCodes: string[];
                colorIndex: number | null;
            }[];
        };
        /** Goal */
        Goal: {
            id: string;
            name: string;
            target: components["schemas"]["MoneyOutput"];
            desiredDate: string;
            priority: number;
            accountCode: string | null;
            active: boolean;
            contributed: components["schemas"]["MoneyOutput"];
            remaining: components["schemas"]["MoneyOutput"];
            progress: string;
            reached: boolean;
            requiredMonthlyContribution: components["schemas"]["MoneyOutput"];
            observedMonthlyPace: components["schemas"]["MoneyOutput"] | null;
            projectedDate: string | null;
            onTrack: boolean;
            contributions: {
                id: string;
                date: string;
                amount: components["schemas"]["MoneyOutput"];
            }[];
        };
        /** Investment */
        Investment: {
            id: string;
            name: string;
            principal: components["schemas"]["MoneyOutput"];
            annualRate: string;
            /** @enum {string} */
            compounding: "MONTHLY" | "ANNUAL";
            openedAt: string;
            /** @enum {string} */
            kind: "FIXED_TERM" | "OPEN";
            maturesAt: string | null;
            accountCode: string | null;
            invested: components["schemas"]["MoneyOutput"];
            value: components["schemas"]["MoneyOutput"];
            interestEarned: components["schemas"]["MoneyOutput"];
            matured: boolean;
            contributions: {
                id: string;
                date: string;
                amount: components["schemas"]["MoneyOutput"];
            }[];
        };
        /** BankAccount */
        BankAccount: {
            id: string;
            name: string;
            accountCode: string;
            /** @enum {string} */
            currency: "CRC" | "USD";
            profileId: string | null;
            active: boolean;
        };
        /** ImportProfile */
        ImportProfile: {
            name: string;
            delimiter: string;
            /** @enum {string} */
            encoding: "utf-8" | "latin1";
            /** @default 1 */
            headerRows: number;
            dateColumn: number;
            /** @enum {string} */
            dateFormat: "DD/MM/YYYY" | "YYYY-MM-DD";
            descriptionColumn: number;
            /** @default null */
            referenceColumn: number | null;
            /** @default null */
            amountColumn: number | null;
            /** @default null */
            debitColumn: number | null;
            /** @default null */
            creditColumn: number | null;
            /** @enum {string} */
            decimalSeparator: "." | ",";
            /** @default null */
            thousandsSeparator: string | null;
            id: string;
        };
        /** ImportResult */
        ImportResult: {
            statementId: string;
            fileName: string;
            imported: number;
            duplicated: number;
        };
        /** ParsedBankLine */
        ParsedBankLine: {
            date: string;
            description: string;
            reference: string | null;
            amount: components["schemas"]["MoneyOutput"];
        };
        /** Reconciliation */
        Reconciliation: {
            bankAccountId: string;
            ledgerMovement: components["schemas"]["MoneyOutput"];
            statementMovement: components["schemas"]["MoneyOutput"];
            difference: components["schemas"]["MoneyOutput"];
            lines: components["schemas"]["BankLine"][];
            pendingTotal: components["schemas"]["MoneyOutput"];
            resolved: components["schemas"]["BankLine"][];
            suggestions: components["schemas"]["MatchSuggestion"][];
            pagination: {
                page: number;
                pageSize: number;
                totalItems: number;
                totalPages: number;
            };
        };
        /** BankLine */
        BankLine: {
            id: string;
            date: string;
            description: string;
            reference: string | null;
            amount: components["schemas"]["MoneyOutput"];
            /** @enum {string} */
            status: "PENDING" | "MATCHED" | "IGNORED";
            movementId: string | null;
        };
        /** MatchSuggestion */
        MatchSuggestion: {
            lineId: string;
            movementId: string;
            score: number;
            /** @enum {string} */
            reason: "EXACT" | "NEAR_DATE" | "REFERENCE";
            ambiguous: boolean;
        };
        /** EntradaDeRastro */
        EntradaDeRastro: {
            id: string;
            autor: {
                id: string;
                nombre: string;
            } | null;
            entity: string;
            entityId: string;
            action: string;
            changes: components["schemas"]["CambioDeRastro"][];
            createdAt: string;
        };
        /** CambioDeRastro */
        CambioDeRastro: {
            campo: string;
            antes: unknown;
            despues: unknown;
        };
        /** EnlaceDeInvitacionAlLibro */
        EnlaceDeInvitacionAlLibro: {
            token: string;
        };
        /** LibroPropio */
        LibroPropio: {
            id: string;
            name: string;
            role: string;
            createdAt: string;
        };
        /** Vaciado */
        Vaciado: {
            borrado: {
                [key: string]: number;
            };
            total: number;
        };
        /** SoyAdmin */
        SoyAdmin: {
            admin: boolean;
        };
        /** InvitacionALaAppConEnlace */
        InvitacionALaAppConEnlace: {
            id: string;
            email: string;
            expiresAt: string;
            token: string;
        };
        /** InvitacionALaApp */
        InvitacionALaApp: {
            id: string;
            email: string;
            expiresAt: string;
        };
        /** EnlaceDeInvitacion */
        EnlaceDeInvitacion: {
            token: string;
        };
        /** ResumenDeInstancia */
        ResumenDeInstancia: {
            usuarios: number;
        };
        /** Money */
        MoneyOutput: {
            minorUnits: string;
            /** @enum {string} */
            currency: "CRC" | "USD";
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export type operations = Record<string, never>;
