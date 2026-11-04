// The `mail.send` use case (T-101 WF13, BR6.3, BR6.8), the worker's only application code, reached
// through `@rogikotha/application/worker`. It decrypts the recipient with the mail-only key, renders
// the email from the catalogue, sends it and records the outcome; it never reads `auth_users`.
import { ok } from '@rogikotha/contracts';

import type {
  Clock,
  Crypto,
  EmailCatalog,
  EmailDeliveryErrorCode,
  EmailDeliveryRecord,
  EmailDeliveryRepository,
  Logger,
  MailTransport,
  Tx,
  UnitOfWork,
} from '../../ports';
import { emailParamsAllowed } from './email-params';

/** The first try plus pg-boss's 5 retries (FD-076); the sixth failure is final. */
export const MAIL_SEND_MAX_ATTEMPTS = 6;

export interface SendEmailDeliveryDeps {
  unitOfWork: UnitOfWork;
  deliveries: EmailDeliveryRepository;
  /** Built from MAIL_RECIPIENT_KEY, the only key the worker holds (FD-095). */
  mailCrypto: Pick<Crypto, 'decryptText'>;
  transport: MailTransport;
  catalog: EmailCatalog;
  clock: Clock;
  logger: Logger;
}

/** `retry` asks the worker handler to throw, so pg-boss tries again. */
export type SendEmailDeliveryOutcome =
  | { status: 'sent' }
  | { status: 'skipped' }
  | { status: 'failed'; errorCode: EmailDeliveryErrorCode | 'payload_invalid' }
  | { status: 'retry'; errorCode: EmailDeliveryErrorCode; attempts: number };

interface Rendered {
  subject: string;
  text: string;
}

function deliveryIdOf(payload: unknown): string | null {
  if (typeof payload !== 'object' || payload === null) return null;
  const keys = Object.keys(payload);
  const id = (payload as { deliveryId?: unknown }).deliveryId;
  return keys.length === 1 && typeof id === 'string' && id.length > 0 ? id : null;
}

function render(row: EmailDeliveryRecord, catalog: EmailCatalog): Rendered | null {
  const template = catalog[row.locale]?.[row.messageKey];
  if (!template || template.subject === '' || !template.body.includes('{link}')) return null;
  const link = row.params.link ?? '';
  return {
    subject: template.subject.split('{link}').join(link),
    text: template.body.split('{link}').join(link),
  };
}

async function write(deps: SendEmailDeliveryDeps, work: (tx: Tx) => Promise<void>): Promise<void> {
  await deps.unitOfWork.run(async (tx) => {
    await work(tx);
    return ok(null);
  });
}

async function fail(
  deps: SendEmailDeliveryDeps,
  row: EmailDeliveryRecord,
  errorCode: EmailDeliveryErrorCode,
): Promise<SendEmailDeliveryOutcome> {
  await write(deps, (tx) => deps.deliveries.markFailed(tx, row.id, errorCode));
  deps.logger.error('mail.failed', {
    deliveryId: row.id,
    messageKey: row.messageKey,
    status: 'failed',
    errorCode,
  });
  return { status: 'failed', errorCode };
}

async function send(
  deps: SendEmailDeliveryDeps,
  row: EmailDeliveryRecord,
  to: string,
  mail: Rendered,
): Promise<SendEmailDeliveryOutcome> {
  const sent = await deps.transport.send({ to, subject: mail.subject, text: mail.text });
  if (sent.ok) {
    await write(deps, (tx) => deps.deliveries.markSent(tx, row.id, deps.clock.now()));
    deps.logger.info('mail.sent', {
      deliveryId: row.id,
      messageKey: row.messageKey,
      status: 'sent',
    });
    return { status: 'sent' };
  }
  const errorCode = sent.error.code;
  let attempts = 0;
  await write(deps, async (tx) => {
    attempts = (await deps.deliveries.recordAttempt(tx, row.id, errorCode)).attempts;
  });
  if (attempts >= MAIL_SEND_MAX_ATTEMPTS) return fail(deps, row, errorCode);
  deps.logger.warn('mail.failed', {
    deliveryId: row.id,
    messageKey: row.messageKey,
    status: 'queued',
    errorCode,
    attempts,
  });
  return { status: 'retry', errorCode, attempts };
}

export async function sendEmailDelivery(
  payload: unknown,
  deps: SendEmailDeliveryDeps,
): Promise<SendEmailDeliveryOutcome> {
  const deliveryId = deliveryIdOf(payload);
  if (deliveryId === null) {
    deps.logger.error('mail.payload_invalid', { errorCode: 'payload_invalid' });
    return { status: 'failed', errorCode: 'payload_invalid' };
  }
  const row = await deps.unitOfWork.read((tx) => deps.deliveries.findById(tx, deliveryId));
  // Missing, or already final: a redelivered job sends nothing twice.
  if (!row || row.status !== 'queued') return { status: 'skipped' };

  const to = deps.mailCrypto.decryptText(row.toEmailEnc);
  if (!to.ok) return fail(deps, row, 'decrypt_failed');
  if (!emailParamsAllowed(row.messageKey, row.params)) return fail(deps, row, 'params_invalid');
  const mail = render(row, deps.catalog);
  if (!mail) return fail(deps, row, 'template_missing');
  return send(deps, row, to.data, mail);
}
