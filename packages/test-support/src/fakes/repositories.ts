// In-memory repository fakes for every repository port in
// 03-routes-and-contracts.md §3, with the method names mirroring the
// `packages/database/src/repositories/*.ts` stubs (T-004/T-005) per
// 01-conventions.md §1 ("test-support's fakes should mirror the same
// method names where practical" — T-005 handoff). `application`'s port
// interfaces do not exist yet (they are empty placeholders until T-101
// onward), so these classes have no `implements <Port>` clause — same
// precedent as the Pg* stubs themselves.
//
// Behaviour: plain `Map<string, Record<string, unknown>>` per entity kind,
// enough for application-layer unit tests (assert a command read/wrote the
// right shape) — not a rules engine. A command's actual business rules
// belong in `packages/domain`/`packages/application` once those tasks land.
import { seqId } from '../builders/seq.js';

type Row = Record<string, unknown>;

class MapStore<T extends Row> {
  private readonly rows = new Map<string, T>();

  insert(row: T, idField: keyof T & string = 'id'): T {
    const id = (row[idField] as string | undefined) ?? seqId('row');
    const withId = { ...row, [idField]: id } as T;
    this.rows.set(id, withId);
    return withId;
  }

  get(id: string): T | undefined {
    return this.rows.get(id);
  }

  update(id: string, patch: Partial<T>): T | undefined {
    const existing = this.rows.get(id);
    if (!existing) return undefined;
    const updated = { ...existing, ...patch };
    this.rows.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.rows.delete(id);
  }

  all(): T[] {
    return [...this.rows.values()];
  }

  find(predicate: (row: T) => boolean): T[] {
    return this.all().filter(predicate);
  }

  findOne(predicate: (row: T) => boolean): T | undefined {
    return this.all().find(predicate);
  }

  clear(): void {
    this.rows.clear();
  }
}

// The account fake implements the `AccountRepository` port since T-101; it lives in its own file.
export { FakeAccountRepository } from './account-repository.js';

// The identity fakes implement the U11 identity ports; they live in their own file.
export { FakeIdentityRepository, FakePrivateIdentityRepository } from './identity.js';

/** Mirrors `PgDirectoryRepository`. */
export class FakeDirectoryRepository {
  readonly doctors = new MapStore<Row>();
  readonly facilities = new MapStore<Row>();
  readonly submissions = new MapStore<Row>();
  readonly claims = new MapStore<Row>();
  readonly fieldChanges = new MapStore<Row>();

  getDoctor(publicId: string): Promise<Row | undefined> {
    return Promise.resolve(this.doctors.findOne((d) => d.publicId === publicId));
  }

  listDoctors(_filters: Row): Promise<Row[]> {
    void _filters;
    return Promise.resolve(this.doctors.all());
  }

  getFacility(publicId: string): Promise<Row | undefined> {
    return Promise.resolve(this.facilities.findOne((f) => f.publicId === publicId));
  }

  listFacilities(_filters: Row): Promise<Row[]> {
    void _filters;
    return Promise.resolve(this.facilities.all());
  }

  doctorsAtBranch(branchId: string): Promise<Row[]> {
    return Promise.resolve(this.doctors.find((d) => d.branchId === branchId));
  }

  facilitiesForDoctor(doctorId: string): Promise<Row[]> {
    return Promise.resolve(
      this.facilities.find(
        (f) => (f.doctorIds as string[] | undefined)?.includes(doctorId) ?? false,
      ),
    );
  }

  submitProfile(input: Row): Promise<Row> {
    return Promise.resolve(this.submissions.insert(input));
  }

  listSubmissions(query: Row): Promise<Row[]> {
    return Promise.resolve(
      this.submissions.find((s) => !query.status || s.status === query.status),
    );
  }

  listClaims(query: Row): Promise<Row[]> {
    return Promise.resolve(this.claims.find((c) => !query.status || c.status === query.status));
  }

  listFieldChanges(query: Row): Promise<Row[]> {
    return Promise.resolve(
      this.fieldChanges.find((c) => !query.status || c.status === query.status),
    );
  }

  decideSubmission(input: Row): Promise<Row | undefined> {
    return Promise.resolve(
      this.submissions.update(input.submissionId as string, { status: input.decision }),
    );
  }

  claimProfile(input: Row): Promise<Row> {
    return Promise.resolve(this.claims.insert(input));
  }

  decideClaim(input: Row): Promise<Row | undefined> {
    return Promise.resolve(this.claims.update(input.claimId as string, { status: input.decision }));
  }

  proposeFieldChange(input: Row): Promise<Row> {
    return Promise.resolve(this.fieldChanges.insert(input));
  }

  decideFieldChange(input: Row): Promise<Row | undefined> {
    return Promise.resolve(
      this.fieldChanges.update(input.changeId as string, { status: input.decision }),
    );
  }
}

/** Mirrors `PgTaxonomyRepository`. */
export class FakeTaxonomyRepository {
  readonly terms = new MapStore<Row>();

  getCondition(publicId: string): Promise<Row | undefined> {
    return Promise.resolve(this.terms.findOne((t) => t.publicId === publicId));
  }

  listConditions(_filters: Row): Promise<Row[]> {
    void _filters;
    return Promise.resolve(this.terms.find((t) => t.kind === 'condition'));
  }

  resolve(text: string): Promise<Row | undefined> {
    const key = text.trim().toLowerCase();
    return Promise.resolve(
      this.terms.findOne((t) => (t.aliasKeys as string[] | undefined)?.includes(key) ?? false),
    );
  }

  listSuggested(group: string): Promise<Row[]> {
    return Promise.resolve(this.terms.find((t) => t.suggested === true && t.group === group));
  }

  createProvisional(input: Row): Promise<Row> {
    return Promise.resolve(this.terms.insert({ ...input, provisional: true }));
  }

  mapProvisional(termId: string, canonicalId: string): Promise<Row | undefined> {
    return Promise.resolve(this.terms.update(termId, { canonicalId }));
  }
}

/** Mirrors `PgReviewRepository`. */
export class FakeReviewRepository {
  readonly drafts = new MapStore<Row>();
  readonly reviews = new MapStore<Row>();
  readonly followUps = new MapStore<Row>();
  // CR-008 / ISS-177: a separate store from `reviews` on purpose — facility
  // feedback never enters a doctor's aggregates (hard rule), so
  // `criteriaDistribution` below reads only this store and
  // `sentimentDistribution`/`outcomeDistribution` read only `reviews`.
  readonly facilityReviews = new MapStore<Row>();

  saveDraft(input: Row): Promise<Row> {
    return Promise.resolve(this.drafts.insert(input));
  }

  getDraft(draftId: string): Promise<Row | undefined> {
    return Promise.resolve(this.drafts.get(draftId));
  }

  deleteDraft(draftId: string): Promise<boolean> {
    return Promise.resolve(this.drafts.delete(draftId));
  }

  insertReview(input: Row): Promise<Row> {
    return Promise.resolve(this.reviews.insert(input));
  }

  getByPublicId(publicId: string): Promise<Row | undefined> {
    return Promise.resolve(this.reviews.findOne((r) => r.publicId === publicId));
  }

  getById(reviewId: string): Promise<Row | undefined> {
    return Promise.resolve(this.reviews.get(reviewId));
  }

  updateState(reviewId: string, state: string): Promise<Row | undefined> {
    return Promise.resolve(this.reviews.update(reviewId, { state }));
  }

  addFollowUp(input: Row): Promise<Row> {
    return Promise.resolve(this.followUps.insert(input));
  }

  correctReview(input: Row): Promise<Row | undefined> {
    return Promise.resolve(this.reviews.update(input.reviewId as string, input));
  }

  softDeleteReview(reviewId: string): Promise<Row | undefined> {
    return Promise.resolve(this.reviews.update(reviewId, { deletedAt: new Date() }));
  }

  restoreReview(reviewId: string): Promise<Row | undefined> {
    return Promise.resolve(this.reviews.update(reviewId, { deletedAt: null }));
  }

  listForDoctor(doctorId: string): Promise<Row[]> {
    return Promise.resolve(this.reviews.find((r) => r.doctorId === doctorId));
  }

  listForBranch(branchId: string): Promise<Row[]> {
    return Promise.resolve(this.reviews.find((r) => r.branchId === branchId));
  }

  listForCondition(conditionId: string): Promise<Row[]> {
    return Promise.resolve(this.reviews.find((r) => r.conditionId === conditionId));
  }

  listExperiences(query: Row): Promise<Row[]> {
    return Promise.resolve(
      this.reviews.find((r) => {
        if (query.doctorId !== undefined && r.doctorId !== query.doctorId) return false;
        if (query.branchId !== undefined && r.branchId !== query.branchId) return false;
        if (query.conditionId !== undefined && r.conditionId !== query.conditionId) return false;
        return true;
      }),
    );
  }

  // Counts only this fake's own `reviews` — never `facilityReviews` (hard
  // rule: facility feedback never touches a doctor's aggregates).
  sentimentDistribution(doctorId: string): Promise<Record<string, number>> {
    const dist: Record<string, number> = {};
    for (const r of this.reviews.find((row) => row.doctorId === doctorId)) {
      const sentiment = r.sentiment as string | undefined;
      if (!sentiment) continue;
      dist[sentiment] = (dist[sentiment] ?? 0) + 1;
    }
    return Promise.resolve(dist);
  }

  outcomeDistribution(doctorId: string): Promise<Record<string, number>> {
    const dist: Record<string, number> = {};
    for (const r of this.reviews.find((row) => row.doctorId === doctorId)) {
      const outcome = r.outcome as string | undefined;
      if (!outcome) continue;
      dist[outcome] = (dist[outcome] ?? 0) + 1;
    }
    return Promise.resolve(dist);
  }

  // Counts only `facilityReviews` — never `reviews` (same hard rule, other
  // direction: a doctor's own reviews never inflate a facility's criteria).
  criteriaDistribution(branchId: string): Promise<Record<string, Record<string, number>>> {
    const dist: Record<string, Record<string, number>> = {};
    for (const fr of this.facilityReviews.find((row) => row.branchId === branchId)) {
      const criteria = (fr.criteria as Record<string, string | null | undefined> | undefined) ?? {};
      for (const [criterion, value] of Object.entries(criteria)) {
        if (!value) continue;
        const byValue = (dist[criterion] ??= {});
        byValue[value] = (byValue[value] ?? 0) + 1;
      }
    }
    return Promise.resolve(dist);
  }

  insertFacilityReview(input: Row): Promise<Row> {
    return Promise.resolve(this.facilityReviews.insert(input));
  }

  softDeleteFacilityReview(reviewId: string): Promise<Row | undefined> {
    return Promise.resolve(this.facilityReviews.update(reviewId, { deletedAt: new Date() }));
  }

  restoreFacilityReview(reviewId: string): Promise<Row | undefined> {
    return Promise.resolve(this.facilityReviews.update(reviewId, { deletedAt: null }));
  }
}

/** Mirrors `PgEvidenceRepository`. */
export class FakeEvidenceRepository {
  readonly items = new MapStore<Row>();
  readonly artifacts = new MapStore<Row>();
  readonly custodyEvents = new MapStore<Row>();

  intake(input: Row): Promise<Row> {
    return Promise.resolve(this.items.insert({ ...input, state: 'quarantined' }));
  }

  updateState(itemId: string, state: string, failReason?: string): Promise<Row | undefined> {
    return Promise.resolve(
      this.items.update(itemId, { state, ...(failReason ? { failReason } : {}) }),
    );
  }

  insertArtifact(input: Row): Promise<Row> {
    return Promise.resolve(this.artifacts.insert(input));
  }

  recordCustodyEvent(input: Row): Promise<Row> {
    return Promise.resolve(this.custodyEvents.insert(input));
  }

  applyRedaction(input: Row): Promise<Row | undefined> {
    return Promise.resolve(this.items.update(input.itemId as string, { lastRedaction: input }));
  }

  confirmPrivacy(itemId: string): Promise<Row | undefined> {
    return Promise.resolve(this.items.update(itemId, { state: 'privacy_confirmed' }));
  }

  publish(reviewId: string): Promise<Row[]> {
    const items = this.items.find((i) => i.reviewId === reviewId);
    for (const item of items) this.items.update(item.id as string, { state: 'published' });
    return Promise.resolve(items);
  }

  remove(itemId: string): Promise<Row | undefined> {
    return Promise.resolve(this.items.update(itemId, { state: 'removed' }));
  }

  getForAuthor(draftId: string): Promise<Row[]> {
    return Promise.resolve(this.items.find((i) => i.reviewDraftId === draftId));
  }

  listForStaff(input: Row): Promise<Row[]> {
    return Promise.resolve(this.items.find((i) => !input.state || i.state === input.state));
  }

  getPublic(reviewId: string): Promise<Row[]> {
    return Promise.resolve(
      this.items.find((i) => i.reviewId === reviewId && i.state === 'published'),
    );
  }

  readOriginal(itemId: string, reason: string): Promise<Row | undefined> {
    this.custodyEvents.insert({ itemId, event: 'original_accessed', reason });
    return Promise.resolve(this.items.get(itemId));
  }
}

/** Mirrors the T-004 `PgCommunityRepository` stub; U49 uses `FakeCommunityModuleRepository`. */
export class FakeCommunityRepository {
  readonly comments = new MapStore<Row>();
  readonly reactions = new MapStore<Row>();

  postComment(input: Row): Promise<Row> {
    return Promise.resolve(this.comments.insert(input));
  }

  editComment(commentId: string, body: string): Promise<Row | undefined> {
    return Promise.resolve(this.comments.update(commentId, { body, editedAt: new Date() }));
  }

  deleteComment(commentId: string): Promise<Row | undefined> {
    const hasReplies = this.comments.find((c) => c.parentId === commentId).length > 0;
    return Promise.resolve(
      this.comments.update(
        commentId,
        hasReplies ? { tombstone: true, deletedAt: new Date() } : { deletedAt: new Date() },
      ),
    );
  }

  setReaction(input: Row): Promise<Row> {
    const key = `${String(input.targetKind)}:${String(input.targetId)}:${String(input.accountId)}`;
    if (input.value === null) {
      this.reactions.delete(key);
      return Promise.resolve({ id: key, ...input });
    }
    return Promise.resolve(this.reactions.insert({ id: key, ...input }));
  }

  thread(reviewId: string): Promise<Row[]> {
    return Promise.resolve(this.comments.find((c) => c.reviewId === reviewId));
  }

  reactionsOf(targetKind: string, targetId: string): Promise<Row[]> {
    return Promise.resolve(
      this.reactions.find((r) => r.targetKind === targetKind && r.targetId === targetId),
    );
  }
}

/** Mirrors `PgModerationRepository`. */
export class FakeModerationRepository {
  readonly reports = new MapStore<Row>();
  readonly cases = new MapStore<Row>();
  readonly appeals = new MapStore<Row>();

  fileReport(input: Row): Promise<Row> {
    return Promise.resolve(this.reports.insert(input));
  }

  queue(input: Row): Promise<Row[]> {
    return Promise.resolve(
      this.cases.find(
        (c) =>
          (!input.lane || c.lane === input.lane) && (!input.status || c.status === input.status),
      ),
    );
  }

  getCase(code: string): Promise<Row | undefined> {
    return Promise.resolve(this.cases.findOne((c) => c.code === code));
  }

  decide(input: Row): Promise<Row | undefined> {
    return Promise.resolve(
      this.cases.update(input.caseCode as string, { lastDecision: input, status: 'decided' }),
    );
  }

  restore(caseCode: string, reasonCode: string): Promise<Row | undefined> {
    return Promise.resolve(
      this.cases.update(caseCode, { status: 'open', restoreReason: reasonCode }),
    );
  }

  fileAppeal(input: Row): Promise<Row> {
    return Promise.resolve(this.appeals.insert(input));
  }

  decideAppeal(input: Row): Promise<Row | undefined> {
    return Promise.resolve(this.appeals.update(input.appealId as string, { status: input.status }));
  }

  myAppealable(accountId: string): Promise<Row[]> {
    return Promise.resolve(this.cases.find((c) => c.affectedAccountId === accountId));
  }

  bulkPreview(caseCodes: string[], action: string): Promise<Row> {
    return Promise.resolve({ affected: caseCodes, action, previewToken: seqId('preview') });
  }

  bulkApply(previewToken: string, reasonCode: string): Promise<Row> {
    return Promise.resolve({ previewToken, reasonCode, applied: true });
  }
}

/** Mirrors `PgNotificationRepository`. */
export class FakeNotificationRepository {
  readonly notifications = new MapStore<Row>();
  readonly staffNotifications = new MapStore<Row>();
  readonly emailDeliveries = new MapStore<Row>();

  list(accountId: string, _cursor?: string): Promise<Row[]> {
    void _cursor;
    return Promise.resolve(this.notifications.find((n) => n.accountId === accountId));
  }

  markRead(accountId: string, ids: string[] | 'all'): Promise<number> {
    const targets =
      ids === 'all'
        ? this.notifications.find((n) => n.accountId === accountId)
        : (ids.map((id) => this.notifications.get(id)).filter(Boolean) as Row[]);
    for (const n of targets) this.notifications.update(n.id as string, { readAt: new Date() });
    return Promise.resolve(targets.length);
  }

  unreadCount(accountId: string): Promise<number> {
    return Promise.resolve(
      this.notifications.find((n) => n.accountId === accountId && !n.readAt).length,
    );
  }

  insert(input: Row): Promise<Row> {
    return Promise.resolve(this.notifications.insert(input));
  }

  listStaffNotifications(input: Row): Promise<Row[]> {
    return Promise.resolve(this.staffNotifications.find((n) => !input.unackedOnly || !n.ackedAt));
  }

  ackStaffNotification(id: string): Promise<Row | undefined> {
    return Promise.resolve(this.staffNotifications.update(id, { ackedAt: new Date() }));
  }

  insertEmailDelivery(input: Row): Promise<Row> {
    return Promise.resolve(this.emailDeliveries.insert(input));
  }

  updateEmailDeliveryStatus(
    id: string,
    status: string,
    lastErrorCode?: string,
  ): Promise<Row | undefined> {
    return Promise.resolve(
      this.emailDeliveries.update(id, { status, ...(lastErrorCode ? { lastErrorCode } : {}) }),
    );
  }
}

/** Mirrors `PgConfigRepository`. */
export class FakeConfigRepository {
  readonly versions = new MapStore<Row>();

  currentVersion(): Promise<Row | undefined> {
    const all = this.versions.all().sort((a, b) => (b.version as number) - (a.version as number));
    return Promise.resolve(all[0]);
  }

  history(): Promise<Row[]> {
    return Promise.resolve(
      this.versions.all().sort((a, b) => (a.version as number) - (b.version as number)),
    );
  }

  insertVersion(input: Row): Promise<Row> {
    return Promise.resolve(this.versions.insert({ ...input, id: seqId('config-version') }));
  }
}

/** Mirrors `PgRetentionRepository`. */
export class FakeRetentionRepository {
  readonly policies = new MapStore<Row>();
  readonly holds = new MapStore<Row>();
  readonly bulkActions = new MapStore<Row>();

  currentPolicy(): Promise<Row | undefined> {
    const all = this.policies.all().sort((a, b) => (b.version as number) - (a.version as number));
    return Promise.resolve(all[0]);
  }

  setPolicy(input: Row): Promise<Row> {
    return Promise.resolve(this.policies.insert(input));
  }

  previewBulk(fromDays: number, toDays: number): Promise<Row> {
    return Promise.resolve({
      fromDays,
      toDays,
      count: 0,
      sampleIds: [],
      previewToken: seqId('bulk-preview'),
    });
  }

  executeBulk(previewToken: string, reason: string): Promise<Row> {
    return Promise.resolve(
      this.bulkActions.insert({ previewToken, reason, executedAt: new Date() }),
    );
  }

  placeHold(input: Row): Promise<Row> {
    return Promise.resolve(this.holds.insert(input));
  }

  releaseHold(holdId: string, reason: string): Promise<Row | undefined> {
    return Promise.resolve(
      this.holds.update(holdId, { releasedAt: new Date(), releaseReason: reason }),
    );
  }

  expireOriginals(before: Date): Promise<Row[]> {
    return Promise.resolve(
      this.holds.find(
        (h) =>
          (h.retentionExpiresAt as Date | undefined) !== undefined &&
          (h.retentionExpiresAt as Date) < before,
      ),
    );
  }
}

/** Mirrors `PgDataRequestRepository`. */
export class FakeDataRequestRepository {
  readonly requests = new MapStore<Row>();

  createExportRequest(accountId: string, idempotencyKey: string): Promise<Row> {
    return Promise.resolve(
      this.requests.insert({ accountId, idempotencyKey, kind: 'export', status: 'requested' }),
    );
  }

  createDeletionRequest(accountId: string, idempotencyKey: string, plan: unknown): Promise<Row> {
    return Promise.resolve(
      this.requests.insert({
        accountId,
        idempotencyKey,
        kind: 'delete',
        status: 'requested',
        plan,
      }),
    );
  }

  getStatus(requestId: string): Promise<Row | undefined> {
    return Promise.resolve(this.requests.get(requestId));
  }

  updatePlanStep(
    requestId: string,
    moduleName: string,
    status: string,
    errorCode?: string,
  ): Promise<Row | undefined> {
    const req = this.requests.get(requestId);
    if (!req) return Promise.resolve(undefined);
    const plan = (req.plan as Row[] | undefined) ?? [];
    const updatedPlan = plan.map((step) =>
      step.module === moduleName ? { ...step, status, ...(errorCode ? { errorCode } : {}) } : step,
    );
    return Promise.resolve(this.requests.update(requestId, { plan: updatedPlan }));
  }
}

/** Mirrors `PgAuditRepository`. */
export class FakeAuditRepository {
  readonly events = new MapStore<Row>();

  listByStream(stream: string, limit: number): Promise<Row[]> {
    return Promise.resolve(this.events.find((e) => e.stream === stream).slice(0, limit));
  }
}
