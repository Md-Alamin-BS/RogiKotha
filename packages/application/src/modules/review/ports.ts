// What the Review module factory receives (U47 ENT-012, C19). Identity, Directory and Taxonomy are
// reached only through these seams; the module never imports another module's repository. The
// request-scoped ports (crypto, clock, ids, rate limiter, config, audit, outbox, logger, unit of
// work) come from `CommandPorts` at call time, so `CommandPorts` is not extended.
import type {
  CursorPage,
  ExperienceCardVM,
  ListExperienceCardsInput,
  Result,
} from '@rogikotha/contracts';

import type { Command } from '../../command';
import type { AuditActor, ReviewModuleRepository, Tx } from '../../ports';
import type { AddMemberDoctorResult, MemberDoctorCaller } from '../directory';
import type { IdentityModule, IdentityOwnership } from '../identity';
import type { ProvisionalTermRequest, ProvisionalTermResult } from '../taxonomy';

export type ReviewIdentitySeams = Pick<
  IdentityModule,
  'personaFor' | 'publicProjection' | 'publicProjections' | 'publicPersonaIdsByUsername'
>;

export interface ReviewDirectorySeams {
  /** U46's `directory.addMemberDoctor`, on the publish transaction (BR4.3). */
  addMemberDoctor(
    tx: Tx,
    raw: unknown,
    caller: MemberDoctorCaller,
  ): Promise<Result<AddMemberDoctorResult>>;
}

export interface ReviewTaxonomySeams {
  /** U46's `taxonomy.ensureProvisionalTerm`, on the publish transaction (BR4.3). */
  ensureProvisionalTerm(
    tx: Tx,
    request: ProvisionalTermRequest,
    actor: AuditActor,
    correlationId: string,
  ): Promise<Result<ProvisionalTermResult>>;
}

export interface ReviewModulePorts {
  reviews: ReviewModuleRepository;
  identity: ReviewIdentitySeams;
  /** For the ownership checks and the actor's own lists only (BR1.5, BR6.2). */
  ownership: IdentityOwnership;
  directory: ReviewDirectorySeams;
  taxonomy: ReviewTaxonomySeams;
  /** U46's `review.listExperienceCards` query, with U47's `personaIds` and `excludePublicId`. */
  cards: Command<ListExperienceCardsInput, CursorPage<ExperienceCardVM>>;
}
