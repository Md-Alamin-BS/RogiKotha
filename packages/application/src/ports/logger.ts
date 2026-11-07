// BR8.1: the field list is closed so an email, password, token, link, params, user agent or client
// address cannot be logged by accident. A new field is added here, with its reason, first.

export interface LogFields {
  correlationId?: string;
  accountId?: string;
  deliveryId?: string;
  sessionId?: string;
  jobId?: string;
  /** a command or query name, e.g. `account.signIn` */
  command?: string;
  messageKey?: string;
  status?: string;
  errorCode?: string;
  /** a library-call scope purpose or an `account.securityEvent` kind */
  purpose?: string;
  kind?: string;
  attempts?: number;
  count?: number;
  durationMs?: number;
  retryAfterSec?: number;
  // U48 BR7.1: an evidence line names the item, its state, the fail-reason code, the attempt and
  // the error's class, never the file name, bytes, hash, storage key or account.
  itemId?: string;
  state?: string;
  failReason?: string;
  attempt?: number;
  errorClass?: string;
}

export interface Logger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}
