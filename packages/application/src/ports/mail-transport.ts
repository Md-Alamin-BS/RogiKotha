// nodemailer in `adapters/mail-smtp`, worker only: SMTP_HOST:SMTP_PORT, 30 s timeout, MAIL_FROM.
import type { PortResult } from './port-result';

export type MailTransportErrorCode = 'smtp_unavailable' | 'smtp_rejected' | 'smtp_timeout';

export interface OutgoingMail {
  to: string;
  subject: string;
  /** Plain text only (BR6.7). */
  text: string;
}

export interface MailTransport {
  send(mail: OutgoingMail): Promise<PortResult<{ messageId: string }, MailTransportErrorCode>>;
}
