import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { createElement, type ReactNode } from 'react';
import { screen } from '@testing-library/react';
import { Colophon } from '../Colophon';
import { RouteTransition } from './RouteTransition';
import { DemoMarker } from '@/components/shared/DemoMarker';
import {
  LOCALES,
  copy,
  givenOsMotionPreference,
  inEffect,
  installMotionCss,
  renderInLocale,
  resetMotionEnvironment,
  type Locale,
} from './motion-test-support';

vi.mock('@/i18n/routing', () => ({
  Link: ({
    href,
    children,
    ...rest
  }: {
    href: string;
    children?: ReactNode;
    [key: string]: unknown;
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => '/',
}));

// FD-091 motion system (T-011): the patient page is wrapped in the route frame, and the demo
// marker, the disclaimer and the footer stay outside every motion hook and never animate.
function patientShell(locale: Locale) {
  return renderInLocale(
    locale,
    createElement(
      'div',
      null,
      createElement(DemoMarker),
      createElement(
        'main',
        { id: 'main' },
        createElement(RouteTransition, null, createElement('p', null, 'page content')),
      ),
      createElement(Colophon),
    ),
  );
}

// Cold start of the first jsdom render under a loaded machine (ISS-296, ISS-297).
beforeAll(() => {
  patientShell('en').unmount();
  resetMotionEnvironment();
});

beforeEach(installMotionCss);
afterEach(resetMotionEnvironment);

describe.each(LOCALES)('patient motion system smoke in %s', (locale) => {
  it('wraps the page in the route frame and marks the page ready for entry motion', () => {
    patientShell(locale);
    const main = screen.getByRole('main');
    expect(main.querySelector('.page-frame')).toHaveTextContent('page content');
    expect(document.documentElement).toHaveAttribute('data-motion-ready');
  });

  it('keeps the demo marker, the disclaimer and the footer outside every motion hook', () => {
    patientShell(locale);
    const demo = screen.getByRole('note');
    const footer = screen.getByRole('contentinfo');
    expect(demo).toHaveTextContent(copy(locale, 'demo.banner'));
    expect(footer).toHaveTextContent(copy(locale, 'disclaimer.long'));
    for (const part of [demo, footer]) {
      expect(part.closest('[data-reveal-list], .page-frame')).toBeNull();
      expect(part.querySelector('[data-reveal-list], [data-step-dir], .reveal')).toBeNull();
    }
  });

  it('never animates the demo marker, the disclaimer or the footer, even with motion on', () => {
    givenOsMotionPreference('no-preference');
    patientShell(locale);
    const demo = screen.getByRole('note');
    const footer = screen.getByRole('contentinfo');
    for (const part of [demo, footer, ...Array.from(footer.querySelectorAll('p, a'))]) {
      expect(inEffect(part, 'animation')).toBe('none');
      expect(inEffect(part, 'transition')).toBe('none');
    }
  });
});
