// `review.authorCards` (WF8, BR7.2): the public named and pseudonymous reviews of the personas
// that carry the username, newest first. An unknown username and one without public reviews get
// the same empty answer; anonymous personas have no username, so they never match.
import {
  AuthorCardsInput,
  ok,
  type CursorPage,
  type ExperienceCardVM,
  type Result,
} from '@rogikotha/contracts';

import { defineQuery } from '../../../command';
import { REVIEW_PAGE_SIZE } from '../limits';
import type { ReviewModulePorts } from '../ports';

export interface AuthorCardsOutput {
  /** `displayName` is the newest named display name among the cards, when there is one. */
  header: { username: string; displayName?: string };
  page: CursorPage<ExperienceCardVM>;
}

export function authorCardsQuery(deps: ReviewModulePorts) {
  return defineQuery<AuthorCardsInput, AuthorCardsOutput>({
    name: 'review.authorCards',
    input: AuthorCardsInput,
    requires: {},
    async handle({ input, tx, actor, request, ports }): Promise<Result<AuthorCardsOutput>> {
      const header: AuthorCardsOutput['header'] = { username: input.username };
      const personaIds = await deps.identity.publicPersonaIdsByUsername(tx, {
        username: input.username,
      });
      if (personaIds.length === 0) return ok({ header, page: { items: [] } });
      const page = await deps.cards.execute(
        {
          personaIds,
          limit: REVIEW_PAGE_SIZE,
          ...(input.cursor !== undefined ? { cursor: input.cursor } : {}),
        },
        { actor, request, ports },
      );
      if (!page.ok) return page;
      const named = page.data.items.find((card) => card.author.personaKind === 'named');
      if (named?.author.displayName !== undefined) header.displayName = named.author.displayName;
      return ok({ header, page: page.data });
    },
  });
}
