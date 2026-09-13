#!/usr/bin/env node
/*
 * Fails loudly (exit 1) on any i18n dictionary defect:
 *   - a key present in one locale file and missing in the other
 *   - an empty string value
 *   - a value identical in both languages, outside the allowlist below
 *   - a {param} placeholder present in one language's value but not the other
 *   - (when packages/contracts/src/errors.ts exists) an ERROR_CODES entry
 *     with no matching errors.<prefix>.<camelName> key
 *   - src/keys.ts out of date with messages/en.json
 *
 * Run: `pnpm --filter @rogikotha/i18n check` (aliased at the repo root as
 * `pnpm i18n:check`).
 */

/* eslint-disable no-undef, no-console --
 * Node CLI script: `console`/`process` are Node globals (the repo's shared
 * eslint.config.mjs does not add a Node globals set for package-level
 * scripts/*.mjs, only for the root-level tools/**, which is ignored
 * entirely — see docs/implementation/ISSUES.md). The no-console
 * warn/error-only restriction does not fit a script whose whole job is to
 * print an audit trail and a pass/fail summary. ASSUMPTION(T-006).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const messagesDir = path.join(__dirname, '../messages');
const enPath = path.join(messagesDir, 'en.json');
const bnPath = path.join(messagesDir, 'bn.json');
const keysPath = path.join(__dirname, '../src/keys.ts');
const contractsErrorsPath = path.join(__dirname, '../../contracts/src/errors.ts');

/*
 * Keys allowed to carry the same value in en and bn: numbers, phone numbers,
 * and Latin proper nouns that are not translated (e.g. a brand name spelled
 * the same both ways, if one is ever added). Currently empty — every ported
 * key has a distinct Bengali value — but the mechanism stays so a future
 * task can add one instead of loosening the check globally.
 */
const IDENTICAL_VALUE_ALLOWLIST = [];

function flatten(obj, prefix = '') {
  /** @type {[string, string][]} */
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    const dotted = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      out.push([dotted, v]);
    } else if (v && typeof v === 'object') {
      out.push(...flatten(v, dotted));
    } else {
      throw new Error(`unexpected value at ${dotted}: ${JSON.stringify(v)}`);
    }
  }
  return out;
}

function extractPlaceholders(value) {
  const matches = value.match(/\{[a-zA-Z0-9_]+\}/g) || [];
  return matches.slice().sort().join(',');
}

function readErrorCodes() {
  if (!fs.existsSync(contractsErrorsPath)) {
    console.log(
      'NOTE: packages/contracts/src/errors.ts does not exist yet (T-003 not run). ' +
        'Skipping the ERROR_CODES <-> errors.* completeness check.',
    );
    return null;
  }
  const src = fs.readFileSync(contractsErrorsPath, 'utf8');
  // Dependency-free: regex the ERROR_CODES array literal rather than
  // importing/compiling the TS module.
  const match = src.match(/ERROR_CODES\s*=\s*\[([\s\S]*?)\]/);
  if (!match) {
    throw new Error(
      'packages/contracts/src/errors.ts exists but no `ERROR_CODES = [...]` array was found',
    );
  }
  const codes = [...match[1].matchAll(/'([a-z_.]+)'/g)].map((m) => m[1]);
  if (codes.length === 0) {
    throw new Error('ERROR_CODES array was found but parsed to zero entries');
  }
  return codes;
}

function errorCodeToMessageKey(code) {
  // 'auth.invalid_credentials' -> 'errors.auth.invalidCredentials'
  // 'forbidden' (no prefix) -> 'errors.common.forbidden'
  const parts = code.split('.');
  const name = parts.length > 1 ? parts.slice(1).join('.') : parts[0];
  const prefix = parts.length > 1 ? parts[0] : 'common';
  const camelName = name.replace(/_([a-z0-9])/g, (_, c) => c.toUpperCase());
  return `errors.${prefix}.${camelName}`;
}

function main() {
  const problems = [];

  const en = JSON.parse(fs.readFileSync(enPath, 'utf8'));
  const bn = JSON.parse(fs.readFileSync(bnPath, 'utf8'));
  const enFlat = new Map(flatten(en));
  const bnFlat = new Map(flatten(bn));

  const allKeys = new Set([...enFlat.keys(), ...bnFlat.keys()]);
  for (const key of [...allKeys].sort()) {
    const hasEn = enFlat.has(key);
    const hasBn = bnFlat.has(key);
    if (!hasEn) {
      problems.push(`missing in en.json: ${key}`);
      continue;
    }
    if (!hasBn) {
      problems.push(`missing in bn.json: ${key}`);
      continue;
    }
    const enValue = enFlat.get(key);
    const bnValue = bnFlat.get(key);
    if (enValue.trim() === '') problems.push(`empty en value: ${key}`);
    if (bnValue.trim() === '') problems.push(`empty bn value: ${key}`);
    if (
      enValue === bnValue &&
      enValue.trim() !== '' &&
      !IDENTICAL_VALUE_ALLOWLIST.includes(key)
    ) {
      problems.push(`identical en/bn value (not allowlisted): ${key} = "${enValue}"`);
    }
    const enPlaceholders = extractPlaceholders(enValue);
    const bnPlaceholders = extractPlaceholders(bnValue);
    if (enPlaceholders !== bnPlaceholders) {
      problems.push(
        `placeholder mismatch: ${key} — en has [${enPlaceholders}], bn has [${bnPlaceholders}]`,
      );
    }
  }

  const errorCodes = readErrorCodes();
  if (errorCodes) {
    const expectedKeys = new Set(errorCodes.map(errorCodeToMessageKey));
    for (const code of errorCodes) {
      const messageKey = errorCodeToMessageKey(code);
      if (!enFlat.has(messageKey)) {
        problems.push(`ERROR_CODES entry "${code}" has no i18n key ${messageKey}`);
      }
    }
    // Reverse direction (CR-002 / ISS-078): an errors.* key with no code
    // behind it is exactly as much of a defect as a code with no key — the
    // forward loop above only ever walked codes to keys, so a dictionary key
    // ported ahead of its ErrorCode (as errors.auth.accountSuspended was)
    // went undetected until a validator's manual cross-check found it.
    for (const key of enFlat.keys()) {
      if (key.startsWith('errors.') && !expectedKeys.has(key)) {
        problems.push(`i18n key "${key}" has no ERROR_CODES entry`);
      }
    }
  }

  if (fs.existsSync(keysPath)) {
    const keysSrc = fs.readFileSync(keysPath, 'utf8');
    const declaredKeys = [...keysSrc.matchAll(/'([^']+)'/g)].map((m) => m[1]);
    const expectedKeys = [...enFlat.keys()].sort();
    const declaredSorted = [...new Set(declaredKeys)].sort();
    const missingFromGenerated = expectedKeys.filter((k) => !declaredSorted.includes(k));
    const extraInGenerated = declaredSorted.filter((k) => !expectedKeys.includes(k));
    if (missingFromGenerated.length || extraInGenerated.length) {
      problems.push(
        `src/keys.ts is out of date with messages/en.json — run \`pnpm --filter @rogikotha/i18n keys\`. ` +
          `Missing: [${missingFromGenerated.join(', ')}]. Extra: [${extraInGenerated.join(', ')}].`,
      );
    }
  } else {
    problems.push('src/keys.ts does not exist — run `pnpm --filter @rogikotha/i18n keys`');
  }

  if (problems.length > 0) {
    console.error(`i18n parity check FAILED with ${problems.length} problem(s):`);
    for (const p of problems) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }

  console.log(
    `i18n parity check passed: ${enFlat.size} keys, both locales, no placeholder or ` +
      `ERROR_CODES mismatches.`,
  );
}

main();
