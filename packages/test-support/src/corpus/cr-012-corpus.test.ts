// CR-012 (FD-039, FD-089): proves in the default sweep, without a database,
// that the regenerated corpus matches the prototype and that the five port
// rules CR-012 changed hold (BR1.3, BR1.5, BR2.2–BR2.6).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

import { describe, expect, it } from 'vitest';

import {
  ACCOUNTS,
  ALIASES,
  BRANCHES,
  COMMENTS,
  CONDITIONS,
  DOCTORS,
  EVIDENCE_ITEMS,
  FACILITY_ORGS,
  FACILITY_REVIEWS,
  FOLLOW_UPS,
  MODERATION_AUDIT_LOG,
  MODERATION_CASES,
  PERSONAS,
  PROVIDER_CLAIMS,
  PROVIDER_FIELD_CHANGES,
  PROVIDER_SUBMISSIONS,
  REVIEWS,
  STAFF_NOTIFICATIONS,
  USER_BOOKMARKS,
  USER_DRAFTS,
  USER_NOTIFICATIONS,
} from './index.js';

interface PrototypeReview {
  id: string;
  identity: string;
  followUp?: unknown;
}

interface Prototype {
  doctors: unknown[];
  conditions: { aliases: string[] }[];
  facilities: { id: string; parent?: { en: string } }[];
  reviews: PrototypeReview[];
  facilityReviews: unknown[];
  comments: unknown[];
  evidence: unknown[];
  followUps: Record<string, unknown[]>;
  laterCare: Record<string, unknown>;
  user: { notifications: unknown[]; drafts: unknown[]; bookmarks: string[] };
  moderation: {
    cases: unknown[];
    auditLog: unknown[];
    notifications: unknown[];
    providers: { pending: unknown[]; claims: unknown[]; fieldChanges: unknown[] };
  };
}

/** Evaluates the prototype data file read-only, the way `scripts/port-corpus.mjs` does. */
function loadPrototype(): Prototype {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const file = path.resolve(
    here,
    '..',
    '..',
    '..',
    '..',
    'ui-design-prototype',
    'shared',
    'rogikotha-data.js',
  );
  const context: { window: { RK?: Prototype }; document: { querySelectorAll: () => [] } } = {
    window: {},
    document: { querySelectorAll: () => [] },
  };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync(file, 'utf8'), context, { filename: 'rogikotha-data.js' });
  if (!context.window.RK) throw new Error('RK not found after evaluating rogikotha-data.js');
  return context.window.RK;
}

const RK = loadPrototype();

/** The prototype's own `followUpsFor` reading: a review's chain, else its inline follow-up. */
function prototypeFollowUpCount(): number {
  return RK.reviews.reduce((n, r) => n + (RK.followUps[r.id]?.length ?? (r.followUp ? 1 : 0)), 0);
}

describe('CR-012 corpus against the prototype', () => {
  it('holds exactly as many records per collection as the prototype', () => {
    const organisations = new Set(
      RK.facilities.map((f) => (f.parent ? `parent:${f.parent.en}` : f.id)),
    );
    const followUps = FOLLOW_UPS.filter((f) => f.kind === 'follow_up');
    const laterCare = FOLLOW_UPS.filter((f) => f.kind === 'later_care');
    expect({
      doctors: DOCTORS.length,
      conditions: CONDITIONS.length,
      aliases: ALIASES.length,
      organisations: FACILITY_ORGS.length,
      branches: BRANCHES.length,
      reviews: REVIEWS.length,
      followUps: followUps.length,
      laterCare: laterCare.length,
      facilityReviews: FACILITY_REVIEWS.length,
      comments: COMMENTS.length,
      evidence: EVIDENCE_ITEMS.length,
      cases: MODERATION_CASES.length,
      auditRows: MODERATION_AUDIT_LOG.length,
      staffNotifications: STAFF_NOTIFICATIONS.length,
      userNotifications: USER_NOTIFICATIONS.length,
      drafts: USER_DRAFTS.length,
      bookmarks: USER_BOOKMARKS.length,
      submissions: PROVIDER_SUBMISSIONS.length,
      claims: PROVIDER_CLAIMS.length,
      fieldChanges: PROVIDER_FIELD_CHANGES.length,
    }).toEqual({
      doctors: RK.doctors.length,
      conditions: RK.conditions.length,
      aliases: RK.conditions.reduce((n, c) => n + c.aliases.length, 0),
      organisations: organisations.size,
      branches: RK.facilities.length,
      reviews: RK.reviews.length,
      followUps: prototypeFollowUpCount(),
      laterCare: Object.keys(RK.laterCare).length,
      facilityReviews: RK.facilityReviews.length,
      comments: RK.comments.length,
      evidence: RK.evidence.length,
      cases: RK.moderation.cases.length,
      auditRows: RK.moderation.auditLog.length,
      staffNotifications: RK.moderation.notifications.length,
      userNotifications: RK.user.notifications.length,
      drafts: RK.user.drafts.length,
      bookmarks: RK.user.bookmarks.length,
      submissions: RK.moderation.providers.pending.length,
      claims: RK.moderation.providers.claims.length,
      fieldChanges: RK.moderation.providers.fieldChanges.length,
    });
  });

  it('holds about ten records or more in every FD-089 collection', () => {
    for (const [name, n] of Object.entries({
      doctors: DOCTORS.length,
      branches: BRANCHES.length,
      conditions: CONDITIONS.length,
      reviews: REVIEWS.length,
      facilityReviews: FACILITY_REVIEWS.length,
      comments: COMMENTS.length,
      evidence: EVIDENCE_ITEMS.length,
      followUpsAndLaterCare: FOLLOW_UPS.length,
      cases: MODERATION_CASES.length,
    })) {
      expect(n, name).toBeGreaterThanOrEqual(10);
    }
  });

  it('keeps n8 in the corpus, so only the seed withholds it, by name, under FD-086', () => {
    // The seed's FD-086 exclusion is the one recorded difference between the
    // prototype and the seeded notifications (9 of 10); the port copies all.
    const n8 = USER_NOTIFICATIONS.find((n) => n.seedRef === 'n8');
    expect(n8?.kind).toBe('moderation');
    expect(n8?.text.en).toMatch(/^A report you sent/);
  });

  it('keeps the hue of every persona that existed before FD-089', () => {
    const hues = Object.fromEntries(
      PERSONAS.filter((p) => p.kind !== 'anonymous').map((p) => [p.key, p.avatarHue]),
    );
    expect(hues).toMatchObject({
      'pseudonymous:shirin_88': 77,
      'named:Kamrul Islam': 114,
      'pseudonymous:r_ahmed': 151,
      'pseudonymous:abba_of_two': 188,
      'named:Tanvir Ahmed': 225,
      'pseudonymous:ctg_reader': 262,
      'named:Sultana Begum': 299,
      'pseudonymous:sylhet_nm': 336,
      'pseudonymous:mirpur_11': 13,
      'pseudonymous:nadia_k': 50,
      'pseudonymous:rumana_h': 87,
      'named:Dr. Farhana Rahman': 124,
      'pseudonymous:health_tips_bd': 161,
      'pseudonymous:shafiq_ctg': 198,
    });
  });

  it('has exactly one anonymous persona per thread that carries anonymous content, and no other', () => {
    const threads = new Set([
      ...REVIEWS.filter((r) => r.identity === 'anon').map((r) => `anon:${r.seedRef}`),
      ...COMMENTS.filter((c) => c.identity === 'anon').map((c) => `anon:${c.reviewSeedRef}`),
      ...FACILITY_REVIEWS.filter((f) => f.identity === 'anon').map((f) => `anon:${f.seedRef}`),
    ]);
    const anonKeys = PERSONAS.filter((p) => p.kind === 'anonymous').map((p) => p.key);
    expect([...anonKeys].sort()).toEqual([...threads].sort());
    expect(new Set(anonKeys).size).toBe(anonKeys.length);
    const accounts = PERSONAS.filter((p) => p.kind === 'anonymous').map((p) => p.accountUsername);
    expect(new Set(accounts).size).toBe(accounts.length);
    expect(new Set(ACCOUNTS.map((a) => a.username)).size).toBe(ACCOUNTS.length);
  });

  it("lets r15's anonymous comment k31 reuse r15's own persona and account", () => {
    const r15Personas = PERSONAS.filter((p) => p.key === 'anon:r15');
    expect(r15Personas).toHaveLength(1);
    expect(r15Personas[0]).toMatchObject({
      reviewSeedRef: 'r15',
      accountUsername: 'anon_author_r15',
    });
    expect(REVIEWS.find((r) => r.seedRef === 'r15')?.identity).toBe('anon');
    expect(COMMENTS.find((c) => c.seedRef === 'k31')).toMatchObject({
      reviewSeedRef: 'r15',
      identity: 'anon',
    });
  });

  it("does not make anon_author_r4 the author of r4, which is r_ahmed's pseudonymous review", () => {
    const r4 = REVIEWS.find((r) => r.seedRef === 'r4');
    expect(r4).toMatchObject({ identity: 'pseudo', author: { en: 'r_ahmed' } });
    expect(PERSONAS.find((p) => p.key === 'pseudonymous:r_ahmed')?.accountUsername).toBe('r_ahmed');
    const anonR4Content = COMMENTS.filter(
      (c) => c.identity === 'anon' && c.reviewSeedRef === 'r4',
    ).map((c) => c.seedRef);
    expect(anonR4Content).toEqual(['k16']);
  });

  it('classifies the four Latin-script Bengali aliases as Banglish and no others', () => {
    const banglish = ALIASES.filter((a) => a.lang === 'banglish').map((a) => a.alias);
    expect([...banglish].sort()).toEqual(['chulkani', 'dayabetis', 'mathabatha', 'shash']);
  });

  it("ports r17's and r24's inline follow-ups, which have no chain of their own", () => {
    const inline = FOLLOW_UPS.filter((f) => f.seedRef === 'r17-fu-1' || f.seedRef === 'r24-fu-1');
    expect(inline.map((f) => [f.seedRef, f.reviewSeedRef, f.kind])).toEqual([
      ['r17-fu-1', 'r17', 'follow_up'],
      ['r24-fu-1', 'r24', 'follow_up'],
    ]);
  });

  it("ports shirin_88's bookmarks in prototype order", () => {
    expect(USER_BOOKMARKS.map((b) => b.reviewSeedRef)).toEqual(RK.user.bookmarks);
    expect(new Set(USER_BOOKMARKS.map((b) => b.accountUsername))).toEqual(new Set(['shirin_88']));
  });
});
