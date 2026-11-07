import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DraftPayload } from '@rogikotha/contracts';

import { emptyDraftPayload, type ComposerAction } from './composer-reducer';
import {
  AUTOSAVE_DEBOUNCE_MS,
  useAutosave,
  type AutosaveAnswer,
  type UseAutosaveOptions,
} from './use-autosave';

interface Call {
  input: { draftId?: string; payload: DraftPayload };
  resolve: (answer: AutosaveAnswer) => void;
  reject: (error: unknown) => void;
}

function fakeSave() {
  const calls: Call[] = [];
  const save = vi.fn(
    (input: Call['input']) =>
      new Promise<AutosaveAnswer>((resolve, reject) => {
        calls.push({ input, resolve, reject });
      }),
  );
  return { calls, save };
}

const ok = (draftId = '00000000-0000-4000-8000-000000000001'): AutosaveAnswer => ({
  ok: true,
  draftId,
  expiresAt: '2026-12-07T00:00:00.000Z',
});

function payloadWith(story: string, step = 1): DraftPayload {
  return { ...emptyDraftPayload(), story, step };
}

function setup(overrides: Partial<UseAutosaveOptions> = {}) {
  const { calls, save } = fakeSave();
  const actions: ComposerAction[] = [];
  const onSaved = vi.fn();
  const initial: UseAutosaveOptions = {
    payload: emptyDraftPayload(),
    draftId: undefined,
    dispatch: (a) => actions.push(a),
    save,
    enabled: true,
    onSaved,
    ...overrides,
  };
  const hook = renderHook((props: UseAutosaveOptions) => useAutosave(props), {
    initialProps: initial,
  });
  const rerender = (patch: Partial<UseAutosaveOptions>) => {
    Object.assign(initial, patch);
    hook.rerender({ ...initial });
  };
  return { calls, save, actions, onSaved, hook, rerender };
}

async function settle(answer: AutosaveAnswer, call: Call | undefined) {
  if (!call) throw new Error('no save call to answer');
  await act(async () => {
    call.resolve(answer);
    await microtasks();
  });
}

// The save chain awaits a few promises in a row; fake timers do not advance them.
async function microtasks() {
  for (let i = 0; i < 10; i++) await Promise.resolve();
}

describe('useAutosave', () => {
  const added: string[] = [];
  const realAdd = window.addEventListener.bind(window);

  beforeEach(() => {
    vi.useFakeTimers();
    added.length = 0;
    vi.spyOn(window, 'addEventListener').mockImplementation(
      (type: string, listener: EventListenerOrEventListenerObject, options?: unknown) => {
        added.push(type);
        realAdd(type, listener, options as AddEventListenerOptions | undefined);
      },
    );
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  function beforeUnloadListeners() {
    return added.filter((type) => type === 'beforeunload').length;
  }

  it('does not save the initial payload', () => {
    const { save } = setup();
    act(() => void vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS * 2));
    expect(save).not.toHaveBeenCalled();
  });

  it('saves 1.5 s after the last change, not after each keystroke', async () => {
    const { save, calls, rerender, onSaved, actions } = setup();
    rerender({ payload: payloadWith('a') });
    act(() => void vi.advanceTimersByTime(1_000));
    rerender({ payload: payloadWith('ab') });
    act(() => void vi.advanceTimersByTime(1_499));
    expect(save).not.toHaveBeenCalled();
    act(() => void vi.advanceTimersByTime(1));
    expect(save).toHaveBeenCalledTimes(1);
    expect(calls[0]?.input).toEqual({ payload: payloadWith('ab') });
    await settle(ok(), calls[0]);
    expect(onSaved).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001', 1);
    expect(actions).toEqual([
      { type: 'saveStarted', seq: 1 },
      { type: 'saveSucceeded', seq: 1, draftId: '00000000-0000-4000-8000-000000000001' },
    ]);
  });

  it('saves at once on a step change', () => {
    const { save, rerender } = setup();
    rerender({ payload: payloadWith('', 2) });
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('keeps one save in flight and sends the newer change after it answers, to the same draft', async () => {
    const { save, calls, rerender } = setup();
    rerender({ payload: payloadWith('first') });
    act(() => void vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS));
    rerender({ payload: payloadWith('second') });
    act(() => void vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS));
    expect(save).toHaveBeenCalledTimes(1);
    await settle(ok(), calls[0]);
    expect(save).toHaveBeenCalledTimes(2);
    expect(calls[1]?.input).toEqual({
      draftId: '00000000-0000-4000-8000-000000000001',
      payload: payloadWith('second'),
    });
  });

  it('retries a failed save after 5, 15 and 30 s, then waits for the next change', async () => {
    const { save, calls, rerender, actions } = setup();
    rerender({ payload: payloadWith('story') });
    act(() => void vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS));
    await settle({ ok: false, messageKey: 'errors.common.internal' }, calls[0]);
    expect(actions).toContainEqual({ type: 'saveFailed', seq: 1 });

    for (const [index, wait] of [5_000, 15_000, 30_000].entries()) {
      act(() => void vi.advanceTimersByTime(wait - 1));
      expect(save).toHaveBeenCalledTimes(index + 1);
      act(() => void vi.advanceTimersByTime(1));
      expect(save).toHaveBeenCalledTimes(index + 2);
      await settle({ ok: false, messageKey: 'errors.common.internal' }, calls[index + 1]);
    }
    act(() => void vi.advanceTimersByTime(120_000));
    expect(save).toHaveBeenCalledTimes(4);

    rerender({ payload: payloadWith('story, edited') });
    act(() => void vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS));
    expect(save).toHaveBeenCalledTimes(5);
  });

  it('treats a thrown save like a failed one', async () => {
    const { calls, rerender, actions } = setup();
    rerender({ payload: payloadWith('story') });
    act(() => void vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS));
    await act(async () => {
      calls[0]?.reject(new Error('network'));
      await microtasks();
    });
    expect(actions).toContainEqual({ type: 'saveFailed', seq: 1 });
  });

  it('creates a new draft when the stored one is gone, and reports it once', async () => {
    const stored = '00000000-0000-4000-8000-00000000000a';
    const { save, calls, rerender, actions } = setup({ draftId: stored });
    rerender({ payload: payloadWith('story') });
    act(() => void vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS));
    expect(calls[0]?.input.draftId).toBe(stored);
    await settle({ ok: false, messageKey: 'errors.common.notFound' }, calls[0]);
    expect(actions.filter((a) => a.type === 'draftMissing')).toHaveLength(1);
    expect(save).toHaveBeenCalledTimes(2);
    expect(calls[1]?.input).toEqual({ payload: payloadWith('story') });
  });

  it('starts no save while publishing and resumes when publishing is refused', () => {
    const { save, rerender } = setup();
    rerender({ payload: payloadWith('story') });
    rerender({ enabled: false });
    act(() => void vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS * 4));
    rerender({ payload: payloadWith('story, edited') });
    act(() => void vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS * 4));
    expect(save).not.toHaveBeenCalled();
    rerender({ enabled: true });
    act(() => void vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('asks before leaving only while a change is pending or a save failed', async () => {
    const { calls, rerender } = setup();
    expect(beforeUnloadListeners()).toBe(0);
    rerender({ payload: payloadWith('story') });
    expect(beforeUnloadListeners()).toBe(1);
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);

    act(() => void vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS));
    await settle(ok(), calls[0]);
    const after = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(after);
    expect(after.defaultPrevented).toBe(false);
  });

  it('does not ask before leaving while publishing', () => {
    const { rerender } = setup();
    rerender({ payload: payloadWith('story') });
    rerender({ enabled: false });
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  });

  it('flushes the pending change on unmount', () => {
    const { save, rerender, hook } = setup();
    rerender({ payload: payloadWith('story') });
    hook.unmount();
    expect(save).toHaveBeenCalledTimes(1);
    act(() => void vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS * 2));
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('flush saves the pending change now and answers the draft id', async () => {
    const { save, calls, rerender, hook } = setup();
    rerender({ payload: payloadWith('story') });
    let answered: string | undefined;
    let done: Promise<void> = Promise.resolve();
    act(() => {
      done = hook.result.current.flush().then((id) => {
        answered = id;
      });
    });
    expect(save).toHaveBeenCalledTimes(1);
    await settle(ok(), calls[0]);
    await act(async () => {
      await done;
    });
    expect(answered).toBe('00000000-0000-4000-8000-000000000001');
    act(() => void vi.advanceTimersByTime(AUTOSAVE_DEBOUNCE_MS * 2));
    expect(save).toHaveBeenCalledTimes(1);
  });
});
