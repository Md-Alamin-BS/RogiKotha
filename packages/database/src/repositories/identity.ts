// Stubs only (task step 15). Method names from the identity command
// catalogue (03-routes-and-contracts.md §4, module `identity`, T-104).
import { NotImplemented } from './not-implemented.js';

export class PgIdentityRepository {
  createPersona(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-104', { input });
  }

  linkPersona(personaId: string, accountId: string, reviewId?: string): Promise<unknown> {
    throw new NotImplemented('T-104', { personaId, accountId, reviewId });
  }

  findPersonaFor(accountId: string, reviewId: string | undefined, mode: string): Promise<unknown> {
    throw new NotImplemented('T-104', { accountId, reviewId, mode });
  }

  publicProjection(personaId: string): Promise<unknown> {
    throw new NotImplemented('T-104', { personaId });
  }

  recordReveal(input: Record<string, unknown>): Promise<unknown> {
    throw new NotImplemented('T-104', { input });
  }
}
