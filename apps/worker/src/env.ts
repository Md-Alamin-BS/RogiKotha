// Worker environment (task step 3). Loads the repo-root `.env` the same
// way `packages/database/src/env.ts` does, then validates with zod.
//
// Hard rule (01-conventions.md §2, AD-6): the worker connects as `rk_worker`
// only. `DATABASE_URL` (the `rk_app` role, which can read `auth_*`,
// `persona_links`, `identity_reveals`) is never read here, even as a
// fallback — only `DATABASE_URL_WORKER` is accepted.
//
// FD-095 (T-101 BR6.5): the only key the worker holds is `MAIL_RECIPIENT_KEY`,
// which decrypts `email_deliveries.to_email_enc` and nothing else. The shared
// `.env` also carries the web's secrets, so they are deleted from
// `process.env` right after it loads.
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { config } from 'dotenv';
import { z } from 'zod';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');

/** The web tier's secrets; the worker never holds them (FD-095). */
export const WEB_ONLY_SECRETS = ['APP_ENCRYPTION_KEY', 'BETTER_AUTH_SECRET'] as const;

/** Deletes the web-only secrets from `target`, so no later module of this process can read them. */
export function scrubWebSecrets(target: NodeJS.ProcessEnv): void {
  for (const name of WEB_ONLY_SECRETS) {
    Reflect.deleteProperty(target, name);
  }
}

// quiet: dotenv 17 otherwise prints a banner as the first stdout line, ahead of the JSON log (ISS-203).
config({ path: path.resolve(repoRoot, '.env'), quiet: true });
scrubWebSecrets(process.env);

/**
 * ISS-621 (BR3.3): a relative `STORAGE_ROOT` is taken from the repo root, as the web tier does, not
 * from `apps/worker` where the worker runs; an absolute one is kept as given.
 */
export function resolveStorageRoot(value: string, root: string = repoRoot): string {
  return path.isAbsolute(value) ? value : path.resolve(root, value);
}

export const MAIL_RECIPIENT_KEY_BYTES = 32;
// Standard base64 with its padding: 32 bytes are exactly 44 characters ending in one `=`.
const BASE64_32_BYTES = /^[A-Za-z0-9+/]{43}=$/;

const mailRecipientKey = z
  .string({ error: `is required (${MAIL_RECIPIENT_KEY_BYTES} bytes, base64)` })
  .trim()
  .regex(BASE64_32_BYTES, {
    error: `must be ${MAIL_RECIPIENT_KEY_BYTES} bytes, base64-encoded`,
  })
  .transform((value) => new Uint8Array(Buffer.from(value, 'base64')));

const EnvSchema = z.object({
  DATABASE_URL_WORKER: z.string().min(1),
  APP_MODE: z.enum(['development', 'demo', 'production']),
  LOG_LEVEL: z.enum(['info', 'warn', 'error']).default('info'),
  MAIL_RECIPIENT_KEY: mailRecipientKey,
  STORAGE_ROOT: z
    .string()
    .default('./.data/storage')
    .transform((value) => resolveStorageRoot(value)),
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
 * "DATABASE_URL_WORKER is required"). Messages name variables, never values.
 */
export function loadEnv(source: NodeJS.ProcessEnv = process.env): WorkerEnv {
  if (!source.DATABASE_URL_WORKER) {
    console.error('DATABASE_URL_WORKER is required (the worker never falls back to DATABASE_URL)');
    return process.exit(1);
  }
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    const messages = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    console.error(`worker environment invalid: ${messages}`);
    return process.exit(1);
  }
  return result.data;
}
