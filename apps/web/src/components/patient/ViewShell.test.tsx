import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ViewShell } from './ViewShell';

// Regression test for ISS-121 (fixed in T-207a): the Discover placeholder
// page passed title="" and got a real, empty `<h1 class="display">` in the
// DOM — an axe/WCAG failure. A page whose own content brings a complete
// heading (Emergency, About, Policy) also passes title="" on purpose, so
// this must render no heading at all rather than an empty one.
describe('ViewShell', () => {
  it('renders no heading when title is empty', () => {
    render(
      <ViewShell view="discover" title="">
        <p>content</p>
      </ViewShell>,
    );
    expect(screen.queryByRole('heading')).toBeNull();
    expect(document.getElementById('view-discover')).toBeInTheDocument();
  });

  it('renders the heading when title is non-empty', () => {
    render(
      <ViewShell view="about" title="About & methodology">
        <p>content</p>
      </ViewShell>,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'About & methodology' })).toBeInTheDocument();
  });
});
