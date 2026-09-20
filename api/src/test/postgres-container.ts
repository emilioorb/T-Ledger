import { execSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql'

export interface RunningPostgres {
  url: string
  stop: () => Promise<void>
}

export const startPostgres = async (): Promise<RunningPostgres> => {
  const container: StartedPostgreSqlContainer = await new PostgreSqlContainer(
    'postgres:18-alpine',
  ).start()
  const url = container.getConnectionUri()

  execSync('npx prisma migrate deploy', {
    // fileURLToPath y no URL.pathname: en Windows este último devuelve "/C:/..." y no es un cwd válido.
    cwd: fileURLToPath(new URL('../..', import.meta.url)),
    env: { ...process.env, DATABASE_URL: url },
    stdio: 'inherit',
  })

  return {
    url,
    stop: async () => {
      await container.stop()
    },
  }
}
