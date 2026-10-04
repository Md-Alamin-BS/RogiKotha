import { describe, expect, it, beforeAll } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider, type AbstractIntlMessages } from 'next-intl';
import { Sheet } from './Sheet';

const messages = { a11y: { close: 'Close' } } as unknown as AbstractIntlMessages;

// jsdom never computes real layout, so offsetWidth/offsetHeight are always 0
// — the prototype's own visibility filter (trapFocus, app.js ~2826) would
// then treat every element as hidden. Give every element a non-zero size so
// the ported filter behaves as it does in a real browser.
beforeAll(() => {
  Object.defineProperties(HTMLElement.prototype, {
    offsetWidth: { configurable: true, value: 100 },
    offsetHeight: { configurable: true, value: 40 },
  });
});

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <NextIntlClientProvider locale="en" messages={messages}>
      <button type="button" onClick={() => setOpen(true)}>
        Open sheet
      </button>
      <Sheet open={open} title="Test sheet" onClose={() => setOpen(false)}>
        <button type="button">First</button>
        <button type="button">Second</button>
      </Sheet>
    </NextIntlClientProvider>
  );
}

describe('Sheet', () => {
  it('traps focus inside the dialog', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Open sheet' }));

    const closeButton = screen.getByRole('button', { name: 'Close' });
    const second = screen.getByRole('button', { name: 'Second' });

    // Opening moves focus to the close button (the first focusable).
    expect(closeButton).toHaveFocus();

    // Tab forward from the last focusable wraps back to the first.
    second.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(closeButton).toHaveFocus();

    // Shift+Tab back from the first focusable wraps to the last.
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(second).toHaveFocus();
  });

  it('Escape closes and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    const { container } = render(<Harness />);
    const trigger = screen.getByRole('button', { name: 'Open sheet' });
    await user.click(trigger);
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    fireEvent.keyDown(document, { key: 'Escape' });

    expect(container.querySelector('.overlay')).toHaveAttribute('hidden');
    expect(trigger).toHaveFocus();
  });
});
