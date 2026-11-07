import { getRequestConfig } from 'next-intl/server';
import { IntlErrorCode, type AbstractIntlMessages } from 'next-intl';
import { routing } from './routing';

function isTestOrDev(): boolean {
  const env = process.env.NODE_ENV;
  return env !== 'production';
}

export interface RequestConfigOptions {
  /** Gets only the next-intl error code, never the error, whose message can quote copy (BR6.7). */
  onIntlError?: (code: IntlErrorCode) => void;
}

export function createRequestConfig(options: RequestConfigOptions = {}) {
  return getRequestConfig(async ({ requestLocale }) => {
    const requested = await requestLocale;
    const locale = routing.locales.includes(requested as (typeof routing.locales)[number])
      ? (requested as (typeof routing.locales)[number])
      : routing.defaultLocale;

    const messagesModule = (await import(`../messages/${locale}.json`)) as {
      default: AbstractIntlMessages;
    };
    const messages = messagesModule.default;

    return {
      locale,
      messages,
      timeZone: 'Asia/Dhaka',
      // A missing message key must fail the build/test, not silently render
      // the key name (docs/implementation/tasks/T-006-i18n.md step 9). In
      // production we report the code and fall back rather than crashing a live page.
      onError(error) {
        if (error.code === IntlErrorCode.MISSING_MESSAGE && isTestOrDev()) {
          throw error;
        }
        options.onIntlError?.(error.code);
      },
      getMessageFallback({ key, namespace }) {
        const path = [namespace, key].filter(Boolean).join('.');
        if (isTestOrDev()) {
          throw new Error(`Missing i18n message: ${path}`);
        }
        return path;
      },
    };
  });
}

// Without a reporter an intl error is dropped: this package has no logger, and printing the
// error would bypass the log policy.
export default createRequestConfig();
