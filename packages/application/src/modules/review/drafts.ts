// Shared draft handling of the Review module (BR2.2, BR2.3): the payload is stored only encrypted,
// and a draft that has expired or cannot be decrypted or parsed does not exist for its owner.
import { DraftPayload, err, type Actor, type Result } from '@rogikotha/contracts';

import type { CommandPorts } from '../../command';
import type { DraftRecord, Tx } from '../../ports';
import type { ReviewModulePorts } from './ports';

export interface OpenDraft {
  record: DraftRecord;
  payload: DraftPayload;
}

export function sealPayload(ports: CommandPorts, payload: DraftPayload): Uint8Array {
  return ports.crypto.encrypt(JSON.stringify(payload));
}

/** Decrypts and parses; null when either fails. Never logs the payload (BR2.2). */
export function openPayload(
  ports: CommandPorts,
  sealed: Uint8Array,
  correlationId: string,
): DraftPayload | null {
  const plain = ports.crypto.decryptText(sealed);
  if (!plain.ok) {
    ports.logger.warn('review.draft_unreadable', { correlationId, errorCode: plain.error.code });
    return null;
  }
  let value: unknown;
  try {
    value = JSON.parse(plain.data);
  } catch {
    ports.logger.warn('review.draft_unreadable', { correlationId, errorCode: 'parse_failed' });
    return null;
  }
  const parsed = DraftPayload.safeParse(value);
  if (!parsed.success) {
    ports.logger.warn('review.draft_unreadable', { correlationId, errorCode: 'parse_failed' });
    return null;
  }
  return parsed.data;
}

/** The actor's own live, readable draft, or null (BR1.1, BR2.3); nothing is deleted here. */
export async function findOwnDraft(
  deps: ReviewModulePorts,
  ports: CommandPorts,
  tx: Tx,
  accountId: string,
  draftId: string,
  correlationId: string,
): Promise<OpenDraft | null> {
  const record = await deps.reviews.findOwnLiveDraft(tx, accountId, draftId, ports.clock.now());
  if (!record) return null;
  const payload = openPayload(ports, record.payloadEnc, correlationId);
  return payload === null ? null : { record, payload };
}

export function draftNotFound(actor: Actor): Result<never> {
  return err('not_found', { correlationId: actor.correlationId });
}

/** `requires.authenticated` guarantees an account actor with an id. */
export function accountIdOf(actor: Actor): string {
  return actor.accountId ?? '';
}
