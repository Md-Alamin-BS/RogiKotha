import { describe, expect, it } from 'vitest';

import { PERSONA_KINDS, type Persona, type PersonaKind } from './persona';
import { publicProjection } from './projection';

const DENYLIST = [
  'id',
  'personaId',
  'accountId',
  'account_id',
  'email',
  'reviewId',
  'review_id',
  'createdAt',
  'userId',
  'authUserId',
];

const KEYS_BY_KIND: Record<PersonaKind, string[]> = {
  named: ['avatarHue', 'displayName', 'kind', 'username'],
  pseudonymous: ['avatarHue', 'displayName', 'kind', 'username'],
  anonymous: ['avatarHue', 'displayName', 'kind'],
};

function aPersona(overrides: Partial<Persona> = {}): Persona {
  return {
    id: '00000000-0000-7000-8000-000000000001',
    kind: 'named',
    displayName: 'Shirin Demo',
    username: 'shirin_88',
    avatarHue: null,
    ...overrides,
  };
}

/** A small seeded generator, so the property run is the same on every machine. */
function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

function generatedPersonas(count: number): Persona[] {
  const random = seededRandom(20261104);
  const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)]!;
  const names = ['Shirin Demo', 'Anonymous', 'patient-ab23', 'রহিম ডেমো', '', 'shirin_88'];
  return Array.from({ length: count }, (_, i) =>
    aPersona({
      id: `00000000-0000-7000-8000-${i.toString(16).padStart(12, '0')}`,
      kind: pick(PERSONA_KINDS),
      displayName: pick(names),
      username: pick([null, 'shirin_88', 'patient-ab23']),
      avatarHue: pick([null, 0, 120, 359]),
    }),
  );
}

describe('publicProjection', () => {
  it('projects a named persona with its display name, username and hue', () => {
    expect(publicProjection(aPersona({ avatarHue: 120 }))).toEqual({
      kind: 'named',
      displayName: 'Shirin Demo',
      username: 'shirin_88',
      avatarHue: 120,
    });
  });

  it('projects a pseudonymous persona with the username as its display name', () => {
    const persona = aPersona({ kind: 'pseudonymous', displayName: 'old name' });

    expect(publicProjection(persona)).toEqual({
      kind: 'pseudonymous',
      displayName: 'shirin_88',
      username: 'shirin_88',
      avatarHue: null,
    });
  });

  it('projects an anonymous persona with its alias, hue 0 and no username', () => {
    const persona = aPersona({
      kind: 'anonymous',
      displayName: 'patient-k7m2',
      username: 'shirin_88',
      avatarHue: 200,
    });

    expect(publicProjection(persona)).toEqual({
      kind: 'anonymous',
      displayName: 'patient-k7m2',
      avatarHue: 0,
    });
  });

  it('projects the legacy seeded "Anonymous" with no display name', () => {
    const persona = aPersona({ kind: 'anonymous', displayName: 'Anonymous', username: null });

    expect(publicProjection(persona)).toEqual({
      kind: 'anonymous',
      displayName: null,
      avatarHue: 0,
    });
  });

  it('gives each of 1 000 generated personas exactly its kind keys and no denylisted key', () => {
    for (const persona of generatedPersonas(1000)) {
      const projection = publicProjection(persona);
      const keys = Object.keys(projection).sort();

      expect(keys).toEqual(KEYS_BY_KIND[persona.kind]);
      expect(keys.filter((key) => DENYLIST.includes(key))).toEqual([]);
      expect(JSON.stringify(projection)).not.toContain(persona.id);
      if (projection.kind === 'anonymous') {
        expect(projection.avatarHue).toBe(0);
        expect(JSON.stringify(projection)).not.toContain('shirin_88');
      }
    }
  });

  it('covers every persona kind in the property run', () => {
    const kinds = new Set(generatedPersonas(1000).map((p) => p.kind));

    expect([...kinds].sort()).toEqual([...PERSONA_KINDS].sort());
  });
});
