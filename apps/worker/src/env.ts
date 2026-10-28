// Worker environment (task step 3). Loads the repo-root `.env` the same
// way `packages/database/src/env.ts` does, then validates with zod.
//
// Hard rule (01-conventions.md §2, AD-6): the worker connects as `rk_worker`
// only. `DATABASE_URL` (the `rk_app` role, which can read `auth_*`,
// `persona_links`, `identity_reveals`) is never read here, even as a
// fallback — only `DATABASE_URL_WORKER` is accepted.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { config } from 'dotenv';
import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');

// quiet: dotenv 17 otherwise prints a banner as the first stdout line, ahead of the JSON log (ISS-203).
config({ path: path.resolve(repoRoot, '.env'), quiet: true });

const EnvSchema = z.object({
  DATABASE_URL_WORKER: z.string().min(1),
  APP_MODE: z.enum(['development', 'demo', 'production']),
  LOG_LEVEL: z.enum(['info', 'warn', 'error']).default('info'),
  STORAGE_ROOT: z.string().default('./.data/storage'),
  CLAMD_HOST: z.string().default('localhost'),
  CLAMD_PORT: z.coerce.number().int().positive().default(3310),
  SMTP_HOST: z.string().default('localhost'),
  SMTP_PORT: z.coerce.number().int().positive().default(1025),
  MAIL_FROM: z.string().default('RogiKotha <no-reply@demo.rogikotha.local>'),
});

export type WorkerEnv = z.infer<typeof EnvSchema>;

/**
 * Parses `process.env` into a validated `WorkerEnv`. On failure it prints a
 * clear message to stderr and exits the process with code 1 — the worker
 * must never start against the wrong role or an unrecognised `APP_MODE`
 * (acceptance check: `DATABASE_URL_WORKER= pnpm dev:worker` exits 1 with
 * "DATABASE_URL_WORKER is required").
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): WorkerEnv {
  if (!source.DATABASE_URL_WORKER) {
    console.error('DATABASE_URL_WORKER is required (the worker never falls back to DATABASE_URL)');
    return process.exit(1);
  }
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const messages = result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ');
    console.error(`worker environment invalid: ${messages}`);
    return process.exit(1);
  }
  return result.data;
}
