'use client';

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  type FormEvent,
  type RefObject,
} from 'react';
import { useAnnounce } from '@/lib/announce';
import { INITIAL_AUTH_STATE, type AuthFormState } from '@/server/actions/auth-form';
import { useAuthMessage } from './AuthFields';

type AuthAction<F extends string> = (
  previous: AuthFormState<F>,
  form: FormData,
) => Promise<AuthFormState<F>>;

/**
 * Runs an auth server action from a form. Submitting through a transition keeps what the reader
 * typed, because the action never sends the values back (BR1.2); without JavaScript the plain
 * `action` still posts (BR1.1). After a refusal, focus moves to the error summary (the
 * prototype's focusAuthSummary); a confirmation that replaces the form is announced.
 */
export function useAuthForm<F extends string>(
  action: AuthAction<F>,
): {
  state: AuthFormState<F>;
  formAction: (form: FormData) => void;
  pending: boolean;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  summaryRef: RefObject<HTMLDivElement | null>;
} {
  const [state, formAction, pending] = useActionState(action, INITIAL_AUTH_STATE);
  const summaryRef = useRef<HTMLDivElement>(null);
  const announce = useAnnounce();
  const render = useAuthMessage();

  useEffect(() => {
    if (state.status === 'refused') summaryRef.current?.focus();
    if (state.status === 'done' && state.notice) announce(render(state.notice));
  }, [state, announce, render]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // A second press while the first is running would post twice (functional-spec § 4.2).
    if (pending) return;
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return { state, formAction, pending, onSubmit, summaryRef };
}
