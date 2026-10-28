// Loads the repo-root `.env` before anything reads `process.env`. Resolved
// via `fileURLToPath` + `path.resolve`, never string concatenation, because
// plain string paths break on Windows (backslashes, drive letters).
import { fileURLToPath } from 'node:url';
import path from 'node:path';

import { config } from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..', '..');

// quiet: dotenv 17 otherwise prints a banner to stdout (ISS-203).
config({ path: path.resolve(repoRoot, '.env'), quiet: true });
