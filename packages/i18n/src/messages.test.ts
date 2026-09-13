import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { MESSAGE_KEYS } from './keys';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const en: unknown = JSON.parse(fs.readFileSync(path.join(__dirname, '../messages/en.json'), 'utf8'));
const bn: unknown = JSON.parse(fs.readFileSync(path.join(__dirname, '../messages/bn.json'), 'utf8'));
const contractsErrorsPath = path.join(__dirname, '../../contracts/src/errors.ts');

function flatten(obj: unknown, prefix = ''): [string, string][] {
  const out: [string, string][] = [];
  for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
    const dotted = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'string') {
      out.push([dotted, v]);
    } else {
      out.push(...flatten(v, dotted));
    }
  }
  return out;
}

function placeholders(value: string): string {
  return (value.match(/\{[a-zA-Z0-9_]+\}/g) ?? []).slice().sort().join(',');
}

describe('i18n message dictionaries', () => {
  const enFlat = new Map(flatten(en));
  const bnFlat = new Map(flatten(bn));

  it('every key in en exists in bn and vice versa', () => {
    const enKeys = [...enFlat.keys()].sort();
    const bnKeys = [...bnFlat.keys()].sort();
    expect(enKeys).toEqual(bnKeys);
    expect(enKeys.length).toBeGreaterThan(0);
  });

  it('no placeholder differs between locales', () => {
    const mismatches: string[] = [];
    for (const [key, enValue] of enFlat) {
      const bnValue = bnFlat.get(key);
      if (bnValue === undefined) continue;
      if (placeholders(enValue) !== placeholders(bnValue)) mismatches.push(key);
    }
    expect(mismatches).toEqual([]);
  });

  it('no empty string value in either locale', () => {
    const empties = [...enFlat.entries(), ...bnFlat.entries()].filter(
      ([, v]) => v.trim() === '',
    );
    expect(empties).toEqual([]);
  });

  it('every ERROR_CODE has an errors.* message', () => {
    if (!fs.existsSync(contractsErrorsPath)) {
      // T-003 (packages/contracts) has not landed in this workspace yet.
      // T-006 depends only on T-001, so this is expected — see
      // docs/implementation/handoffs/T-006.md.
      return;
    }
    const src = fs.readFileSync(contractsErrorsPath, 'utf8');
    const match = src.match(/ERROR_CODES\s*=\s*\[([\s\S]*?)\]/);
    expect(match).not.toBeNull();
    const codeMatches = (match as RegExpMatchArray)[1] ?? '';
    const codes = [...codeMatches.matchAll(/'([a-z_.]+)'/g)]
      .map((m) => m[1])
      .filter((code): code is string => Boolean(code));
    expect(codes.length).toBeGreaterThan(0);
    for (const code of codes) {
      const parts = code.split('.');
      const name = parts.length > 1 ? parts.slice(1).join('.') : (parts[0] ?? code);
      const prefix = parts.length > 1 ? (parts[0] ?? 'common') : 'common';
      const camelName = name.replace(/_([a-z0-9])/g, (_match, c: string) => c.toUpperCase());
      const messageKey = `errors.${prefix}.${camelName}`;
      expect(enFlat.has(messageKey), `missing ${messageKey} for code ${code}`).toBe(true);
    }
  });

  it('keys.ts is in sync with en.json', () => {
    const expectedKeys = [...enFlat.keys()].sort();
    const declaredKeys = [...MESSAGE_KEYS].sort();
    expect(declaredKeys).toEqual(expectedKeys);
  });
});
