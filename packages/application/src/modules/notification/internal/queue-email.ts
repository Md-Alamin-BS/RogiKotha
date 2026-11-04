// C2 `notification.queueEmail`, first version (T-101 WF12, BR6.1, FD-071, FD-095). It writes the
// delivery and its `mail.send` job on the caller's transaction, so both commit or neither does.
// The caller ensured the `mail.send` queue before it opened `tx` (ISS-253).
import { err, InternalError, ok, type Locale, type Result } from '@rogikotha/contracts';

import {
  MAIL_SEND_JOB,
  type AppSettings,
  type EmailCategory,
  type EmailDeliveryRepository,
  type EmailMessageKey,
  type EmailParams,
  type IdGenerator,
  type JobQueue,
  type MailSendPayload,
  type RecipientDirectory,
  type Tx,
} from '../../../ports';
import { emailParamsAllowed } from '../email-params';

export interface QueueEmailPorts {
  recipients: RecipientDirectory;
  deliveries: EmailDeliveryRepository;
  jobQueue: JobQueue;
  ids: IdGenerator;
  app: AppSettings;
}

export interface QueueEmailInput {
  accountId: string;
  category: EmailCategory;
  messageKey: EmailMessageKey;
  /** A function when the link carries the recipient's locale, which only the directory knows. */
  params: EmailParams | ((locale: Locale) => EmailParams);
  /** The same key never queues twice (C2). */
  dedupeKey?: string;
  correlationId?: string;
}

export type QueueEmailOutcome =
  | { kind: 'queued'; deliveryId: string }
  | { kind: 'deduplicated'; deliveryId: string }
  | { kind: 'suppressed' };

export async function queueEmail(
  ports: QueueEmailPorts,
  tx: Tx,
  input: QueueEmailInput,
): Promise<Result<QueueEmailOutcome>> {
  const contact = await ports.recipients.contactFor(tx, input.accountId);
  if (!contact) return ok({ kind: 'suppressed' });

  const params = typeof input.params === 'function' ? input.params(contact.locale) : input.params;
  if (!emailParamsAllowed(input.messageKey, params, ports.app.appUrl)) {
    // A caller built params outside the allowlist: a programmer error, never user input.
    throw new InternalError(`queueEmail: params refused for ${input.messageKey}`);
  }

  const dedupeKey = input.dedupeKey ?? null;
  if (dedupeKey !== null) {
    const existing = await ports.deliveries.findByDedupeKey(tx, dedupeKey);
    if (existing) return ok({ kind: 'deduplicated', deliveryId: existing.id });
  }

  const deliveryId = ports.ids.newId();
  await ports.deliveries.insert(tx, {
    id: deliveryId,
    accountId: input.accountId,
    toEmailEnc: contact.toEmailEnc,
    locale: contact.locale,
    category: input.category,
    messageKey: input.messageKey,
    params,
    dedupeKey,
  });
  const payload: MailSendPayload = { deliveryId };
  const enqueued = await ports.jobQueue.enqueue(
    tx,
    MAIL_SEND_JOB,
    { ...payload },
    {
      key: `${MAIL_SEND_JOB}:${deliveryId}`,
    },
  );
  if (!enqueued.ok) {
    return err('internal', input.correlationId ? { correlationId: input.correlationId } : {});
  }
  return ok({ kind: 'queued', deliveryId });
}
