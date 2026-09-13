import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { LiveRegion } from './LiveRegion';
import { useAnnounce } from '@/lib/announce';

function Announcer({ message }: { message: string }) {
  const announce = useAnnounce();
  return (
    <button type="button" onClick={() => announce(message)}>
      Announce
    </button>
  );
}

describe('LiveRegion / useAnnounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('writes to the live region and clears it after 1s', () => {
    render(
      <>
        <LiveRegion />
        <Announcer message="View: discover" />
      </>,
    );

    act(() => {
      screen.getByRole('button', { name: 'Announce' }).click();
    });

    expect(screen.getByRole('status')).toHaveTextContent('View: discover');

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(screen.getByRole('status')).toHaveTextContent('');
  });
});
