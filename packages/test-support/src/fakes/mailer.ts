// `Mailer` port fake (03-routes-and-contracts.md §3:
// `send({to, category, messageKey, params, locale}) -> Result<{deliveryId}>`).
import { ok, type Locale, type Result } from '@rogikotha/contracts';

import { seqId } from '../builders/seq.js';

export interface SentMail {
  deliveryId: string;
  to: string;
  category: string;
  messageKey: string;
  params: Record<string, unknown>;
  locale: Locale;
}

export class RecordingMailer {
  readonly sent: SentMail[] = [];

  send(input: {
    to: string;
    category: string;
    messageKey: string;
    params?: Record<string, unknown>;
    locale: Locale;
  }): Promise<Result<{ deliveryId: string }>> {
    const deliveryId = seqId('mail');
    this.sent.push({ ...input, params: input.params ?? {}, deliveryId });
    return Promise.resolve(ok({ deliveryId }));
  }
}
