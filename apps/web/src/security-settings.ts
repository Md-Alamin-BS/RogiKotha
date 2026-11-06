// Reads and memoises the security settings (BR7.1, BR7.2) and guards every route handler the
// proxy does not match (BR3.4, BR3.6). Settings are read at first use, never at module load.
// ASSUMPTION(U41): the design places this file in `server/`, but the `web-server` element may not
// import `web-shared` (`lib/`, eslint.boundaries.mjs); it sits in the `web` element beside the
// proxy instead of widening the FD-093 matrix.
import type { Logger } from '@rogikotha/application';
import { newId } from '@rogikotha/contracts';
import { checkRequest, type RefusalKind } from '@/lib/security/origin';
import { refusalResponse, refusalStatus } from '@/lib/security/refusal';
import { parseSecuritySettings, type SecuritySettings } from '@/lib/security/settings';
import { optionalEnv } from '@/server/env';
import { createWebLogger } from '@/server/logger';

export type EnvReader = (name: string) => string | undefined;

export interface SecurityGuard {
  /** Throws the memoised `SecuritySettingsError` when the settings are invalid. */
  getSecuritySettings(): SecuritySettings;
  /** The settings, or `null` after logging `security.settings_invalid` once per process. */
  loadSecuritySettings(): SecuritySettings | null;
  /** One `security.request_refused` line; never the Host, Origin, path or address. */
  logRequestRefused(kind: RefusalKind, correlationId?: string): void;
  /** `null` lets the handler continue; otherwise the AppError response to return. */
  guardRouteRequest(request: Request): Response | null;
}

export function createSecurityGuard(
  deps: { read?: EnvReader; logger?: Logger } = {},
): SecurityGuard {
  const read = deps.read ?? optionalEnv;
  let logger = deps.logger;
  let memo: { settings: SecuritySettings } | { error: unknown } | undefined;
  let invalidLogged = false;

  const log = (): Logger => (logger ??= createWebLogger());

  function getSecuritySettings(): SecuritySettings {
    if (memo === undefined) {
      try {
        memo = {
          settings: parseSecuritySettings({
            appUrl: read('APP_URL'),
            allowedOrigins: read('APP_ALLOWED_ORIGINS'),
            nodeEnv: read('NODE_ENV'),
          }),
        };
      } catch (error) {
        memo = { error };
      }
    }
    if ('error' in memo) throw memo.error;
    return memo.settings;
  }

  function loadSecuritySettings(): SecuritySettings | null {
    try {
      return getSecuritySettings();
    } catch (error) {
      if (!invalidLogged) {
        invalidLogged = true;
        log().error('security.settings_invalid', {
          errorName: error instanceof Error ? error.name : 'unknown',
        });
      }
      return null;
    }
  }

  function logRequestRefused(kind: RefusalKind, correlationId?: string): void {
    const fields = { kind, status: String(refusalStatus(kind)) };
    log().warn(
      'security.request_refused',
      correlationId === undefined ? fields : { ...fields, correlationId },
    );
  }

  function guardRouteRequest(request: Request): Response | null {
    const settings = loadSecuritySettings();
    if (settings === null) return refusalResponse('settings_invalid', newId());
    const decision = checkRequest(request, settings);
    if (decision.outcome === 'allowed') return null;
    const correlationId = newId();
    logRequestRefused(decision.kind, correlationId);
    return refusalResponse(decision.kind, correlationId);
  }

  return { getSecuritySettings, loadSecuritySettings, logRequestRefused, guardRouteRequest };
}

const processGuard = createSecurityGuard();

export function getSecuritySettings(): SecuritySettings {
  return processGuard.getSecuritySettings();
}

export function loadSecuritySettings(): SecuritySettings | null {
  return processGuard.loadSecuritySettings();
}

export function logRequestRefused(kind: RefusalKind, correlationId?: string): void {
  processGuard.logRequestRefused(kind, correlationId);
}

export function guardRouteRequest(request: Request): Response | null {
  return processGuard.guardRouteRequest(request);
}
