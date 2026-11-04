// The params allowlist per message key (T-101 BR6.2): every email T-101 queues carries exactly one
// absolute link and nothing else. Checked when queueing (under APP_URL) and again when sending.
// `URL` is not in this package's lib (ES2023, FD-093), so a link is checked as a string.
import type { EmailMessageKey, EmailParams } from '../../ports';

export const EMAIL_PARAM_KEYS: Readonly<Record<EmailMessageKey, readonly string[]>> = {
  'email.verify': ['link'],
  'email.reset': ['link'],
  'email.existing': ['link'],
  'email.security.passwordChanged': ['link'],
  'email.security.severeSignInActivity': ['link'],
};

const ABSOLUTE_LINK_RE = /^https?:\/\/[^\s/?#]+(?:[/?#]\S*)?$/;

/**
 * True when `params` holds exactly the keys of `messageKey` and every link is an absolute http(s)
 * URL; with `appUrl`, the link must also sit under it.
 */
export function emailParamsAllowed(
  messageKey: EmailMessageKey,
  params: EmailParams,
  appUrl?: string,
): boolean {
  // A stored row can carry a key this version does not know; it then has no allowed params.
  const expected: readonly string[] = EMAIL_PARAM_KEYS[messageKey] ?? [];
  const keys = Object.keys(params);
  if (keys.length !== expected.length || !keys.every((key) => expected.includes(key))) {
    return false;
  }
  const link = params.link;
  if (typeof link !== 'string' || !ABSOLUTE_LINK_RE.test(link)) return false;
  return appUrl === undefined || link.startsWith(`${appUrl}/`);
}
