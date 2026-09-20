import path from 'node:path'
import { config } from 'dotenv'
import { defineConfig } from 'prisma/config'

// El `.env` vive en la raíz del repositorio, no dentro de `api/`: dotenv solo mira el cwd.
config({ path: path.join(import.meta.dirname, '..', '.env') })

export default defineConfig({
  earlyAccess: true,
  schema: path.join(import.meta.dirname, 'prisma', 'schema.prisma'),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
})
