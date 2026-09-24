import { defineRailway, github, postgres, preserve, project, service, volume } from "railway/iac";

export default defineRailway(() => {
  const Postgres = postgres("Postgres", { region: "us-east4-eqdc4a" });
  Postgres.networking = { privateNetworkEndpoint: "postgres" };
  const postgresVolume = volume("postgres-volume", { alerts: { usage: { "100": {}, "80": {}, "95": {} } }, allowOnlineResize: true, region: "us-east4-eqdc4a", sizeMB: 5000 });
  const api = service("api", {
    source: github("emilioorb/T-Ledger", { branch: "main", rootDirectory: "api" }),
    // El cliente de Prisma no está en git: se genera antes de compilar.
    build: "npx prisma generate && npm run build",
    // IaC no tiene pre-deploy: las migraciones corren al arrancar. Con una réplica alcanza.
    start: "npm run start:prod",
    healthcheck: "/api/v1/openapi.json",
    replicas: { "us-east4-eqdc4a": 1 },
    env: { ADMIN_USER_IDS: preserve(), AUTH_BASE_URL: preserve(), AUTH_SECRET: preserve(), BCCR_API_URL: preserve(), BCCR_EMAIL: preserve(), BCCR_TOKEN: preserve(), CORS_ORIGIN: preserve(), DATABASE_URL: preserve(), NODE_ENV: preserve(), R2_ACCESS_KEY_ID: preserve(), R2_ACCOUNT_ID: preserve(), R2_BUCKET: preserve(), R2_SECRET_ACCESS_KEY: preserve(), SENTRY_ENVIRONMENT: preserve() },
  });

  return project("T-Ledger", {
    resources: [api, Postgres, postgresVolume],
  });
});
