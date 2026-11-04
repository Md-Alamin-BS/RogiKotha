// Queues one account email on the command's transaction through C2's `queueEmail` (BR6.1).
import type { Locale, Result } from '@rogikotha/contracts';

import type { CommandPorts } from '../../../command';
import type { EmailCategory, EmailMessageKey, EmailParams, Tx } from '../../../ports';
import { queueEmail, type QueueEmailOutcome } from '../../notification/internal/queue-email';
import { createRecipientDirectory } from '../recipient-directory';

export interface AccountEmail {
  accountId: string;
  category: EmailCategory;
  messageKey: EmailMessageKey;
  params: (locale: Locale) => EmailParams;
  correlationId: string;
}

export function queueAccountEmail(
  ports: CommandPorts,
  tx: Tx,
  email: AccountEmail,
): Promise<Result<QueueEmailOutcome>> {
  const recipients = createRecipientDirectory({
    accounts: ports.accounts,
    mailCrypto: ports.mailCrypto,
  });
  return queueEmail(
    {
      recipients,
      deliveries: ports.deliveries,
      jobQueue: ports.jobQueue,
      ids: ports.ids,
      app: ports.app,
    },
    tx,
    email,
  );
}
