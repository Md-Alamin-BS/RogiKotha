#!/usr/bin/env node
/*
 * Port every bilingual UI string into packages/i18n/messages/{en,bn}.json.
 *
 * Sources, in merge order (later sources may add new keys; the reword and
 * removal lists below apply after everything is merged):
 *   1. ui-design-prototype/shared/rogikotha-data.js -> RK.strings (evaluated
 *      in a `vm` context with stub window/document/localStorage).
 *   2. the 04b concept's VIEWER_STRINGS object (evidence viewer chrome),
 *      namespaced under `viewer.*`.
 *   3. the admin console's NAV_GROUPS labels (Casework / Oversight),
 *      hard-coded here per the task file rather than parsed from admin/app.js.
 *   4. the auth/staff/email copy table from docs/design/auth-screens-spec.md
 *      §5, copied verbatim (no rewording).
 *   5. errors.* for every ErrorCode in docs/implementation/03-routes-and-
 *      contracts.md §2 that the auth spec table does not already cover.
 *   6. the addendum keys listed at the bottom of
 *      docs/implementation/tasks/T-006-i18n.md ("keys the other task writers
 *      found missing").
 *
 * ASSUMPTION(T-006): the task's Steps section names two extra files,
 * `scripts/auth-keys.json` and `scripts/error-keys.json`, but the task's own
 * "Owned paths" list does not include them. To stay strictly inside Owned
 * paths, both are embedded as constants in this file instead of written out
 * as sibling JSON files. The audit trail the task asks for (every row
 * traceable to its source doc) is preserved in the comments above each
 * constant. See ISS-XXX in docs/implementation/ISSUES.md.
 *
 * Run: `pnpm --filter @rogikotha/i18n port`. Deterministic and idempotent —
 * running it twice produces byte-identical output (the acceptance check
 * `git status --porcelain packages/i18n/messages` must be empty after a
 * second run).
 */

/* eslint-disable no-undef, no-console --
 * Node CLI script printing a rename/removal audit trail; see
 * check-parity.mjs for why. ASSUMPTION(T-006).
 */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const dataJsPath = path.join(repoRoot, 'ui-design-prototype/shared/rogikotha-data.js');
const app04bPath = path.join(
  repoRoot,
  'ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal/app.js',
);
const messagesDir = path.join(__dirname, '../messages');

/* ------------------------------------------------------------------ *
 * 1. Prototype strings (RK.strings)
 * ------------------------------------------------------------------ */

function loadPrototypeStrings() {
  const src = fs.readFileSync(dataJsPath, 'utf8');
  const context = {
    window: {},
    document: { querySelectorAll: () => [] },
    localStorage: { getItem: () => null, setItem() {} },
    console,
  };
  vm.createContext(context);
  vm.runInContext(src, context, { filename: 'rogikotha-data.js' });
  const RK = context.window.RK;
  if (!RK || !RK.strings) {
    throw new Error('RK.strings not found after evaluating rogikotha-data.js');
  }
  return RK.strings;
}

/* ------------------------------------------------------------------ *
 * 2. Viewer strings (04b VIEWER_STRINGS), namespaced under viewer.*
 * ------------------------------------------------------------------ */

function extractBalancedObjectLiteral(source, startMarker) {
  const markerIndex = source.indexOf(startMarker);
  if (markerIndex === -1) {
    throw new Error(`marker not found in source: ${startMarker}`);
  }
  const braceStart = source.indexOf('{', markerIndex);
  let depth = 0;
  let i = braceStart;
  for (; i < source.length; i += 1) {
    const ch = source[i];
    if (ch === '{') depth += 1;
    else if (ch === '}') {
      depth -= 1;
      if (depth === 0) {
        i += 1;
        break;
      }
    }
  }
  return source.slice(braceStart, i);
}

function loadViewerStrings() {
  const src = fs.readFileSync(app04bPath, 'utf8');
  const literal = extractBalancedObjectLiteral(src, 'var VIEWER_STRINGS = ');
  const context = {};
  vm.createContext(context);
  return vm.runInContext(`(${literal})`, context, { filename: 'viewer-strings.js' });
}

/* ------------------------------------------------------------------ *
 * 3. Admin NAV_GROUPS labels (admin/app.js ~line 199-209)
 * ------------------------------------------------------------------ */

const NAV_GROUP_LABELS = {
  'admin.nav.casework': { en: 'Casework', bn: 'কেসের কাজ' },
  'admin.nav.oversight': { en: 'Oversight', bn: 'তদারকি' },
};

/* ------------------------------------------------------------------ *
 * 4. Auth / staff / email copy — docs/design/auth-screens-spec.md §5,
 *    copied verbatim, no rewording.
 * ------------------------------------------------------------------ */

const AUTH_SPEC_KEYS = {
  'auth.kicker': { en: 'Your account', bn: 'আপনার অ্যাকাউন্ট' },
  'auth.signIn': { en: 'Sign in', bn: 'সাইন ইন' },
  'auth.signOut': { en: 'Sign out', bn: 'সাইন আউট' },
  'auth.register.title': { en: 'Create an account', bn: 'অ্যাকাউন্ট খুলুন' },
  'auth.register.lede': {
    en: 'You only need an account to write, react or comment. Reading is open to everyone.',
    bn: 'লিখতে, প্রতিক্রিয়া জানাতে বা মন্তব্য করতেই কেবল অ্যাকাউন্ট লাগে। পড়া সবার জন্য উন্মুক্ত।',
  },
  'auth.register.submit': { en: 'Create account', bn: 'অ্যাকাউন্ট তৈরি করুন' },
  'auth.email': { en: 'Email', bn: 'ইমেইল' },
  'auth.password': { en: 'Password', bn: 'পাসওয়ার্ড' },
  'auth.passwordHint': {
    en: 'At least 10 characters. A sentence you will remember works well.',
    bn: 'কমপক্ষে ১০ অক্ষর। মনে রাখার মতো একটি বাক্য ভালো কাজ করে।',
  },
  'auth.showPassword': { en: 'Show', bn: 'দেখান' },
  'auth.hidePassword': { en: 'Hide', bn: 'লুকান' },
  'auth.username': { en: 'Username', bn: 'ইউজারনেম' },
  'auth.usernameHint': {
    en: '3–24 letters, numbers or underscores. This is permanent and appears on your public accounts unless you choose to be anonymous.',
    bn: '৩–২৪টি অক্ষর, সংখ্যা বা আন্ডারস্কোর। এটি স্থায়ী এবং বেনামী না হলে আপনার প্রকাশিত অভিজ্ঞতায় দেখা যাবে।',
  },
  'auth.displayName': { en: 'Display name', bn: 'প্রদর্শিত নাম' },
  'auth.displayNameHint': {
    en: 'How your name appears. You can change it later.',
    bn: 'আপনার নাম যেভাবে দেখা যাবে। পরে বদলাতে পারবেন।',
  },
  'auth.language': { en: 'Interface language', bn: 'ইন্টারফেসের ভাষা' },
  'auth.ageLabel': {
    en: 'I confirm that I am 18 or older.',
    bn: 'আমি নিশ্চিত করছি যে আমার বয়স ১৮ বা তার বেশি।',
  },
  'auth.termsLabel': {
    en: 'I accept the {terms} and the {privacy}.',
    bn: 'আমি {terms} ও {privacy} মেনে নিচ্ছি।',
  },
  'auth.termsLink': { en: 'Terms', bn: 'শর্তাবলি' },
  'auth.privacyLink': { en: 'Privacy Policy', bn: 'গোপনীয়তা নীতি' },
  'auth.haveAccount': {
    en: 'Already have an account? Sign in',
    bn: 'আগে থেকেই অ্যাকাউন্ট আছে? সাইন ইন করুন',
  },
  'auth.noAccount': { en: 'New here? Create an account', bn: 'নতুন? অ্যাকাউন্ট খুলুন' },
  'auth.forgot': { en: 'Forgot your password?', bn: 'পাসওয়ার্ড ভুলে গেছেন?' },
  'auth.errorSummary': { en: 'Please check the following', bn: 'নিচের বিষয়গুলো দেখে নিন' },
  'auth.verify.title': { en: 'Confirm your email', bn: 'আপনার ইমেইল নিশ্চিত করুন' },
  'auth.verify.body': {
    en: 'We sent a confirmation link to {email}. Open it to finish creating your account.',
    bn: 'আমরা {email}-এ একটি নিশ্চিতকরণ লিংক পাঠিয়েছি। অ্যাকাউন্ট তৈরি শেষ করতে সেটি খুলুন।',
  },
  'auth.verify.expires': {
    en: 'The link expires in 24 hours. You can ask for a new one at any time.',
    bn: 'লিংকটি ২৪ ঘণ্টায় মেয়াদোত্তীর্ণ হবে। যেকোনো সময় নতুন একটি চাইতে পারেন।',
  },
  'auth.verify.resend': { en: 'Send a new link', bn: 'নতুন লিংক পাঠান' },
  'auth.verify.resent': { en: 'A new link is on its way.', bn: 'নতুন লিংক পাঠানো হয়েছে।' },
  'auth.verify.devInbox': {
    en: 'Open the local inbox (development only)',
    bn: 'লোকাল ইনবক্স খুলুন (শুধু ডেভেলপমেন্ট)',
  },
  'auth.verify.done': {
    en: 'Your email is confirmed. You can now write and take part.',
    bn: 'আপনার ইমেইল নিশ্চিত হয়েছে। এখন লিখতে ও অংশ নিতে পারবেন।',
  },
  'auth.verify.expired': {
    en: 'That link has expired or was already used. Ask for a new one below.',
    bn: 'লিংকটির মেয়াদ শেষ বা আগেই ব্যবহার হয়েছে। নিচে নতুন একটি চান।',
  },
  'auth.verifyPending': { en: 'Confirm your email', bn: 'ইমেইল নিশ্চিত করুন' },
  'auth.signIn.title': { en: 'Sign in', bn: 'সাইন ইন' },
  'auth.signIn.lede': {
    en: 'Reading never needs an account. Signing in lets you write, react and follow your own accounts.',
    bn: 'পড়তে কখনো অ্যাকাউন্ট লাগে না। সাইন ইন করলে লিখতে, প্রতিক্রিয়া জানাতে ও নিজের লেখা অনুসরণ করতে পারবেন।',
  },
  'auth.signIn.submit': { en: 'Sign in', bn: 'সাইন ইন করুন' },
  'auth.reset.title': { en: 'Reset your password', bn: 'পাসওয়ার্ড রিসেট করুন' },
  'auth.reset.lede': {
    en: 'Enter your email and we will send a link to choose a new password.',
    bn: 'আপনার ইমেইল দিন, নতুন পাসওয়ার্ড বেছে নেওয়ার লিংক পাঠাব।',
  },
  'auth.reset.submit': { en: 'Send reset link', bn: 'রিসেট লিংক পাঠান' },
  'auth.reset.sent': {
    en: 'If that email has an account, a reset link is on its way. It expires in 1 hour.',
    bn: 'ওই ইমেইলে অ্যাকাউন্ট থাকলে রিসেট লিংক পাঠানো হচ্ছে। এটি ১ ঘণ্টায় মেয়াদোত্তীর্ণ হবে।',
  },
  'auth.reset.newPassword': { en: 'New password', bn: 'নতুন পাসওয়ার্ড' },
  'auth.reset.confirmPassword': { en: 'Confirm new password', bn: 'নতুন পাসওয়ার্ড আবার দিন' },
  'auth.reset.setSubmit': { en: 'Change password', bn: 'পাসওয়ার্ড বদলান' },
  'auth.reset.done': {
    en: 'Password changed. You have been signed out everywhere; sign in again.',
    bn: 'পাসওয়ার্ড বদলানো হয়েছে। সব জায়গা থেকে সাইন আউট করা হয়েছে; আবার সাইন ইন করুন।',
  },
  'auth.reset.mismatch': { en: 'The two passwords do not match.', bn: 'দুটি পাসওয়ার্ড মিলছে না।' },
  'auth.security.nav': { en: 'Security', bn: 'নিরাপত্তা' },
  'auth.security.title': { en: 'Security', bn: 'নিরাপত্তা' },
  'auth.security.email': { en: 'Email', bn: 'ইমেইল' },
  'auth.security.emailNote': {
    en: 'Changing your email is not available yet.',
    bn: 'ইমেইল বদলানো এখনো চালু হয়নি।',
  },
  'auth.security.verified': { en: 'Confirmed', bn: 'নিশ্চিত' },
  'auth.security.unverified': { en: 'Not confirmed', bn: 'নিশ্চিত হয়নি' },
  'auth.security.password': { en: 'Password', bn: 'পাসওয়ার্ড' },
  'auth.security.currentPassword': { en: 'Current password', bn: 'বর্তমান পাসওয়ার্ড' },
  'auth.security.changePassword': { en: 'Change password', bn: 'পাসওয়ার্ড বদলান' },
  'auth.security.passwordChanged': {
    en: 'Password changed. Other devices have been signed out.',
    bn: 'পাসওয়ার্ড বদলানো হয়েছে। অন্য ডিভাইসগুলো সাইন আউট করা হয়েছে।',
  },
  'auth.security.sessions': { en: "Where you're signed in", bn: 'যেসব জায়গায় সাইন ইন আছেন' },
  'auth.security.device': { en: 'Device', bn: 'ডিভাইস' },
  'auth.security.firstSeen': { en: 'First seen', bn: 'প্রথম দেখা' },
  'auth.security.lastSeen': { en: 'Last seen', bn: 'শেষ দেখা' },
  'auth.security.thisDevice': { en: 'This device', bn: 'এই ডিভাইস' },
  'auth.security.signOutAll': { en: 'Sign out everywhere', bn: 'সব জায়গা থেকে সাইন আউট' },
  'auth.security.signOutAllNote': {
    en: 'This signs out every device, including this one.',
    bn: 'এতে এই ডিভাইসসহ সব ডিভাইস সাইন আউট হবে।',
  },
  'auth.gate.title': { en: 'Sign in to take part', bn: 'অংশ নিতে সাইন ইন করুন' },
  'auth.gate.body': {
    en: 'Reactions, comments, bookmarks and reports need a confirmed account so they stay accountable. Reading does not.',
    bn: 'প্রতিক্রিয়া, মন্তব্য, বুকমার্ক ও রিপোর্ট দায়বদ্ধ রাখতে নিশ্চিত অ্যাকাউন্ট লাগে। পড়তে লাগে না।',
  },
  'auth.gate.writeBody': {
    en: 'Sign in with a confirmed account to publish. You can read everything without one.',
    bn: 'প্রকাশ করতে নিশ্চিত অ্যাকাউন্ট দিয়ে সাইন ইন করুন। অ্যাকাউন্ট ছাড়াই সব পড়তে পারবেন।',
  },
  'auth.gate.verifyToPublish': {
    en: 'Confirm your email to publish. Your draft is saved.',
    bn: 'প্রকাশ করতে ইমেইল নিশ্চিত করুন। আপনার খসড়া সংরক্ষিত আছে।',
  },
  'auth.gate.verifyToAct': {
    en: 'Confirm your email to do this.',
    bn: 'এটি করতে ইমেইল নিশ্চিত করুন।',
  },
  'auth.gate.register': { en: 'Create an account', bn: 'অ্যাকাউন্ট খুলুন' },
  'errors.auth.invalidCredentials': {
    en: "That email and password don't match anything we have.",
    bn: 'ওই ইমেইল ও পাসওয়ার্ড আমাদের কিছুর সঙ্গে মিলছে না।',
  },
  'errors.auth.rateLimited': {
    en: 'Too many attempts. Try again in {minutes} minutes.',
    bn: 'অনেকবার চেষ্টা হয়েছে। {minutes} মিনিট পর আবার চেষ্টা করুন।',
  },
  'errors.auth.tokenInvalid': { en: 'That link is not valid.', bn: 'লিংকটি বৈধ নয়।' },
  'errors.auth.tokenExpired': { en: 'That link has expired.', bn: 'লিংকটির মেয়াদ শেষ।' },
  'errors.auth.passwordTooShort': {
    en: 'Password: use at least 10 characters.',
    bn: 'পাসওয়ার্ড: কমপক্ষে ১০ অক্ষর দিন।',
  },
  'errors.auth.usernameTaken': {
    en: "Username: that one is taken.",
    bn: 'ইউজারনেম: এটি আগেই নেওয়া হয়েছে।',
  },
  'errors.auth.usernameInvalid': {
    en: 'Username: use 3–24 lowercase letters, numbers or underscores.',
    bn: 'ইউজারনেম: ৩–২৪টি ছোট হাতের অক্ষর, সংখ্যা বা আন্ডারস্কোর দিন।',
  },
  'errors.auth.ageRequired': {
    en: 'Age: you must confirm that you are 18 or older.',
    bn: 'বয়স: আপনাকে নিশ্চিত করতে হবে যে আপনার বয়স ১৮ বা তার বেশি।',
  },
  'errors.auth.termsRequired': {
    en: 'Terms: you must accept the Terms and the Privacy Policy.',
    bn: 'শর্তাবলি: শর্তাবলি ও গোপনীয়তা নীতি মেনে নিতে হবে।',
  },
  'errors.auth.emailUnverified': {
    en: 'Confirm your email first.',
    bn: 'আগে ইমেইল নিশ্চিত করুন।',
  },
  'errors.auth.accountSuspended': {
    en: 'This account is suspended. You can appeal from your workspace.',
    bn: 'এই অ্যাকাউন্ট স্থগিত। আপনার ওয়ার্কস্পেস থেকে আপিল করতে পারেন।',
  },
  'errors.auth.stepUpRequired': {
    en: 'Confirm your password to continue.',
    bn: 'চালিয়ে যেতে পাসওয়ার্ড নিশ্চিত করুন।',
  },
  'staff.signIn.kicker': { en: 'Staff console', bn: 'স্টাফ কনসোল' },
  'staff.signIn.title': { en: 'Sign in', bn: 'সাইন ইন' },
  'staff.signIn.submit': { en: 'Sign in', bn: 'সাইন ইন করুন' },
  'staff.signIn.note': {
    en: 'Staff only. Looking for RogiKotha? Go to the public site.',
    bn: 'শুধু স্টাফের জন্য। রোগীকথা খুঁজছেন? পাবলিক সাইটে যান।',
  },
  'staff.notStaff': {
    en: 'This account has no staff role.',
    bn: 'এই অ্যাকাউন্টের কোনো স্টাফ ভূমিকা নেই।',
  },
  'staff.device.title': { en: 'Approve this device', bn: 'এই ডিভাইস অনুমোদন করুন' },
  'staff.device.body': {
    en: 'We sent an approval link to your staff email. It expires in 30 minutes. Open it on this device.',
    bn: 'আপনার স্টাফ ইমেইলে অনুমোদনের লিংক পাঠিয়েছি। এটি ৩০ মিনিটে মেয়াদোত্তীর্ণ হবে। এই ডিভাইসেই সেটি খুলুন।',
  },
  'staff.device.recheck': {
    en: 'Confirm your password to trust this device',
    bn: 'এই ডিভাইস বিশ্বাস করতে পাসওয়ার্ড নিশ্চিত করুন',
  },
  'staff.device.trust': { en: 'Trust this device', bn: 'এই ডিভাইস বিশ্বাস করুন' },
  'staff.device.thisDevice': { en: 'This device', bn: 'এই ডিভাইস' },
  'staff.device.revoke': { en: 'Revoke', bn: 'বাতিল করুন' },
  'staff.device.revoked': { en: 'Device revoked.', bn: 'ডিভাইস বাতিল করা হয়েছে।' },
  'staff.device.trusted': { en: 'Trusted devices', bn: 'বিশ্বস্ত ডিভাইস' },
  'staff.security.title': { en: 'Security', bn: 'নিরাপত্তা' },
  'staff.stepUp.title': { en: 'Confirm your password', bn: 'পাসওয়ার্ড নিশ্চিত করুন' },
  'staff.stepUp.body': {
    en: "This action is logged. Enter your password to continue — you won't be asked again for five minutes.",
    bn: 'এই কাজটি লগ করা হয়। চালিয়ে যেতে পাসওয়ার্ড দিন — পাঁচ মিনিটের মধ্যে আবার জিজ্ঞাসা করা হবে না।',
  },
  'staff.stepUp.confirm': { en: 'Continue', bn: 'চালিয়ে যান' },
  'staff.role.chipTitle': { en: 'Signed in as {role}', bn: '{role} হিসেবে সাইন ইন' },
  'email.verify.subject': {
    en: 'Confirm your RogiKotha email',
    bn: 'আপনার রোগীকথা ইমেইল নিশ্চিত করুন',
  },
  'email.verify.body': {
    en: 'Open this link within 24 hours to confirm your email: {link}',
    bn: 'ইমেইল নিশ্চিত করতে ২৪ ঘণ্টার মধ্যে এই লিংক খুলুন: {link}',
  },
  'email.reset.subject': {
    en: 'Reset your RogiKotha password',
    bn: 'আপনার রোগীকথা পাসওয়ার্ড রিসেট করুন',
  },
  'email.reset.body': {
    en: 'Someone asked to reset the password for this email. If it was you, open this link within 1 hour: {link}. If not, you can ignore this message.',
    bn: 'কেউ এই ইমেইলের পাসওয়ার্ড রিসেট করতে চেয়েছে। আপনি হলে ১ ঘণ্টার মধ্যে এই লিংক খুলুন: {link}। না হলে এই বার্তা উপেক্ষা করতে পারেন।',
  },
  'email.existing.subject': {
    en: 'Someone tried to register with your email',
    bn: 'কেউ আপনার ইমেইল দিয়ে নিবন্ধন করতে চেয়েছে',
  },
  'email.existing.body': {
    en: 'An account with this email already exists. If that was you, sign in instead: {link}. If not, no action is needed.',
    bn: 'এই ইমেইলে আগে থেকেই অ্যাকাউন্ট আছে। আপনি হলে সাইন ইন করুন: {link}। না হলে কিছু করার দরকার নেই।',
  },
  'email.security.passwordChanged.subject': {
    en: 'Your RogiKotha password was changed',
    bn: 'আপনার রোগীকথা পাসওয়ার্ড বদলানো হয়েছে',
  },
  'email.security.passwordChanged.body': {
    en: "Your password was changed and other devices were signed out. If this wasn't you, reset your password now: {link}",
    bn: 'আপনার পাসওয়ার্ড বদলানো হয়েছে এবং অন্য ডিভাইসগুলো সাইন আউট করা হয়েছে। আপনি না হলে এখনই পাসওয়ার্ড রিসেট করুন: {link}',
  },
  'email.staff.deviceApproval.subject': {
    en: 'Approve a new device for the staff console',
    bn: 'স্টাফ কনসোলের জন্য নতুন ডিভাইস অনুমোদন করুন',
  },
  'email.staff.deviceApproval.body': {
    en: "A sign-in to the staff console was attempted from a device we haven't seen. If that was you, open this link on that device within 30 minutes: {link}. If not, tell the Super Admin.",
    bn: 'অপরিচিত একটি ডিভাইস থেকে স্টাফ কনসোলে সাইন ইনের চেষ্টা হয়েছে। আপনি হলে ৩০ মিনিটের মধ্যে ওই ডিভাইসে এই লিংক খুলুন: {link}। না হলে সুপার অ্যাডমিনকে জানান।',
  },
};

/* ------------------------------------------------------------------ *
 * 5. errors.* for the ErrorCode union (03-routes-and-contracts.md §2)
 *    that the auth spec table above does not already cover. Field-first,
 *    <=12 words each, real Bengali (not transliteration).
 * ------------------------------------------------------------------ */

const ERROR_CODE_KEYS = {
  'errors.auth.deviceUnapproved': {
    en: 'This device is not approved yet. Check your staff email.',
    bn: 'এই ডিভাইসটি এখনও অনুমোদিত নয়। আপনার স্টাফ ইমেইল দেখুন।',
  },
  'errors.common.forbidden': {
    en: "You don't have permission to do this.",
    bn: 'এটি করার অনুমতি আপনার নেই।',
  },
  'errors.common.notFound': { en: "We couldn't find that.", bn: 'এটি খুঁজে পাওয়া যায়নি।' },
  'errors.common.conflict': {
    en: 'Someone else changed this first. Please refresh and try again.',
    bn: 'অন্য কেউ আগে এটি বদলেছে। রিফ্রেশ করে আবার চেষ্টা করুন।',
  },
  'errors.common.validation': {
    en: 'Please check the highlighted fields.',
    bn: 'চিহ্নিত ঘরগুলো আবার দেখুন।',
  },
  'errors.common.rateLimited': {
    en: 'Too many attempts. Try again in {minutes} minutes.',
    bn: 'অনেকবার চেষ্টা হয়েছে। {minutes} মিনিট পর আবার চেষ্টা করুন।',
  },
  'errors.common.internal': {
    en: 'Something went wrong on our side. Please try again.',
    bn: 'আমাদের দিক থেকে একটি সমস্যা হয়েছে। আবার চেষ্টা করুন।',
  },
  'errors.review.minFields': {
    en: 'Add a doctor and at least a short experience first.',
    bn: 'প্রথমে একজন ডাক্তার ও অন্তত সংক্ষিপ্ত অভিজ্ঞতা যোগ করুন।',
  },
  'errors.review.attestationRequired': {
    en: 'Confirm this experience is genuinely yours before publishing.',
    bn: 'প্রকাশের আগে নিশ্চিত করুন এই অভিজ্ঞতা সত্যিই আপনার।',
  },
  'errors.review.notEditable': {
    en: 'This experience can no longer be edited.',
    bn: 'এই অভিজ্ঞতা আর সম্পাদনা করা যাবে না।',
  },
  'errors.review.restoreExpired': {
    en: 'The 30-day window to restore this has passed.',
    bn: 'এটি ফিরিয়ে আনার ৩০ দিনের সময় শেষ হয়েছে।',
  },
  'errors.evidence.tooMany': {
    en: 'You can attach up to 10 files per draft.',
    bn: 'প্রতিটি খসড়ায় সর্বোচ্চ ১০টি ফাইল যুক্ত করা যায়।',
  },
  'errors.evidence.tooLarge': {
    en: 'Each file must be 15 MB or smaller.',
    bn: 'প্রতিটি ফাইল ১৫ এমবি বা তার কম হতে হবে।',
  },
  'errors.evidence.totalTooLarge': {
    en: 'All files together must stay under 100 MB.',
    bn: 'সব ফাইল মিলিয়ে ১০০ এমবির নিচে রাখতে হবে।',
  },
  'errors.evidence.typeRejected': {
    en: 'Only JPG and PNG images are accepted.',
    bn: 'শুধু JPG ও PNG ছবি গ্রহণযোগ্য।',
  },
  'errors.evidence.notPreviewable': {
    en: 'This file could not be prepared for preview.',
    bn: 'এই ফাইলের প্রিভিউ তৈরি করা যায়নি।',
  },
  'errors.evidence.confirmationRequired': {
    en: 'Confirm this file is safe to attach before publishing.',
    bn: 'প্রকাশের আগে নিশ্চিত করুন ফাইলটি যুক্ত করা নিরাপদ।',
  },
  'errors.community.replyDepth': {
    en: 'Replies can only go one level deep here.',
    bn: 'এখানে মন্তব্যের উত্তর শুধু এক স্তর পর্যন্ত যায়।',
  },
  'errors.community.blocked': {
    en: "You can't reply to this account.",
    bn: 'এই অ্যাকাউন্টকে উত্তর দেওয়া যাবে না।',
  },
  'errors.community.mentionAnonymous': {
    en: "Anonymous authors can't be @mentioned.",
    bn: 'বেনামী লেখকদের @মেনশন করা যায় না।',
  },
  'errors.moderation.duplicateReport': {
    en: "You already reported this. We'll review it once.",
    bn: 'আপনি ইতিমধ্যে এটি রিপোর্ট করেছেন। একবারই পর্যালোচনা হবে।',
  },
  'errors.moderation.narrativeLocked': {
    en: 'Only redaction is allowed here, not other edits.',
    bn: 'এখানে শুধু তথ্য ঢাকা যাবে, অন্য সম্পাদনা নয়।',
  },
  'errors.moderation.selfAppealReview': {
    en: 'The original decision-maker cannot review this appeal.',
    bn: 'মূল সিদ্ধান্তদাতা এই আপিল পর্যালোচনা করতে পারবেন না।',
  },
  'errors.config.invariant': {
    en: "That setting isn't recognised. Nothing was changed.",
    bn: 'এই সেটিং শনাক্ত করা যায়নি। কিছু বদলানো হয়নি।',
  },
  'errors.config.outOfRange': {
    en: 'That value is outside the allowed range.',
    bn: 'মানটি অনুমোদিত সীমার বাইরে।',
  },
  'errors.retention.previewDrift': {
    en: 'The affected items changed since preview. Review again.',
    bn: 'প্রিভিউয়ের পর প্রভাবিত আইটেম বদলেছে। আবার দেখুন।',
  },
  'errors.hold.active': {
    en: "This item is on hold and can't be changed.",
    bn: 'এই আইটেমটি হোল্ডে আছে, বদলানো যাবে না।',
  },
};

/* ------------------------------------------------------------------ *
 * 6. Addendum keys — docs/implementation/tasks/T-006-i18n.md, bottom
 *    section "Addendum — keys the other task writers found missing".
 *    Literal EN text where a source doc gave one (cited in comments);
 *    // ASSUMPTION(T-006) where this script had to write both languages.
 * ------------------------------------------------------------------ */

const ADDENDUM_KEYS = {
  // Six report reasons; EN wording from docs/scope-of-work.md §6.
  'report.harassment': { en: 'Harassment', bn: 'হয়রানি' },
  'report.hate': { en: 'Hate', bn: 'ঘৃণা' },
  'report.ownership': { en: 'Ownership', bn: 'মালিকানা' },
  'report.duplicate': { en: 'Duplicate', bn: 'পুনরাবৃত্তি' },
  'report.offtopic': { en: 'Off-topic', bn: 'অপ্রাসঙ্গিক' },
  'report.other': { en: 'Other', bn: 'অন্যান্য' },

  // Inline literals the prototype never keyed (T-202/T-207); EN text and key
  // names are copied from docs/implementation/tasks/T-202-doctor-index-and-profile.md
  // step 2 and docs/implementation/tasks/T-207-discover-emergency-about.md,
  // which already pinned both languages verbatim.
  'discover.kicker': { en: 'Bangladesh · Public beta', bn: 'বাংলাদেশ · পাবলিক বেটা' },
  'discover.editorialNote': { en: 'Editorial note', bn: 'সম্পাদকীয় নোট' },
  'discover.latest': { en: 'From the latest accounts', bn: 'সাম্প্রতিক বিবরণ' },
  'label.documentsWord': { en: 'documents', bn: 'কাগজপত্র' },
  'filter.gender.female': { en: 'Female', bn: 'নারী' },
  'filter.gender.male': { en: 'Male', bn: 'পুরুষ' },
  'profile.total': { en: 'Total', bn: 'মোট' },
  'emergency.ambulanceLabel': { en: 'Ambulance', bn: 'অ্যাম্বুলেন্স' },
  'emergency.healthLineLabel': { en: 'Health guidance', bn: 'স্বাস্থ্য পরামর্শ' },
  'experience.publishedLabel': { en: 'Published', bn: 'প্রকাশ' },
  // shell.placeholder: wording pinned by docs/implementation/tasks/T-008-web-shell.md step 14.
  'shell.placeholder': {
    en: 'This screen arrives with task {task}.',
    bn: 'এই স্ক্রিনটি টাস্ক {task}-এ আসবে।',
  },
  // notif.*: five keys named (not worded) by T-007 step 6. Templates below are
  // generalisations of RK.user.notifications' n1-n5 free text into parameterised
  // messageKeys. ASSUMPTION(T-006): exact wording is this implementer's call;
  // logged as ISS-XXX for the founder's bilingual review.
  'notif.evidenceReady': {
    en: 'Your {label} finished processing and is now attached to your experience.',
    bn: 'আপনার {label} প্রক্রিয়াকরণ শেষ হয়েছে এবং এখন আপনার অভিজ্ঞতায় যুক্ত হয়েছে।',
  },
  'notif.replyReceived': {
    en: '{name} commented on your experience.',
    bn: '{name} আপনার অভিজ্ঞতায় মন্তব্য করেছেন।',
  },
  'notif.moderationOutcome': {
    en: 'A comment on your experience was {action}. Your experience was not affected.',
    bn: 'আপনার অভিজ্ঞতার একটি মন্তব্য {action} হয়েছে। আপনার অভিজ্ঞতায় কোনো প্রভাব পড়েনি।',
  },
  'notif.securityNewDevice': {
    en: 'New sign-in from a device in {city}. If this was not you, change your password.',
    bn: '{city}-এ একটি ডিভাইস থেকে নতুন সাইন-ইন হয়েছে। এটি আপনি না হলে পাসওয়ার্ড বদলান।',
  },
  'notif.draftExpiring': {
    en: 'A draft will be removed in {days} days if you do not finish it.',
    bn: 'একটি খসড়া {days} দিনে মুছে যাবে, যদি শেষ না করেন।',
  },

  // Product version of aboutview.contactBody; wording pinned by
  // docs/implementation/tasks/T-207-discover-emergency-about.md step 2.
  // aboutview.contactBody itself is kept unchanged and unused per the task.
  'aboutview.contactBodyProduct': {
    en: 'Email: hello@rogikotha.example. For real emergencies, do not use this site.',
    bn: 'ইমেইল: hello@rogikotha.example। প্রকৃত জরুরি অবস্থায় এই সাইট ব্যবহার করবেন না।',
  },

  // admin.config.* additions from docs/implementation/tasks/T-408-staff-notifications-and-config.md
  // (Owned paths list + steps 4-7); wording is this implementer's call
  // (ASSUMPTION(T-006), logged as ISS-XXX) since T-408 named keys, not copy.
  'admin.config.threshold.appealDays': {
    en: 'Appeal window (days)',
    bn: 'আপিলের সময়সীমা (দিন)',
  },
  'admin.config.threshold.limitedData': {
    en: 'Limited-data threshold',
    bn: 'সীমিত তথ্যের সীমা',
  },
  'admin.config.retention.auditDays': {
    en: 'Audit log retention (days)',
    bn: 'অডিট লগ সংরক্ষণ (দিন)',
  },
  'admin.config.retention.notificationDays': {
    en: 'Notification retention (days)',
    bn: 'বিজ্ঞপ্তি সংরক্ষণ (দিন)',
  },
  'admin.config.apply': { en: 'Apply', bn: 'প্রয়োগ করুন' },
  'admin.config.reason': { en: 'Reason', bn: 'কারণ' },
  'admin.config.history': { en: 'Version history', bn: 'সংস্করণ ইতিহাস' },
  'admin.config.version': { en: 'Version {n}', bn: 'সংস্করণ {n}' },
  'admin.config.rollback': { en: 'Roll back to this version', bn: 'এই সংস্করণে ফিরে যান' },
  'admin.config.rolledBackFrom': {
    en: 'Rolled back from version {n}',
    bn: 'সংস্করণ {n} থেকে ফিরিয়ে আনা হয়েছে',
  },
  'admin.config.conflict': {
    en: 'Someone else changed the configuration; review the new values.',
    bn: 'অন্য কেউ কনফিগারেশন বদলেছে; নতুন মান পর্যালোচনা করুন।',
  },
  'admin.config.readOnly': {
    en: 'Read-only. You do not have permission to change these values.',
    bn: 'শুধু দেখার জন্য। এই মান বদলানোর অনুমতি আপনার নেই।',
  },
  // admin.config.reasons is a namespace conflict with admin.config.reasons.fixed
  // below; conflict resolution renames it to admin.config.reasons.label.
  'admin.config.reasons': { en: 'Report reasons', bn: 'রিপোর্টের কারণ' },
  'admin.config.reasons.fixed': {
    en: 'This reason cannot be turned off.',
    bn: 'এই কারণটি বন্ধ করা যাবে না।',
  },
  'admin.config.capabilities.note': {
    en: 'Super Admin capabilities are fixed and cannot be changed here.',
    bn: 'সুপার অ্যাডমিনের ক্ষমতা নির্দিষ্ট, এখানে বদলানো যায় না।',
  },
  'admin.config.outOfRange': {
    en: 'That value is outside the allowed range.',
    bn: 'মানটি অনুমোদিত সীমার বাইরে।',
  },
  'admin.notif.empty': { en: 'No notifications yet.', bn: 'এখনো কোনো বিজ্ঞপ্তি নেই।' },
};

/* ------------------------------------------------------------------ *
 * Reword + removals (task Step 3)
 * ------------------------------------------------------------------ */

const REWORDED = {
  'demo.banner': {
    en: 'Demo — fictional records, not a real service',
    bn: 'ডেমো — কাল্পনিক তথ্য, বাস্তব সেবা নয়',
  },
};

const REMOVED_EXACT = [
  'demo.reset',
  'demo.close',
  'demo.roleNote',
  'demo.title',
  'write.signinTitle',
  'write.signinBody',
  'concept.back',
  'admin.backToGallery',
  'admin.role.current',
  'admin.role.currentTitle',
  'admin.act.cycleTip',
  'admin.demoNote',
];
const REMOVED_PREFIXES = ['demo.role.', 'demo.scheme'];

/* ------------------------------------------------------------------ *
 * Merge, reword, remove, resolve conflicts, write.
 * ------------------------------------------------------------------ */

function setNested(obj, dottedKey, value) {
  const parts = dottedKey.split('.');
  let node = obj;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i];
    if (typeof node[part] !== 'object' || node[part] === null) {
      node[part] = {};
    }
    node = node[part];
  }
  node[parts[parts.length - 1]] = value;
}

function writeJson(filePath, obj) {
  const json = `${JSON.stringify(obj, null, 2)}\n`;
  fs.writeFileSync(filePath, json, 'utf8');
}

function main() {
  const prototypeStrings = loadPrototypeStrings();
  const viewerStrings = loadViewerStrings();

  /** @type {Record<string, {en: string, bn: string}>} */
  const flat = {};
  for (const [k, v] of Object.entries(prototypeStrings)) flat[k] = v;
  for (const [k, v] of Object.entries(viewerStrings)) flat[`viewer.${k}`] = v;
  for (const [k, v] of Object.entries(NAV_GROUP_LABELS)) flat[k] = v;
  for (const [k, v] of Object.entries(AUTH_SPEC_KEYS)) flat[k] = v;
  for (const [k, v] of Object.entries(ERROR_CODE_KEYS)) flat[k] = v;
  for (const [k, v] of Object.entries(ADDENDUM_KEYS)) flat[k] = v;

  for (const [k, v] of Object.entries(REWORDED)) flat[k] = v;

  const removed = [];
  for (const k of Object.keys(flat)) {
    const isExact = REMOVED_EXACT.includes(k);
    const isPrefixed = REMOVED_PREFIXES.some((prefix) => k.startsWith(prefix));
    if (isExact || isPrefixed) {
      removed.push(k);
      delete flat[k];
    }
  }
  removed.sort();
  console.log(`Removed ${removed.length} keys (demo panel / scheme picker / role switcher):`);
  for (const k of removed) console.log(`  - ${k}`);

  // Leaf-vs-namespace conflicts: a key that is both a leaf string and the
  // prefix of at least one other key is renamed to `<key>.label`.
  const renames = [];
  let changed = true;
  while (changed) {
    changed = false;
    const keys = Object.keys(flat);
    for (const k of keys) {
      const hasChildren = keys.some((other) => other !== k && other.startsWith(`${k}.`));
      if (hasChildren) {
        const newKey = `${k}.label`;
        if (Object.prototype.hasOwnProperty.call(flat, newKey)) {
          throw new Error(`rename target already exists: ${newKey} (from ${k})`);
        }
        flat[newKey] = flat[k];
        delete flat[k];
        renames.push([k, newKey]);
        changed = true;
        break;
      }
    }
  }
  renames.sort((a, b) => a[0].localeCompare(b[0]));
  console.log(`Renamed ${renames.length} leaf/namespace conflicts:`);
  for (const [from, to] of renames) console.log(`  - ${from} -> ${to}`);

  for (const [k, v] of Object.entries(flat)) {
    if (!v || typeof v.en !== 'string' || typeof v.bn !== 'string') {
      throw new Error(`key "${k}" does not have string {en, bn}: ${JSON.stringify(v)}`);
    }
    if (v.en.trim() === '' || v.bn.trim() === '') {
      throw new Error(`key "${k}" has an empty en or bn value`);
    }
  }

  const sortedKeys = Object.keys(flat).sort();
  const en = {};
  const bn = {};
  for (const k of sortedKeys) {
    setNested(en, k, flat[k].en);
    setNested(bn, k, flat[k].bn);
  }

  fs.mkdirSync(messagesDir, { recursive: true });
  writeJson(path.join(messagesDir, 'en.json'), en);
  writeJson(path.join(messagesDir, 'bn.json'), bn);

  console.log(`Wrote ${sortedKeys.length} keys to messages/en.json and messages/bn.json`);
}

main();
