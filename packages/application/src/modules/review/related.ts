// The related lists of a page through U46's card query (BR5.8, BR7.2). A failed list is logged
// and left empty, so one list never blanks the page.
import type { ExperienceCardVM, ListExperienceCardsInput } from '@rogikotha/contracts';

import type { CommandCall } from '../../command';
import type { ReviewModulePorts } from './ports';

export async function cardsOf(
  deps: ReviewModulePorts,
  call: CommandCall,
  request: ListExperienceCardsInput,
): Promise<ExperienceCardVM[]> {
  const result = await deps.cards.execute(request, call);
  if (result.ok) return result.data.items;
  call.ports.logger.warn('review.related_failed', {
    correlationId: call.actor.correlationId,
    errorCode: result.error.code,
  });
  return [];
}
