// FX18 (violation): the worker may not require pg either; ESM gets `require` from createRequire
// (BR1.4, BR3.6).
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const pg: unknown = require('pg');
