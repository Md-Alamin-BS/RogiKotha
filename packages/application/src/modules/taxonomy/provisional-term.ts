// The provisional-term operation (WF10, BR5.2, BR5.3): an author's wording that no active term
// matches becomes one provisional term with that wording and one alias. It runs on the caller's
// transaction, so U47's publish and its review commit or fail together, and it is idempotent per
// kind and key under concurrent calls: the open-provisional key makes the losing insert do nothing,
// and the loser returns the winner without aborting its transaction.
import { err, ok, type Result, type TermKind } from '@rogikotha/contracts';
import { normalizeAliasKey } from '@rogikotha/domain';

import type { AuditActor, Tx } from '../../ports';
import { taxonomyAudit } from './audit';
import type { TaxonomyDeps } from './deps';

export interface ProvisionalTermRequest {
  kind: TermKind;
  text: string;
  lang: 'en' | 'bn' | 'banglish';
}

export interface ProvisionalTermResult {
  /** The effective term: an existing match, the created term, or the concurrent winner. */
  termId: string;
  created: boolean;
}

export type ProvisionalTermPorts = Pick<TaxonomyDeps, 'taxonomy' | 'audit' | 'outbox' | 'ids'>;

export async function ensureProvisionalTerm(
  ports: ProvisionalTermPorts,
  tx: Tx,
  request: ProvisionalTermRequest,
  actor: AuditActor,
  correlationId: string,
): Promise<Result<ProvisionalTermResult>> {
  const text = request.text.trim();
  const key = normalizeAliasKey(text);
  if (key === '') {
    return err('validation', { correlationId, fieldErrors: { text: 'errors.common.validation' } });
  }

  const [known] = await ports.taxonomy.findByKey(tx, key, request.kind);
  if (known) return ok({ termId: known.term.id, created: false });

  const id = ports.ids.newId();
  const inserted = await ports.taxonomy.insertProvisional(tx, {
    id,
    publicId: ports.ids.newPublicId(),
    kind: request.kind,
    text,
    key,
  });
  if (!inserted) {
    const winner = await ports.taxonomy.findOpenProvisional(tx, request.kind, key);
    if (!winner) return err('conflict', { correlationId });
    return ok({ termId: winner.id, created: false });
  }

  await ports.taxonomy.insertAlias(tx, {
    termId: inserted.termId,
    alias: text,
    aliasKey: key,
    lang: request.lang,
  });
  await ports.audit.write(
    tx,
    taxonomyAudit.provisionalCreated(inserted.termId, request.kind, request.lang, actor),
  );
  await ports.outbox.append(tx, 'term.changed', { id: inserted.termId });
  return ok({ termId: inserted.termId, created: true });
}
