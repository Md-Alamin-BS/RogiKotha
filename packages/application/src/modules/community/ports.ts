// What the Community module factory receives (U49 functional-spec § 1, C19). Review and Identity
// are reached only through their seams; the request-scoped ports (rate limiter, clock, ids, audit,
// outbox, logger, unit of work) come from `CommandPorts` at call time, so it is not extended.
import type { CommunityRepository } from '../../ports';
import type { IdentityModule, IdentityOwnership } from '../identity';
import type { ReviewSeams } from '../review';

export type CommunityReviewSeams = Pick<
  ReviewSeams,
  'reviewIdForPublicId' | 'isReviewPublished' | 'isReviewAuthor' | 'authorIdentityModeOf'
>;

// ASSUMPTION(U49): `publicProjection` is added to the design's Pick, because `publicProjections`
// drops unknown ids without saying which, so a short batch is resolved one id at a time (BR3.4).
export type CommunityIdentitySeams = Pick<
  IdentityModule,
  'personaFor' | 'publicProjections' | 'publicProjection'
>;

export interface CommunityModulePorts {
  comments: CommunityRepository;
  review: CommunityReviewSeams;
  identity: CommunityIdentitySeams;
  /** `ownPersonaIds` is never used: it would load every persona of the viewer (BR3.5). */
  ownership: Pick<IdentityOwnership, 'ownsPersona'>;
}
