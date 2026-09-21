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
        /** Devuelve la tabla de amortización completa */
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
                        "application/json": components["schemas"]["AmortizationSchedule"];
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
        };
        /** SimulateExtraPaymentInput */
        SimulateExtraPaymentInput: {
            amount: components["schemas"]["Money"];
            afterInstallment: number;
            /** @enum {string} */
            mode: "REDUCE_TERM" | "REDUCE_PAYMENT";
        };
        /** Debt */
        Debt: {
            id: string;
            name: string;
            counterparty: string;
            principal: components["schemas"]["MoneyOutput"];
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
        /** ExtraPaymentProjection */
        ExtraPaymentProjection: {
            baseline: components["schemas"]["AmortizationSchedule"];
            withExtraPayment: components["schemas"]["AmortizationSchedule"];
            extraPayment: components["schemas"]["MoneyOutput"];
            interestSaved: components["schemas"]["MoneyOutput"];
            monthsSaved: number;
            totalPaidWithExtra: components["schemas"]["MoneyOutput"];
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
