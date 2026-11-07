// The Review module on `test-support` fakes, for the module's own tests (U47 Steps 32-34). Reached
// by path as `fakes-test-support.ts` does. The review fake and the identity store are enlisted in
// the unit of work, so a refused publish rolls back the persona, the review rows and any doctor or
// term the scripted seams wrote. Every account, doctor and term is synthetic.
import {
  ListExperienceCardsInput,
  err,
  ok,
  type Actor,
  type AccountStatus,
  type CursorPage,
  type DraftPayloadInput,
  type ErrorCode,
  type ExperienceCardVM,
  type Result,
} from '@rogikotha/contracts';

import { aDraftPayload, type DraftVariant } from '../../../../test-support/src/builders/review.js';
import {
  FakeReviewModuleRepository,
  type FakeModuleDoctor,
  type FakeModuleTerm,
} from '../../../../test-support/src/fakes/review-repository.js';
import type { Command, CommandCall } from '../../command';
import { anAccountActor, makeCommandPorts, makeIdentityPorts } from '../../fakes-test-support';
import type { AuditActor, Tx } from '../../ports';
import type { AddMemberDoctorResult, MemberDoctorCaller } from '../directory';
import { createIdentityModule } from '../identity';
import type { ProvisionalTermRequest, ProvisionalTermResult } from '../taxonomy';
import { createReviewModule } from './module';
import type { ReviewDirectorySeams, ReviewTaxonomySeams } from './ports';

export { aDraftPayload, FakeReviewModuleRepository };
export { anAccountActor, anAnonymousActor } from '../../fakes-test-support';

export const TX = {} as Tx;

/** `directory.addMemberDoctor` as a script: it lists the doctor in the review fake, or fails. */
export class ScriptedDirectory implements ReviewDirectorySeams {
  readonly calls: { raw: unknown; caller: MemberDoctorCaller }[] = [];
  /** Set to make the next calls fail; the doctor row is written first, so a rollback shows. */
  failWith: { code: ErrorCode; fieldErrors?: Record<string, string> } | null = null;

  constructor(private readonly reviews: FakeReviewModuleRepository) {}

  addMemberDoctor(
    _tx: Tx,
    raw: unknown,
    caller: MemberDoctorCaller,
  ): Promise<Result<AddMemberDoctorResult>> {
    this.calls.push({ raw, caller });
    const name = (raw as { name?: string }).name ?? 'Dr. Synthetic Member';
    const doctor = this.reviews.addDoctor({
      nameEn: name,
      nameBn: name,
      memberAddedNotConfirmed: true,
    });
    if (this.failWith) {
      return Promise.resolve(
        err(this.failWith.code, {
          correlationId: caller.correlationId,
          ...(this.failWith.fieldErrors ? { fieldErrors: this.failWith.fieldErrors } : {}),
        }),
      );
    }
    return Promise.resolve(ok({ doctorId: doctor.id, reused: false }));
  }
}

/** `taxonomy.ensureProvisionalTerm` as a script: a provisional term in the review fake, or fails. */
export class ScriptedTaxonomy implements ReviewTaxonomySeams {
  readonly calls: { request: ProvisionalTermRequest; actor: AuditActor }[] = [];
  /** Fails from this call number on (1-based); the term row is written first. */
  failFromCall: number | null = null;

  constructor(private readonly reviews: FakeReviewModuleRepository) {}

  ensureProvisionalTerm(
    _tx: Tx,
    request: ProvisionalTermRequest,
    actor: AuditActor,
    correlationId: string,
  ): Promise<Result<ProvisionalTermResult>> {
    this.calls.push({ request, actor });
    const term = this.reviews.addTerm({
      kind: request.kind,
      nameEn: request.text,
      nameBn: request.text,
      provisional: true,
    });
    if (this.failFromCall !== null && this.calls.length >= this.failFromCall) {
      return Promise.resolve(err('conflict', { correlationId }));
    }
    return Promise.resolve(ok({ termId: term.id, created: true }));
  }
}

/**
 * U46's card query over the review fake: eligible reviews filtered by doctor, condition, personas
 * and the excluded public id, newest first. Requests are recorded; `failing` answers `internal`.
 */
export class FakeCards implements Command<ListExperienceCardsInput, CursorPage<ExperienceCardVM>> {
  readonly name = 'review.listExperienceCards';
  readonly kind = 'query' as const;
  readonly input = ListExperienceCardsInput;
  readonly requests: ListExperienceCardsInput[] = [];
  failing = false;

  constructor(private readonly reviews: FakeReviewModuleRepository) {}

  async execute(raw: unknown, call: CommandCall): Promise<Result<CursorPage<ExperienceCardVM>>> {
    const request = ListExperienceCardsInput.parse(raw);
    this.requests.push(request);
    if (this.failing) return err('internal', { correlationId: call.actor.correlationId });
    const personas = request.personaIds ? new Set(request.personaIds) : null;
    const items: ExperienceCardVM[] = [];
    for (const review of [...this.reviews.reviews].reverse()) {
      if (!(await this.reviews.isEligible(TX, review.id))) continue;
      const doctor = this.reviews.doctors.find((d) => d.id === review.doctorId)!;
      if (request.excludePublicId === review.publicId) continue;
      if (request.doctorPublicId !== undefined && doctor.publicId !== request.doctorPublicId) {
        continue;
      }
      if (personas && !personas.has(review.authorPersonaId)) continue;
      if (request.conditionPublicId !== undefined) {
        const termIds = this.reviews.tags
          .filter((t) => t.reviewId === review.id && t.group === 'condition')
          .map((t) => t.termId);
        const publicIds = this.reviews.terms
          .filter((t) => termIds.includes(t.id))
          .map((t) => t.publicId);
        if (!publicIds.includes(request.conditionPublicId)) continue;
      }
      items.push({
        publicId: review.publicId,
        title: review.title,
        excerpt: review.body ?? '',
        truncated: false,
        documentsCount: 0,
        author: { personaKind: review.identityMode },
        relationship: review.relationship,
        period: { year: review.periodYear, month: review.periodMonth },
        doctor: { publicId: doctor.publicId, name: doctor.nameEn },
      });
    }
    return ok({ items: items.slice(0, request.limit ?? 20) });
  }
}

/** One account with its two default personas, as account creation leaves it. */
export interface Member {
  accountId: string;
  username: string;
  displayName: string;
  actor: Actor;
  call: CommandCall;
  namedPersonaId: string;
  pseudonymousPersonaId: string;
}

export function makeReviewModuleWorld() {
  const world = makeCommandPorts();
  const reviews = new FakeReviewModuleRepository();
  const identity = makeIdentityPorts({ accounts: world.fakes.accounts });
  world.fakes.unitOfWork.enlist(reviews);
  world.fakes.unitOfWork.enlist(identity.store);
  const identityModule = createIdentityModule(identity.ports);
  const directory = new ScriptedDirectory(reviews);
  const taxonomy = new ScriptedTaxonomy(reviews);
  const cards = new FakeCards(reviews);
  const review = createReviewModule({
    reviews,
    identity: identityModule,
    ownership: identityModule.ownership,
    directory,
    taxonomy,
    cards,
  });

  const doctor: FakeModuleDoctor = reviews.addDoctor();
  const condition: FakeModuleTerm = reviews.addTerm();
  const branch = reviews.addBranch();

  async function member(
    spec: { status?: AccountStatus; displayName?: string; username?: string } = {},
  ): Promise<Member> {
    const displayName = spec.displayName ?? 'Shirin Demo';
    const account = await world.addAccount({
      displayName,
      ...(spec.status ? { status: spec.status } : {}),
      ...(spec.username ? { username: spec.username } : {}),
    });
    const ids = await identityModule.createDefaultPersonas(TX, {
      accountId: account.accountId,
      username: account.username,
      displayName,
    });
    const actor = anAccountActor(account);
    return {
      accountId: account.accountId,
      username: account.username,
      displayName,
      actor,
      call: world.callAs(actor),
      namedPersonaId: ids.namedPersonaId,
      pseudonymousPersonaId: ids.pseudonymousPersonaId,
    };
  }

  /** A complete payload for the world's doctor, condition or branch. */
  function payload(
    variant: DraftVariant = 'quick',
    overrides: Partial<DraftPayloadInput> = {},
  ): DraftPayloadInput {
    const base: Partial<DraftPayloadInput> =
      variant === 'facility'
        ? { branchPublicId: branch.publicId }
        : variant === 'quick'
          ? {
              doctorPublicId: doctor.publicId,
              tags: [{ group: 'condition', termPublicId: condition.publicId }],
            }
          : { doctorPublicId: doctor.publicId };
    return aDraftPayload(variant, { ...base, ...overrides });
  }

  /** Saves a draft through the module and returns its id. */
  async function draftOf(m: Member, body: DraftPayloadInput = payload()): Promise<string> {
    const saved = await review.saveDraft.execute({ payload: body }, m.call);
    if (!saved.ok) throw new Error(`saveDraft failed: ${saved.error.code}`);
    return saved.data.draftId;
  }

  /** Saves a draft and publishes it; returns the public id. */
  async function published(
    m: Member,
    identityMode: 'named' | 'pseudonymous' | 'anonymous' = 'pseudonymous',
    body: DraftPayloadInput = payload(),
  ): Promise<string> {
    const draftId = await draftOf(m, body);
    const result = await review.publish.execute(
      { draftId, identityMode, attestation: true },
      m.call,
    );
    if (!result.ok) throw new Error(`publish failed: ${result.error.code}`);
    return result.data.publicId;
  }

  return {
    ...world,
    reviews,
    identity,
    identityModule,
    directory,
    taxonomy,
    cards,
    review,
    doctor,
    condition,
    branch,
    member,
    payload,
    draftOf,
    published,
  };
}

export type ReviewModuleWorld = ReturnType<typeof makeReviewModuleWorld>;

/** Every key at any depth of a value, for the projection scans (BR5.9). */
export function deepKeys(value: unknown, into: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const item of value) deepKeys(item, into);
  } else if (value !== null && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      into.push(key);
      deepKeys(item, into);
    }
  }
  return into;
}

export function expectOk<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`);
  return result.data;
}

export function expectErr<T>(result: Result<T>) {
  if (result.ok) throw new Error('expected an error, got ok');
  return result.error;
}
