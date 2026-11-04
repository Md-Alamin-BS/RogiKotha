'use client';

import {
  startTransition,
  useActionState,
  useEffect,
  useRef,
  type FormEvent,
  type RefObject,
} from 'react';
import { INITIAL_AUTH_STATE, type AuthFormState } from '@/server/actions/auth-form';

type AuthAction<F extends string> = (
  previous: AuthFormState<F>,
  form: FormData,
) => Promise<AuthFormState<F>>;

/**
 * Runs an auth server action from a form. Submitting through a transition keeps what the reader
 * typed, because the action never sends the values back (NFR3); without JavaScript the plain
 * `action` still posts. After a refusal, focus moves to the error summary (the prototype's
 * focusAuthSummary).
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

  useEffect(() => {
    summaryRef.current?.focus();
  }, [state]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    startTransition(() => formAction(data));
  }

  return { state, formAction, pending, onSubmit, summaryRef };
}
