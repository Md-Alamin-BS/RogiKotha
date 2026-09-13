import { defineConfig } from 'drizzle-kit';

import './src/env.js';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './src/migrations',
  casing: 'snake_case',
  migrations: { table: 'drizzle_migrations' },
  dbCredentials: { url: process.env.DATABASE_URL! },
});
