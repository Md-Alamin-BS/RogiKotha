import { describe, expect, expectTypeOf, it } from 'vitest';

import { parseInput } from '../parse-input';
import type { PersonaPublicVM } from '../view-models/persona';
import {
  PersonaForInput,
  PUBLIC_PROJECTIONS_MAX,
  PublicProjectionsInput,
  RenameNamedInput,
} from './identity';

const DISPLAY_NAME_KEY = 'errors.auth.displayNameRequired';

function fieldErrorsOf(result: ReturnType<typeof parseInput>): Record<string, string> | undefined {
  return result.ok ? undefined : result.error.fieldErrors;
}

function personaIds(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `persona-${i}`);
}

describe('RenameNamedInput', () => {
  it('trims the display name', () => {
    expect(parseInput(RenameNamedInput, { displayName: '  Shirin Demo  ' })).toEqual({
      ok: true,
      data: { displayName: 'Shirin Demo' },
    });
  });

  it('normalises the display name to NFC', () => {
    const decomposed = 'Café Demo';

    const result = parseInput(RenameNamedInput, { displayName: decomposed });

    expect(result.ok && result.data.displayName).toBe('Café Demo');
  });

  it('accepts a Bengali display name of exactly 60 characters', () => {
    const name = 'ক'.repeat(60);

    expect(parseInput(RenameNamedInput, { displayName: name }).ok).toBe(true);
  });

  it('refuses an empty or blank name with the display-name key', () => {
    for (const displayName of ['', '   ']) {
      const result = parseInput(RenameNamedInput, { displayName });
      expect(result.ok).toBe(false);
      expect(fieldErrorsOf(result)).toEqual({ displayName: DISPLAY_NAME_KEY });
    }
  });

  it('refuses a name of 61 characters with the display-name key', () => {
    const result = parseInput(RenameNamedInput, { displayName: 'a'.repeat(61) });

    expect(fieldErrorsOf(result)).toEqual({ displayName: DISPLAY_NAME_KEY });
  });

  it('refuses a non-string name and an unknown key', () => {
    expect(fieldErrorsOf(parseInput(RenameNamedInput, { displayName: 7 }))).toEqual({
      displayName: DISPLAY_NAME_KEY,
    });
    expect(parseInput(RenameNamedInput, { displayName: 'A', accountId: 'x' }).ok).toBe(false);
  });
});

describe('PublicProjectionsInput', () => {
  it(`accepts up to ${PUBLIC_PROJECTIONS_MAX} persona ids`, () => {
    const ids = personaIds(PUBLIC_PROJECTIONS_MAX);

    expect(parseInput(PublicProjectionsInput, { personaIds: ids })).toEqual({
      ok: true,
      data: { personaIds: ids },
    });
  });

  it('refuses 201 persona ids', () => {
    expect(parseInput(PublicProjectionsInput, { personaIds: personaIds(201) }).ok).toBe(false);
  });
});

describe('PersonaForInput', () => {
  it('takes an account, an optional review and an identity mode', () => {
    expect(parseInput(PersonaForInput, { accountId: 'a1', mode: 'named' }).ok).toBe(true);
    expect(
      parseInput(PersonaForInput, { accountId: 'a1', reviewId: 'r1', mode: 'anonymous' }).ok,
    ).toBe(true);
    expect(parseInput(PersonaForInput, { accountId: 'a1', mode: 'real' }).ok).toBe(false);
  });
});

describe('PersonaPublicVM', () => {
  type AnyKey = PersonaPublicVM extends infer V ? (V extends object ? keyof V : never) : never;

  it('has no id, account or timestamp key on any kind', () => {
    expectTypeOf<Extract<AnyKey, 'id' | 'personaId' | 'accountId' | 'createdAt'>>().toBeNever();
    expectTypeOf<Extract<AnyKey, 'reviewId' | 'email' | 'userId'>>().toBeNever();
  });

  it('has no username on the anonymous kind', () => {
    type Anonymous = Extract<PersonaPublicVM, { kind: 'anonymous' }>;
    expectTypeOf<keyof Anonymous>().toEqualTypeOf<'kind' | 'displayName' | 'avatarHue'>();
  });
});
