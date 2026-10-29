import { beforeEach, describe, expect, it, vi } from 'vitest';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { MOTION_COOKIE, THEME_COOKIE } from '@/lib/cookies';
import { setLang, setMotion, setTheme } from './preferences';

vi.mock('next/headers', () => ({ cookies: vi.fn() }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;
const YEAR_LONG_LAX_SITE_WIDE = { sameSite: 'lax', path: '/', maxAge: ONE_YEAR_SECONDS };

const store = { set: vi.fn(), delete: vi.fn() };

describe('preference server actions', () => {
  beforeEach(() => {
    store.set.mockReset();
    store.delete.mockReset();
    vi.mocked(revalidatePath).mockReset();
    vi.mocked(cookies).mockResolvedValue(store as unknown as Awaited<ReturnType<typeof cookies>>);
  });

  it.each(['en', 'bn'] as const)('setLang stores the %s language for a year', async (locale) => {
    await setLang(locale);
    expect(store.set).toHaveBeenCalledWith('rk.lang', locale, YEAR_LONG_LAX_SITE_WIDE);
  });

  it.each(['light', 'dark'] as const)('setTheme stores the %s theme for a year', async (theme) => {
    await setTheme(theme);
    expect(store.set).toHaveBeenCalledWith(THEME_COOKIE, theme, YEAR_LONG_LAX_SITE_WIDE);
    expect(store.delete).not.toHaveBeenCalled();
  });

  it('setTheme clears the stored theme when the reader goes back to the system default', async () => {
    await setTheme(null);
    expect(store.delete).toHaveBeenCalledWith(THEME_COOKIE);
    expect(store.set).not.toHaveBeenCalled();
  });

  it.each(['on', 'off'] as const)('setMotion stores the %s choice for a year', async (motion) => {
    await setMotion(motion);
    expect(store.set).toHaveBeenCalledWith(MOTION_COOKIE, motion, YEAR_LONG_LAX_SITE_WIDE);
  });

  it('every action revalidates the whole layout so the new preference renders', async () => {
    await setLang('bn');
    await setTheme('dark');
    await setTheme(null);
    await setMotion('off');
    expect(revalidatePath).toHaveBeenCalledTimes(4);
    expect(revalidatePath).toHaveBeenCalledWith('/', 'layout');
  });
});
