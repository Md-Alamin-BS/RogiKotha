import { existsSync } from 'node:fs';
import path from 'node:path';

// `next dev` and `next start` run with apps/web as the working directory, so Next never sees the
// repo-root `.env` that every other package reads; CI sets the variables directly and has no file.
let rootEnvLoaded = false;

function loadRootEnv(): void {
  if (rootEnvLoaded) return;
  rootEnvLoaded = true;
  let dir = process.cwd();
  for (let depth = 0; depth < 4; depth += 1) {
    if (existsSync(path.join(dir, 'pnpm-workspace.yaml'))) {
      const file = path.join(dir, '.env');
      // `loadEnvFile` never overrides a variable that is already set.
      if (existsSync(file)) process.loadEnvFile(file);
      return;
    }
    dir = path.dirname(dir);
  }
}

/** Reads a required server variable, loading the repo-root `.env` first when it is missing. */
export function requireEnv(name: string): string {
  if (!process.env[name]) loadRootEnv();
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set; copy .env.example to the repo root as .env`);
  return value;
}

/** Reads an optional server variable, with the same `.env` fallback as `requireEnv`. */
export function optionalEnv(name: string): string | undefined {
  if (!process.env[name]) loadRootEnv();
  return process.env[name] || undefined;
}
