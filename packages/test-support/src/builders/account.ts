// `anAccount()` — a registerable account. Its output validates directly
// against the real `account.register` command input (`RegisterInput`,
// contracts/schemas/account.ts): the one builder in this file with a clean
// 1:1 entity/input match.
import type { Locale, RegisterInput, StaffRole } from '@rogikotha/contracts';
import type { z } from 'zod';

import { seq } from './seq.js';

export interface AccountBuild {
  email: string;
  password: string;
  username: string;
  displayName: string;
  locale: Locale;
  ageConfirmed: boolean;
  termsAccepted: boolean;
  role: StaffRole | null;
}

export function anAccount(overrides: Partial<AccountBuild> = {}): AccountBuild {
  const n = seq('account');
  const username = `builder_${n}`;
  return {
    email: `${username}@demo.rogikotha.local`,
    password: 'demo-pass-2026!',
    username,
    displayName: `Builder ${n}`,
    locale: 'en',
    ageConfirmed: true,
    termsAccepted: true,
    role: null,
    ...overrides,
  };
}

export function toRegisterInput(a: AccountBuild): z.infer<typeof RegisterInput> {
  return {
    email: a.email,
    password: a.password,
    username: a.username,
    displayName: a.displayName,
    locale: a.locale,
    ageConfirmed: a.ageConfirmed,
    termsAccepted: a.termsAccepted,
  };
}
