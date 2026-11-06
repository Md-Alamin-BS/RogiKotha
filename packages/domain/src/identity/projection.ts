// The public projection of a persona (C4 `publicProjection`, U11 BR1.4, BR1.7, BR2.7). Each kind
// carries exactly its own keys and never an id; an anonymous one never carries a username.
import { isGeneratedAlias } from './alias';
import { ANONYMOUS_AVATAR_HUE, type Persona } from './persona';

export type PersonaProjection =
  | { kind: 'named'; displayName: string; username: string | null; avatarHue: number | null }
  | {
      kind: 'pseudonymous';
      displayName: string;
      username: string | null;
      avatarHue: number | null;
    }
  | { kind: 'anonymous'; displayName: string | null; avatarHue: typeof ANONYMOUS_AVATAR_HUE };

export function publicProjection(persona: Persona): PersonaProjection {
  switch (persona.kind) {
    case 'named':
      return {
        kind: 'named',
        displayName: persona.displayName,
        username: persona.username,
        avatarHue: persona.avatarHue,
      };
    case 'pseudonymous':
      return {
        kind: 'pseudonymous',
        displayName: persona.username ?? persona.displayName,
        username: persona.username,
        avatarHue: persona.avatarHue,
      };
    case 'anonymous':
      return {
        kind: 'anonymous',
        // A legacy seeded "Anonymous" is not an alias; the page shows only its localized byline.
        displayName: isGeneratedAlias(persona.displayName) ? persona.displayName : null,
        avatarHue: ANONYMOUS_AVATAR_HUE,
      };
  }
}
