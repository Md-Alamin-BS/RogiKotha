import { createElement, type ComponentProps } from 'react';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { act, screen } from '@testing-library/react';
import { useTranslations } from 'next-intl';
import type * as React from 'react';
import { LANGUAGE_SWITCH_TRANSITION, markLanguageSwitch, RouteTransition } from './RouteTransition';
import { LOCALES, copy, renderInLocale, resetMotionEnvironment } from './motion-test-support';

// The locale-free path the routing module reports, as next-intl's `usePathname` does.
const route = vi.hoisted(() => ({ path: '/doctors' }));
vi.mock('@/i18n/routing', () => ({ usePathname: () => route.path }));

// jsdom cannot start a view transition, so the boundary's props are read as React receives them.
// The real component still renders underneath.
const boundary = vi.hoisted(() => ({ props: [] as Record<string, unknown>[] }));
vi.mock('react', async (importOriginal) => {
  const actual = await importOriginal<typeof React>();
  return {
    ...actual,
    ViewTransition: (props: ComponentProps<typeof actual.ViewTransition>) => {
      boundary.props.push(props as Record<string, unknown>);
      return actual.createElement(actual.ViewTransition, props);
    },
  };
});

function PageHeading() {
  const t = useTranslations();
  return <h1>{t('nav.profile')}</h1>;
}

function framedPage() {
  return createElement(RouteTransition, null, createElement(PageHeading));
}

function pageFrame(locale: (typeof LOCALES)[number]): HTMLElement {
  const frame = screen.getByRole('heading', { name: copy(locale, 'nav.profile') }).parentElement;
  if (!frame) throw new Error('The heading has no frame');
  return frame;
}

// Cold start of the first jsdom render under a loaded machine (ISS-296, ISS-297).
beforeAll(() => {
  renderInLocale('en', framedPage()).unmount();
});

afterEach(() => {
  resetMotionEnvironment();
  route.path = '/doctors';
  boundary.props.length = 0;
});

describe.each(LOCALES)('RouteTransition in %s', (locale) => {
  it('shows the page content inside one frame', () => {
    renderInLocale(locale, framedPage());
    const frame = pageFrame(locale);
    expect(frame).toHaveClass('page-frame');
    expect(document.querySelectorAll('.page-frame')).toHaveLength(1);
  });

  it('marks the page ready for entry motion once it has mounted', () => {
    expect(document.documentElement).not.toHaveAttribute('data-motion-ready');
    renderInLocale(locale, framedPage());
    expect(document.documentElement).toHaveAttribute('data-motion-ready');
  });

  it('keeps the same frame when the path stays the same', () => {
    const page = renderInLocale(locale, framedPage());
    const before = pageFrame(locale);
    page.rerenderInLocale(locale, framedPage());
    expect(pageFrame(locale)).toBe(before);
  });

  it('gives each new path a new frame and drops the old one', () => {
    const page = renderInLocale(locale, framedPage());
    const before = pageFrame(locale);
    route.path = '/facilities';
    page.rerenderInLocale(locale, framedPage());
    const after = pageFrame(locale);
    expect(after).not.toBe(before);
    expect(before.isConnected).toBe(false);
  });

  it('keeps the frame when only the language changes, because the path has no locale', () => {
    const page = renderInLocale(locale, framedPage());
    const before = pageFrame(locale);
    const other = locale === 'en' ? 'bn' : 'en';
    page.rerenderInLocale(other, framedPage());
    expect(pageFrame(other)).toBe(before);
    expect(before).toHaveTextContent(copy(other, 'nav.profile'));
  });

  it('swaps at once for a navigation that carries the language-switch transition type', () => {
    renderInLocale(locale, framedPage());
    const props = boundary.props.at(-1) as Record<string, Record<string, string>>;
    for (const moment of ['enter', 'exit', 'share'] as const) {
      expect(props[moment]?.[LANGUAGE_SWITCH_TRANSITION]).toBe('none');
    }
  });

  it('holds both frames still from the toggle click until the page in the other language arrives', () => {
    const page = renderInLocale(locale, framedPage());
    const other = locale === 'en' ? 'bn' : 'en';
    act(() => {
      markLanguageSwitch(other);
    });
    const marked = boundary.props.at(-1) as Record<string, unknown>;
    for (const moment of ['enter', 'exit', 'share'] as const) expect(marked[moment]).toBe('none');

    page.rerenderInLocale(other, framedPage());
    const arrived = boundary.props.at(-1) as Record<string, Record<string, string>>;
    for (const moment of ['enter', 'exit', 'share'] as const) {
      expect(arrived[moment]?.default).toBe('rk-page');
    }
  });

  it('runs the route fade for any other navigation and for none of the in-place updates', () => {
    renderInLocale(locale, framedPage());
    const props = boundary.props.at(-1) as Record<string, unknown>;
    for (const moment of ['enter', 'exit', 'share'] as const) {
      expect((props[moment] as Record<string, string>).default).toBe('rk-page');
    }
    expect(props.update).toBe('none');
    expect(props.default).toBe('none');
    expect(props.name).toBe('page');
  });
});
