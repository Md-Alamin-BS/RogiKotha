import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cookies } from 'next/headers';
import {
  MOTION_COOKIE,
  THEME_COOKIE,
  activeAdminTab,
  activePatientTab,
  deriveAppFromPathname,
  readMotion,
  readTheme,
} from './cookies';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));

// The slice of the Next cookie store these readers use: `get(name)?.value`.
function storeWith(values: Record<string, string>) {
  return {
    get: (name: string) => (name in values ? { name, value: values[name] } : undefined),
  } as unknown as Awaited<ReturnType<typeof cookies>>;
}

function givenCookies(values: Record<string, string>) {
  vi.mocked(cookies).mockResolvedValue(storeWith(values));
}

describe('readTheme', () => {
  beforeEach(() => {
    vi.mocked(cookies).mockReset();
  });

  it.each(['light', 'dark'] as const)('returns the stored %s theme', async (theme) => {
    givenCookies({ [THEME_COOKIE]: theme });
    await expect(readTheme()).resolves.toBe(theme);
  });

  it('returns null when no theme was chosen, so the system preference applies', async () => {
    givenCookies({});
    await expect(readTheme()).resolves.toBeNull();
  });

  it('returns null for a value that is not a known theme', async () => {
    givenCookies({ [THEME_COOKIE]: 'solarized' });
    await expect(readTheme()).resolves.toBeNull();
  });
});

describe('readMotion', () => {
  beforeEach(() => {
    vi.mocked(cookies).mockReset();
  });

  it('returns off only when the reader switched motion off', async () => {
    givenCookies({ [MOTION_COOKIE]: 'off' });
    await expect(readMotion()).resolves.toBe('off');
  });

  it('defaults to on when no motion choice was stored', async () => {
    givenCookies({});
    await expect(readMotion()).resolves.toBe('on');
  });

  it('defaults to on for a value that is not a known motion setting', async () => {
    givenCookies({ [MOTION_COOKIE]: 'reduced' });
    await expect(readMotion()).resolves.toBe('on');
  });
});

describe('deriveAppFromPathname', () => {
  it.each([
    ['/en/admin', 'admin'],
    ['/bn/admin/queue', 'admin'],
    ['/en/admin/queue/RK-1', 'admin'],
    ['/admin', 'admin'],
    ['/en', 'patient'],
    ['/bn/doctors', 'patient'],
    ['/en/administration-notes', 'patient'],
  ] as const)('maps %s to the %s app', (pathname, app) => {
    expect(deriveAppFromPathname(pathname)).toBe(app);
  });
});

describe('activePatientTab', () => {
  it.each([
    ['/en', 'discover'],
    ['/bn', 'discover'],
    ['/', 'discover'],
    ['/en/doctors', 'doctors'],
    ['/bn/facilities', 'facilities'],
    ['/en/topics', 'topics'],
    ['/bn/experiences', 'experiences'],
    ['/en/me', 'mine'],
  ] as const)('highlights the tab for %s', (pathname, tab) => {
    expect(activePatientTab(pathname)).toBe(tab);
  });

  it('highlights no tab on a detail page, because only the index views match exactly', () => {
    expect(activePatientTab('/en/doctors/abc')).toBeUndefined();
  });

  it('highlights no tab on pages outside the six tabs', () => {
    expect(activePatientTab('/bn/emergency')).toBeUndefined();
  });
});

describe('activeAdminTab', () => {
  it.each([
    ['/en/admin', 'queue'],
    ['/en/admin/queue', 'queue'],
    ['/bn/admin/queue/RK-1', 'queue'],
    ['/en/admin/evidence', 'evidence'],
    ['/bn/admin/providers', 'providers'],
    ['/en/admin/notifications', 'notifications'],
    ['/bn/admin/config', 'config'],
  ] as const)('highlights the tab for %s', (pathname, tab) => {
    expect(activeAdminTab(pathname)).toBe(tab);
  });

  it.each(['/en/admin/sign-in', '/en/admin/approve-device', '/bn/admin/security'])(
    'highlights no tab on %s rather than a false one',
    (pathname) => {
      expect(activeAdminTab(pathname)).toBeUndefined();
    },
  );
});
