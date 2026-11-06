import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { Avatar, avatarHash } from './Avatar';

describe('Avatar', () => {
  it('draws the same avatar for the same seed and a different one for another seed', () => {
    const first = render(<Avatar seed="kwgxjtgqfb" hue={210} />).container.innerHTML;
    const again = render(<Avatar seed="kwgxjtgqfb" hue={210} />).container.innerHTML;
    const other = render(<Avatar seed="1nn37v172n" hue={210} />).container.innerHTML;

    expect(again).toBe(first);
    expect(other).not.toBe(first);
  });

  it('is decorative, hidden from assistive technology', () => {
    const { container } = render(<Avatar seed="kwgxjtgqfb" hue={null} />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });

  it('never draws a negative dash, whatever the seed', () => {
    for (const seed of ['a', 'b', 'kwgxjtgqfb', '1nn37v172n', '67z1tee71d', 'zzzzzzzzzz']) {
      const { container, unmount } = render(<Avatar seed={seed} hue={50} />);
      for (const ring of container.querySelectorAll('circle[stroke-dasharray]')) {
        const [dash] = (ring.getAttribute('stroke-dasharray') ?? '').split(' ').map(Number);
        expect(dash).toBeGreaterThan(0);
      }
      unmount();
    }
  });
});

describe('avatarHash', () => {
  it('is the 32-bit FNV-1a hash of the text', () => {
    expect(avatarHash('')).toBe(2166136261);
    expect(avatarHash('a')).toBe(0xe40c292c);
  });
});
