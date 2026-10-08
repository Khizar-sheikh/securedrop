import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Prisma CLI runs with cwd = backend/, but the single source of environment
// variables for local development lives at the repository root.
config({ path: '../.env' });

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  engine: 'classic',
  datasource: {
    url: process.env.DATABASE_URL ?? '',
  },
});
