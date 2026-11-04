// The `MailTransport` port over nodemailer SMTP, built only by the worker (WF13 step 5, BR6.7).
import { createTransport } from 'nodemailer';

import type { MailTransport, MailTransportErrorCode } from '@rogikotha/application';

export interface SmtpSettings {
  host: string;
  port: number;
  /** `MAIL_FROM`, e.g. `RogiKotha <no-reply@demo.rogikotha.local>`. */
  from: string;
  /** Connection, greeting and socket timeout; 30 s in production (WF13). */
  timeoutMs?: number;
}

export const SMTP_TIMEOUT_MS = 30_000;

const TIMEOUT_CODES = new Set(['ETIMEDOUT']);
const REJECTED_CODES = new Set(['EENVELOPE', 'EMESSAGE', 'EMAXRECIPIENTS']);

function errorFields(error: unknown): { code?: unknown; responseCode?: unknown } {
  return typeof error === 'object' && error !== null ? error : {};
}

/**
 * Maps a nodemailer failure to the port's codes, or `null` when it is not a mail failure at all
 * (a programmer error the caller should see thrown).
 */
export function smtpErrorCode(error: unknown): MailTransportErrorCode | null {
  const { code, responseCode } = errorFields(error);
  if (typeof responseCode === 'number' && responseCode >= 500) return 'smtp_rejected';
  // A 4xx reply is temporary by RFC 5321, whatever step it came from.
  if (typeof responseCode === 'number' && responseCode >= 400) return 'smtp_unavailable';
  if (typeof code !== 'string') return null;
  if (TIMEOUT_CODES.has(code)) return 'smtp_timeout';
  if (REJECTED_CODES.has(code)) return 'smtp_rejected';
  // Everything else nodemailer reports (connection, socket, DNS, TLS, protocol, 4xx) may pass on a
  // retry, which the worker's pg-boss job provides.
  return 'smtp_unavailable';
}

export function createSmtpMailTransport(settings: SmtpSettings): MailTransport {
  const timeoutMs = settings.timeoutMs ?? SMTP_TIMEOUT_MS;
  const transporter = createTransport({
    host: settings.host,
    port: settings.port,
    secure: false,
    connectionTimeout: timeoutMs,
    greetingTimeout: timeoutMs,
    socketTimeout: timeoutMs,
    // The body is plain text built from the catalogue; nothing may pull in a file or a URL.
    disableFileAccess: true,
    disableUrlAccess: true,
  });

  return {
    async send(mail) {
      try {
        const info = await transporter.sendMail({
          from: settings.from,
          to: mail.to,
          subject: mail.subject,
          text: mail.text,
        });
        return { ok: true, data: { messageId: info.messageId } };
      } catch (error) {
        const code = smtpErrorCode(error);
        if (code === null) throw error;
        return { ok: false, error: { code } };
      }
    },
  };
}
