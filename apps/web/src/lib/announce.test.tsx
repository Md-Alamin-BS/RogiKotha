import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useAnnounce } from './announce';

function mountLiveRegion() {
  const node = document.createElement('div');
  node.id = 'sr-live';
  document.body.appendChild(node);
  return node;
}

describe('useAnnounce', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    document.getElementById('sr-live')?.remove();
  });

  it('writes the message into the live region', () => {
    const region = mountLiveRegion();
    const { result } = renderHook(() => useAnnounce());
    result.current('Dark mode on');
    expect(region).toHaveTextContent('Dark mode on');
  });

  it('clears the message after a second so a repeat is read again', () => {
    const region = mountLiveRegion();
    const { result } = renderHook(() => useAnnounce());
    result.current('Dark mode on');
    vi.advanceTimersByTime(999);
    expect(region).toHaveTextContent('Dark mode on');
    vi.advanceTimersByTime(1);
    expect(region).toBeEmptyDOMElement();
  });

  it('leaves a newer message in place when an older one expires', () => {
    const region = mountLiveRegion();
    const { result } = renderHook(() => useAnnounce());
    result.current('first');
    vi.advanceTimersByTime(600);
    result.current('second');
    vi.advanceTimersByTime(500);
    expect(region).toHaveTextContent('second');
    vi.advanceTimersByTime(500);
    expect(region).toBeEmptyDOMElement();
  });

  it('does nothing when the page has no live region', () => {
    const { result } = renderHook(() => useAnnounce());
    expect(() => result.current('anything')).not.toThrow();
    expect(document.getElementById('sr-live')).toBeNull();
  });

  it('returns the same function on every render so effects that depend on it stay put', () => {
    const { result, rerender } = renderHook(() => useAnnounce());
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });
});
