'use server';

// One server action per account command and query (T-101 § 6.3): the command parses, authorizes
// and decides; the action only supplies the request and applies the session cookie on `ok`. No
// rendering here: T-102 wraps these as form actions.
import {
  changePasswordCommand,
  getOwnAccountQuery,
  listSessionsQuery,
  registerCommand,
  requestPasswordResetCommand,
  resendOwnVerificationCommand,
  resendVerificationCommand,
  resetPasswordCommand,
  signInCommand,
  signOutCommand,
  signOutEverywhereCommand,
  submitFeedbackCommand,
  updatePreferencesCommand,
  verifyEmailCommand,
  type EmptyOutput,
  type GetOwnAccountOutput,
  type ListSessionsOutput,
  type RegisterOutput,
} from '@rogikotha/application';
import type { Result } from '@rogikotha/contracts';

import { runCommand, runSessionCommand } from '../command-call';

export async function registerAccount(raw: unknown): Promise<Result<RegisterOutput>> {
  return runCommand(registerCommand, raw);
}

/** A POST from the confirm button, never a page render (T-102 F1). */
export async function verifyEmail(raw: unknown): Promise<Result<EmptyOutput>> {
  return runSessionCommand(verifyEmailCommand, raw);
}

export async function resendVerification(raw: unknown): Promise<Result<EmptyOutput>> {
  return runCommand(resendVerificationCommand, raw);
}

export async function resendOwnVerification(raw: unknown): Promise<Result<EmptyOutput>> {
  return runCommand(resendOwnVerificationCommand, raw);
}

export async function signIn(raw: unknown): Promise<Result<EmptyOutput>> {
  return runSessionCommand(signInCommand, raw);
}

export async function signOut(raw: unknown): Promise<Result<EmptyOutput>> {
  return runSessionCommand(signOutCommand, raw);
}

export async function signOutEverywhere(raw: unknown): Promise<Result<{ revoked: number }>> {
  return runSessionCommand(signOutEverywhereCommand, raw);
}

export async function requestPasswordReset(raw: unknown): Promise<Result<EmptyOutput>> {
  return runCommand(requestPasswordResetCommand, raw);
}

export async function resetPassword(raw: unknown): Promise<Result<EmptyOutput>> {
  return runSessionCommand(resetPasswordCommand, raw);
}

export async function changePassword(raw: unknown): Promise<Result<EmptyOutput>> {
  return runSessionCommand(changePasswordCommand, raw);
}

export async function updatePreferences(raw: unknown): Promise<Result<EmptyOutput>> {
  return runCommand(updatePreferencesCommand, raw);
}

export async function submitFeedback(raw: unknown): Promise<Result<EmptyOutput>> {
  return runCommand(submitFeedbackCommand, raw);
}

export async function listSessions(raw: unknown): Promise<Result<ListSessionsOutput>> {
  return runCommand(listSessionsQuery, raw);
}

/** The holder's own account, with the address masked (FD-096); never cached. */
export async function getOwnAccount(raw: unknown): Promise<Result<GetOwnAccountOutput>> {
  return runCommand(getOwnAccountQuery, raw);
}
