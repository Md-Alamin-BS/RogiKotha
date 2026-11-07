'use client';

// The composer's server autosave (BR8.3, frontend-components.md § 4). Nothing is kept in browser
// storage: the server draft is the only copy.
import { useCallback, useEffect, useRef, useState, type Dispatch } from 'react';
import type { DraftPayload } from '@rogikotha/contracts';

import type { ComposerAction } from './composer-reducer';

export const AUTOSAVE_DEBOUNCE_MS = 1_500;
export const AUTOSAVE_RETRY_MS: readonly number[] = [5_000, 15_000, 30_000];

/** The answer of `saveDraftAction`, kept structural so the hook does not import server code. */
export type AutosaveAnswer =
  { ok: true; draftId: string; expiresAt: string } | { ok: false; messageKey: string };

export type AutosaveSave = (input: {
  draftId?: string;
  payload: DraftPayload;
}) => Promise<AutosaveAnswer>;

export interface UseAutosaveOptions {
  payload: DraftPayload;
  draftId: string | undefined;
  dispatch: Dispatch<ComposerAction>;
  save: AutosaveSave;
  /** False while publishing and after a successful publish: no save starts and no prompt shows. */
  enabled: boolean;
  /** Called after each successful save, for the preview and the duplicate hint (BR8.5). */
  onSaved?: (draftId: string, seq: number) => void;
}

export interface Autosave {
  /** Saves any pending change now and resolves with the draft id once nothing is in flight. */
  flush: () => Promise<string | undefined>;
}

const NOT_FOUND = 'errors.common.notFound';

export function useAutosave(options: UseAutosaveOptions): Autosave {
  const { payload, draftId, dispatch, save, enabled, onSaved } = options;

  const payloadRef = useRef(payload);
  const draftIdRef = useRef(draftId);
  const enabledRef = useRef(enabled);
  const saveRef = useRef(save);
  const onSavedRef = useRef(onSaved);
  const dispatchRef = useRef(dispatch);
  const dirty = useRef(false);
  const failed = useRef(false);
  const inFlight = useRef<Promise<void> | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const retries = useRef(0);
  const seq = useRef(0);
  const lastStep = useRef(payload.step);
  const mounted = useRef(true);
  const [guarded, setGuarded] = useState(false);

  saveRef.current = save;
  onSavedRef.current = onSaved;
  dispatchRef.current = dispatch;
  enabledRef.current = enabled;

  const refreshGuard = useCallback(() => {
    if (!mounted.current) return;
    setGuarded(
      enabledRef.current && (dirty.current || failed.current || inFlight.current !== null),
    );
  }, []);

  const clearTimer = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  // `run` and `schedule` call each other through refs, so both stay stable across renders.
  const runRef = useRef<() => Promise<void>>(async () => {});
  const schedule = useCallback(
    (ms: number) => {
      clearTimer();
      timer.current = setTimeout(() => {
        timer.current = null;
        void runRef.current();
      }, ms);
    },
    [clearTimer],
  );

  const run = useCallback(async (): Promise<void> => {
    clearTimer();
    if (!enabledRef.current || !dirty.current) return;
    // One save in flight: a change made meanwhile stays dirty and is saved when it answers.
    if (inFlight.current !== null) return;

    dirty.current = false;
    const mySeq = ++seq.current;
    const sentDraftId = draftIdRef.current;
    dispatchRef.current({ type: 'saveStarted', seq: mySeq });

    const attempt = (async () => {
      let answer: AutosaveAnswer;
      try {
        answer = await saveRef.current({
          ...(sentDraftId !== undefined ? { draftId: sentDraftId } : {}),
          payload: payloadRef.current,
        });
      } catch {
        answer = { ok: false, messageKey: 'errors.common.internal' };
      }
      // Kept even after unmount, so the unmount flush updates this draft instead of creating one.
      if (answer.ok) draftIdRef.current = answer.draftId;
      if (!mounted.current) return;

      if (answer.ok) {
        failed.current = false;
        retries.current = 0;
        dispatchRef.current({ type: 'saveSucceeded', seq: mySeq, draftId: answer.draftId });
        onSavedRef.current?.(answer.draftId, mySeq);
        return;
      }
      if (answer.messageKey === NOT_FOUND && sentDraftId !== undefined) {
        // The stored draft is gone (expired or discarded elsewhere): the next save creates one.
        draftIdRef.current = undefined;
        dirty.current = true;
        dispatchRef.current({ type: 'draftMissing' });
        return;
      }
      dirty.current = true;
      failed.current = true;
      dispatchRef.current({ type: 'saveFailed', seq: mySeq });
      const wait = AUTOSAVE_RETRY_MS[retries.current];
      retries.current += 1;
      // After the last backoff the draft waits for the author's next change.
      if (wait !== undefined) schedule(wait);
    })();

    inFlight.current = attempt;
    refreshGuard();
    await attempt;
    inFlight.current = null;
    refreshGuard();
    if (dirty.current && !failed.current && timer.current === null) await run();
  }, [clearTimer, refreshGuard, schedule]);
  runRef.current = run;

  // Every change of the payload: a step change saves at once, anything else after the debounce.
  useEffect(() => {
    if (payloadRef.current === payload) return;
    payloadRef.current = payload;
    dirty.current = true;
    failed.current = false;
    retries.current = 0;
    const stepChanged = payload.step !== lastStep.current;
    lastStep.current = payload.step;
    refreshGuard();
    if (!enabledRef.current) return;
    if (stepChanged) void run();
    else schedule(AUTOSAVE_DEBOUNCE_MS);
  }, [payload, refreshGuard, run, schedule]);

  useEffect(() => {
    if (draftId !== undefined) draftIdRef.current = draftId;
  }, [draftId]);

  // Publishing (or a finished publish) stops every pending save and retry; a refused publish
  // re-enables saving, and a change made meanwhile is saved after the debounce.
  useEffect(() => {
    if (!enabled) clearTimer();
    else if (dirty.current && inFlight.current === null && timer.current === null) {
      schedule(AUTOSAVE_DEBOUNCE_MS);
    }
    refreshGuard();
  }, [enabled, clearTimer, refreshGuard, schedule]);

  // The leave prompt exists only while a change is unsaved or a save failed.
  useEffect(() => {
    if (!guarded) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers show the prompt only when returnValue is set.
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [guarded]);

  // Unmounting flushes the last change; its answer is not awaited.
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimer();
      if (!enabledRef.current || !dirty.current) return;
      const last = () => {
        const id = draftIdRef.current;
        return saveRef
          .current({ ...(id !== undefined ? { draftId: id } : {}), payload: payloadRef.current })
          .catch(() => undefined);
      };
      // Still one save at a time: the last change follows the one in flight.
      if (inFlight.current === null) void last();
      else void inFlight.current.then(last);
    };
  }, [clearTimer]);

  const flush = useCallback(async (): Promise<string | undefined> => {
    clearTimer();
    // Read through a function: TypeScript keeps a narrowed `.current` across the awaits.
    const pending = () => inFlight.current;
    for (let p = pending(); p !== null; p = pending()) await p;
    if (dirty.current) {
      failed.current = false;
      await run();
      for (let p = pending(); p !== null; p = pending()) await p;
    }
    return draftIdRef.current;
  }, [clearTimer, run]);

  return { flush };
}
