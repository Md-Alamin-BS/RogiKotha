#!/usr/bin/env node
/*
 * Port `ui-design-prototype/shared/rogikotha-data.js` (`RK`) into the typed
 * synthetic corpus under `packages/test-support/src/corpus/`.
 *
 * Same `vm` trick as `packages/i18n/scripts/port-from-prototype.mjs`: the
 * prototype file is an IIFE that attaches `global.RK = {...}` when called
 * with a `window` object, so it is evaluated in a throwaway `vm` context
 * with a stub `window`.
 *
 * Emits both the literal collections (task step 2 — "verbatim", bilingual
 * pairs intact) and the derived ones the prototype implies but does not
 * store (task step 3 — branches/orgs, personas, accounts, aliases). Run:
 * `pnpm --filter @rogikotha/test-support port`. Deterministic: running it
 * twice produces byte-identical output (`git status --porcelain
 * packages/test-support/src/corpus` must be empty after a second run).
 */

/* eslint-disable no-undef, no-console -- Node CLI script printing a
 * regeneration summary; see packages/i18n/scripts/port-from-prototype.mjs
 * for the same pattern. */

import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '../../..');
const dataJsPath = path.join(repoRoot, 'ui-design-prototype/shared/rogikotha-data.js');
const corpusDir = path.join(__dirname, '../src/corpus');

function loadRK() {
  const src = fs.readFileSync(dataJsPath, 'utf8');
  const context = { window: {}, document: { querySelectorAll: () => [] }, console };
  vm.createContext(context);
  vm.runInContext(src, context, { filename: 'rogikotha-data.js' });
  const RK = context.window.RK;
  if (!RK) throw new Error('RK not found after evaluating rogikotha-data.js');
  return RK;
}

// Romanised-Bengali ("Banglish") aliases that appear in RK.conditions[].aliases.
// Hand-identified (data-model §4's "hard-coded Banglish list") — there are only
// two in the whole corpus, both Latin-script transliterations of a Bengali word.
const BANGLISH_ALIASES = new Set(['dayabetis', 'chulkani']);

function guessAliasLang(alias) {
  if (/[ঀ-৿]/.test(alias)) return 'bn';
  if (BANGLISH_ALIASES.has(alias)) return 'banglish';
  return 'en';
}

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function bilingual(v) {
  if (v === null || v === undefined) return null;
  return { en: v.en, bn: v.bn };
}

/* ------------------------------------------------------------------ *
 * doctors.ts
 * ------------------------------------------------------------------ */
function buildDoctors(RK) {
  return RK.doctors.map((d) => ({
    seedRef: d.id,
    name: bilingual(d.name),
    specialty: bilingual(d.specialty),
    qualifications: bilingual(d.qualifications),
    bmdc: d.bmdc,
    gender: d.gender,
    languages: bilingual(d.languages),
    fee: bilingual(d.fee),
    city: bilingual(d.city),
    area: bilingual(d.area),
    chambers: d.chambers.map((c) => ({
      name: bilingual(c.name),
      hours: bilingual(c.hours),
      provenance: c.provenance,
    })),
    fieldProvenance: { ...d.provenance },
    claimed: d.claimed,
    avatarHue: d.accent,
  }));
}

/* ------------------------------------------------------------------ *
 * conditions.ts + aliases.ts
 * ------------------------------------------------------------------ */
function buildConditions(RK) {
  return RK.conditions.map((c) => ({
    seedRef: c.id,
    name: bilingual(c.name),
    aliases: [...c.aliases],
  }));
}

function buildAliases(RK) {
  const rows = [];
  for (const c of RK.conditions) {
    for (const alias of c.aliases) {
      rows.push({ termSeedRef: c.id, alias, lang: guessAliasLang(alias) });
    }
  }
  return rows;
}

/* ------------------------------------------------------------------ *
 * facilities.ts (organisations) + branches.ts
 * ------------------------------------------------------------------ */
function buildFacilityOrgsAndBranches(RK) {
  const orgs = new Map(); // orgSeedRef -> CorpusFacilityOrg
  const branches = [];
  for (const f of RK.facilities) {
    let orgSeedRef;
    let orgName;
    if (f.parent) {
      orgSeedRef = `org-${slug(f.parent.en)}`;
      orgName = f.parent;
    } else {
      orgSeedRef = f.id;
      orgName = f.name;
    }
    if (!orgs.has(orgSeedRef)) {
      orgs.set(orgSeedRef, { seedRef: orgSeedRef, name: bilingual(orgName) });
    }
    branches.push({
      seedRef: f.id,
      orgSeedRef,
      name: bilingual(f.name),
      branchLabel: bilingual(f.branch),
      type: f.type,
      city: bilingual(f.city),
      area: bilingual(f.area),
      fieldProvenance: { ...f.provenance },
      avatarHue: f.accent,
      doctorSeedRefs: [...f.doctors],
    });
  }
  return { orgs: [...orgs.values()], branches };
}

/* ------------------------------------------------------------------ *
 * reviews.ts
 * ------------------------------------------------------------------ */
function buildReviews(RK) {
  return RK.reviews.map((r) => ({
    seedRef: r.id,
    doctorSeedRef: r.doctorId,
    conditionSeedRef: r.conditionId,
    sentiment: r.sentiment,
    outcome: r.outcome,
    relationship: r.relationship,
    identity: r.identity,
    author: bilingual(r.author),
    period: bilingual(r.period),
    posted: bilingual(r.posted),
    detailed: r.detailed,
    evidenceCount: r.evidence,
    likes: r.likes,
    dislikes: r.dislikes,
    commentsCount: r.comments,
    claims: [...r.claims],
    title: bilingual(r.title),
    body: bilingual(r.body),
    ...(r.timeline
      ? { timeline: r.timeline.map((t) => ({ key: t.k, text: { en: t.en, bn: t.bn } })) }
      : {}),
    tags: r.tags.map((t) => ({ group: t.g, text: { en: t.en, bn: t.bn } })),
  }));
}

/* ------------------------------------------------------------------ *
 * follow-ups.ts (RK.followUps + RK.laterCare)
 * ------------------------------------------------------------------ */
function buildFollowUps(RK) {
  const rows = [];
  for (const [reviewId, entries] of Object.entries(RK.followUps)) {
    entries.forEach((entry, i) => {
      rows.push({
        seedRef: `${reviewId}-fu-${i + 1}`,
        reviewSeedRef: reviewId,
        kind: 'follow_up',
        date: bilingual(entry.date),
        body: { en: entry.en, bn: entry.bn },
      });
    });
  }
  for (const [reviewId, entry] of Object.entries(RK.laterCare)) {
    rows.push({
      seedRef: `${reviewId}-later`,
      reviewSeedRef: reviewId,
      kind: 'later_care',
      // laterCare carries no explicit date in the prototype; the review's
      // own posted date is used as the dated_year/dated_month anchor by
      // the seed (documented in seed-content.ts).
      date: bilingual(RK.reviews.find((r) => r.id === reviewId).posted),
      body: { en: entry.en, bn: entry.bn },
      laterProvider: bilingual(entry.provider),
    });
  }
  return rows;
}

/* ------------------------------------------------------------------ *
 * facility-reviews.ts
 * ------------------------------------------------------------------ */
function buildFacilityReviews(RK) {
  return RK.facilityReviews.map((fr) => ({
    seedRef: fr.id,
    branchSeedRef: fr.facilityId,
    identity: fr.identity,
    author: bilingual(fr.author),
    period: bilingual(fr.period),
    posted: bilingual(fr.posted),
    likes: fr.likes,
    dislikes: fr.dislikes,
    body: bilingual(fr.body),
    criteria: { ...fr.criteria },
  }));
}

/* ------------------------------------------------------------------ *
 * comments.ts
 * ------------------------------------------------------------------ */
function buildComments(RK) {
  return RK.comments.map((c) => ({
    seedRef: c.id,
    reviewSeedRef: c.reviewId,
    parentSeedRef: c.parentId ?? null,
    author: bilingual(c.author),
    identity: c.identity,
    when: bilingual(c.when),
    likes: c.likes ?? 0,
    dislikes: c.dislikes ?? 0,
    body: bilingual(c.body),
    dangerous: Boolean(c.dangerous),
    externalLink: c.link ?? null,
    mentions: c.mentions ? [...c.mentions] : [],
    providerForDoctorSeedRef: c.providerFor ?? null,
  }));
}

/* ------------------------------------------------------------------ *
 * evidence.ts
 * ------------------------------------------------------------------ */
function buildEvidence(RK) {
  return RK.evidence.map((e) => ({
    seedRef: e.id,
    reviewSeedRef: e.reviewId,
    group: e.group,
    label: bilingual(e.label),
    prototypeState: e.state,
    pageCount: e.pages,
    ...(e.failReason ? { failReason: bilingual(e.failReason) } : {}),
  }));
}

/* ------------------------------------------------------------------ *
 * personas.ts + accounts.ts — one persona per distinct `author` value
 * across reviews/comments/facilityReviews (task step 3); anonymous
 * personas are per review.
 * ------------------------------------------------------------------ */
const STORYBOARD_ACCOUNTS = {
  shirin_88: { role: null },
  rafi_c: { role: null },
  reporter_1: { role: null },
  reporter_2: { role: null },
  reporter_3: { role: null },
  reporter_4: { role: null },
  reporter_5: { role: null },
  reporter_6: { role: null },
  mod_rashid: { role: 'moderator' },
  admin_nadia: { role: 'admin' },
  sa_founder: { role: 'super_admin' },
};

function buildPersonasAndAccounts(RK) {
  const personas = [];
  // ASSUMPTION(T-007): every `persona_links` row needs a non-null
  // `account_id` (02-data-model.md §3), but the prototype's "Anonymous"
  // author text is reused across three unrelated reviews (r2, r8, r12) with
  // no username of its own — only r4's anonymous author is named in the
  // storyboard (`anon_author_r4`, "proves alias isolation"). Narrower,
  // reversible option: synthesize one contributor account per anonymous
  // review, `anon_author_<reviewSeedRef>`, following the storyboard's own
  // naming convention, so every anonymous persona still links to a real
  // (never-revealed-in-the-demo) account. Logged as an `ISS-` row.
  const accountsByUsername = new Map(
    Object.entries(STORYBOARD_ACCOUNTS).map(([username, cfg]) => [
      username,
      { username, displayName: { en: username, bn: username }, role: cfg.role, personaKind: 'pseudonymous' },
    ]),
  );

  function anonAccountUsername(reviewId) {
    return `anon_author_${reviewId}`;
  }

  let hue = 40;
  function nextHue() {
    hue = (hue + 37) % 360;
    return hue;
  }

  const namedOrPseudoAuthors = new Map(); // author.en -> { identity, author }

  function noteAuthor(identity, author, reviewId) {
    if (identity === 'anon') {
      const accountUsername = anonAccountUsername(reviewId);
      if (!accountsByUsername.has(accountUsername)) {
        accountsByUsername.set(accountUsername, {
          username: accountUsername,
          displayName: { en: accountUsername, bn: accountUsername },
          role: null,
          personaKind: 'pseudonymous',
        });
      }
      // Anonymous personas are per review thread — never merged across
      // reviews, even when two reviews share the same "Anonymous" author
      // text (r2/r8/r12 all display exactly the same words but are three
      // distinct, unlinkable identities — the hard rule this corpus must
      // prove: "anonymous review r4 has no persona shared with any other
      // content").
      personas.push({
        key: `anon:${reviewId}`,
        kind: 'anonymous',
        displayName: bilingual(author),
        username: null,
        avatarHue: 0,
        reviewSeedRef: reviewId,
        accountUsername,
      });
      return;
    }
    const key = author.en;
    if (!namedOrPseudoAuthors.has(key)) {
      namedOrPseudoAuthors.set(key, { identity, author });
    }
  }

  for (const r of RK.reviews) noteAuthor(r.identity, r.author, r.id);
  for (const c of RK.comments) {
    // Comments never carry `identity: 'anon'` alone without a thread context
    // in this corpus except through the review they are posted on; the
    // prototype gives each comment its own `identity`, matched here 1:1.
    // No comment in this corpus is itself anonymous (`k5`'s author is
    // identity: 'anon' but posts under the *review's* thread, r6 — handled
    // by the review's own anon persona reuse below).
    if (c.identity === 'anon') {
      personas.push({
        key: `anon:${c.reviewId}`,
        kind: 'anonymous',
        displayName: bilingual(c.author),
        username: null,
        avatarHue: 0,
        reviewSeedRef: c.reviewId,
        accountUsername: anonAccountUsername(c.reviewId),
      });
      if (!accountsByUsername.has(anonAccountUsername(c.reviewId))) {
        accountsByUsername.set(anonAccountUsername(c.reviewId), {
          username: anonAccountUsername(c.reviewId),
          displayName: { en: anonAccountUsername(c.reviewId), bn: anonAccountUsername(c.reviewId) },
          role: null,
          personaKind: 'pseudonymous',
        });
      }
      continue;
    }
    noteAuthor(c.identity, c.author, c.reviewId);
  }
  for (const fr of RK.facilityReviews) noteAuthor(fr.identity, fr.author, fr.id);

  // Every pseudonymous author becomes an account (task step 3: "every other
  // prototype author becomes a contributor account with username = author
  // string"). ASSUMPTION(T-007): a real-name author's display text
  // ("Tanvir Ahmed") is not itself a valid username (data-model §3
  // `[a-z0-9_]{3,24}`, schemas/account.ts `USERNAME_RE`); every
  // review/comment/evidence-uploader FK needs a real account regardless of
  // identity mode, so this slugifies the display name into that account's
  // login username. `personas.username` is set for **both** `named` and
  // `pseudonymous` kinds per 02-data-model.md §3 ("only for named/
  // pseudonymous") — for `named`, `displayName` stays the real name shown
  // to readers while `username` is the underlying account's permanent
  // handle. Logged as an `ISS-` row.
  for (const [key, { identity, author }] of namedOrPseudoAuthors) {
    const kind = identity === 'real' ? 'named' : 'pseudonymous';
    const username = kind === 'pseudonymous' ? key : `named_${slug(author.en)}`;
    personas.push({
      key: `${kind}:${key}`,
      kind,
      displayName: bilingual(author),
      username,
      avatarHue: nextHue(),
      accountUsername: username,
    });
    if (!accountsByUsername.has(username)) {
      accountsByUsername.set(username, {
        username,
        displayName: bilingual(author),
        role: null,
        personaKind: kind,
      });
    }
  }

  const accounts = [...accountsByUsername.values()]
    .map((a) => ({ ...a, email: `${a.username}@demo.rogikotha.local` }))
    .sort((a, b) => a.username.localeCompare(b.username));

  return { personas, accounts };
}

/* ------------------------------------------------------------------ *
 * moderation.ts, notifications.ts, config.ts
 * ------------------------------------------------------------------ */
function buildModeration(RK) {
  const cases = RK.moderation.cases.map((c) => ({
    seedRef: c.id,
    lane: c.lane === 'appeal' ? 'appeals' : c.lane,
    ageHours: c.ageHours,
    reportReasons: [...c.reasons],
    autoHidden: Boolean(c.autoHidden),
    coordinated: Boolean(c.coordinated),
    targetKind: c.targetKind,
    targetSeedRef: c.targetId,
    reviewSeedRef: c.reviewId ?? null,
    summary: bilingual(c.summary),
    note: bilingual(c.note),
    ...(c.appealText ? { appealText: bilingual(c.appealText) } : {}),
  }));

  const auditLog = RK.moderation.auditLog.map((a) => ({
    seedRef: a.id,
    caseSeedRef: a.case,
    action: a.action,
    actor: a.actor,
    timeMinAgo: a.timeMin,
    targetSeedRef: a.targetId,
  }));

  const quarantine = RK.moderation.quarantine.map((q) => ({
    seedRef: q.id,
    reviewSeedRef: q.reviewId,
    file: q.file,
    sizeLabel: q.size,
    note: bilingual(q.note),
  }));

  const providers = {
    pending: RK.moderation.providers.pending.map((p) => ({
      seedRef: p.id,
      name: bilingual(p.name),
      specialty: bilingual(p.specialty),
      city: bilingual(p.city),
      bmdc: p.bmdc,
      duplicateOfDoctorSeedRef: p.duplicateOf ?? null,
      note: bilingual(p.note),
    })),
    claims: RK.moderation.providers.claims.map((c) => ({
      seedRef: c.id,
      doctorSeedRef: c.doctorId,
      method: bilingual(c.method),
      note: bilingual(c.note),
    })),
    fieldChanges: RK.moderation.providers.fieldChanges.map((f) => ({
      seedRef: f.id,
      doctorSeedRef: f.doctorId,
      field: bilingual(f.field),
      from: bilingual(f.from),
      to: bilingual(f.to),
      protected: Boolean(f.protected),
    })),
  };

  return { cases, auditLog, quarantine, providers };
}

function buildStaffNotifications(RK) {
  return RK.moderation.notifications.map((n) => ({
    seedRef: n.id,
    kind: n.kind,
    when: bilingual(n.when),
    target: bilingual(n.target),
    text: bilingual(n.text),
  }));
}

function buildNotifications(RK) {
  return RK.user.notifications.map((n) => ({
    seedRef: n.id,
    accountUsername: RK.user.username,
    kind: n.kind,
    when: bilingual(n.when),
    unread: Boolean(n.unread),
    text: bilingual(n.text),
  }));
}

function buildDrafts(RK) {
  return RK.user.drafts.map((d) => ({
    seedRef: d.id,
    accountUsername: RK.user.username,
    expiresInDays: d.expiresInDays,
    doctorSeedRef: d.doctorId,
    conditionSeedRef: d.conditionId,
    title: bilingual(d.title),
    excerpt: bilingual(d.excerpt),
    blockedOnSubmissionSeedRef: d.blocked ? 'P-143' : null,
  }));
}

function buildConfig(RK) {
  return {
    limitedDataThreshold: RK.config.limitedDataThreshold,
    emergency: {
      ambulance: RK.config.emergency.ambulance,
      healthLine: RK.config.emergency.healthLine,
      crisisLine: RK.config.emergency.crisisLine,
      lastVerified: '2026-08-21',
    },
    thresholds: {
      fiveAccountHide: RK.moderation.thresholds.fiveAccountHide,
      criticalHours: RK.moderation.thresholds.criticalHours,
      standardDays: RK.moderation.thresholds.standardDays,
      appealDays: RK.moderation.thresholds.appealDays,
    },
    retention: { originalDays: 90, auditDays: 180, notificationDays: 90 },
  };
}

/* ------------------------------------------------------------------ *
 * Emit
 * ------------------------------------------------------------------ */

const HEADER = (name, typeImport) =>
  `// Generated by \`pnpm --filter @rogikotha/test-support port\` from
// ui-design-prototype/shared/rogikotha-data.js. Do not hand-edit — re-run
// the script and commit the diff instead (types live in ./types.ts).
import type { ${typeImport} } from './types.js';

`;

function writeTs(file, varName, typeName, data) {
  const header = HEADER(varName, typeName);
  const body = `export const ${varName} = ${JSON.stringify(data, null, 2)} as const satisfies ${typeName}[];\n`;
  fs.writeFileSync(path.join(corpusDir, file), header + body, 'utf8');
}

function main() {
  const RK = loadRK();
  fs.mkdirSync(corpusDir, { recursive: true });

  writeTs('doctors.ts', 'DOCTORS', 'CorpusDoctor', buildDoctors(RK));
  writeTs('conditions.ts', 'CONDITIONS', 'CorpusCondition', buildConditions(RK));
  writeTs('aliases.ts', 'ALIASES', 'CorpusAlias', buildAliases(RK));

  const { orgs, branches } = buildFacilityOrgsAndBranches(RK);
  writeTs('facilities.ts', 'FACILITY_ORGS', 'CorpusFacilityOrg', orgs);
  writeTs('branches.ts', 'BRANCHES', 'CorpusBranch', branches);

  writeTs('reviews.ts', 'REVIEWS', 'CorpusReview', buildReviews(RK));
  writeTs('follow-ups.ts', 'FOLLOW_UPS', 'CorpusFollowUp', buildFollowUps(RK));
  writeTs('facility-reviews.ts', 'FACILITY_REVIEWS', 'CorpusFacilityReview', buildFacilityReviews(RK));
  writeTs('comments.ts', 'COMMENTS', 'CorpusComment', buildComments(RK));
  writeTs('evidence.ts', 'EVIDENCE_ITEMS', 'CorpusEvidenceItem', buildEvidence(RK));

  const { personas, accounts } = buildPersonasAndAccounts(RK);
  writeTs('personas.ts', 'PERSONAS', 'CorpusPersona', personas);
  writeTs('accounts.ts', 'ACCOUNTS', 'CorpusAccount', accounts);

  const moderation = buildModeration(RK);
  const moderationHeader =
    `// Generated by \`pnpm --filter @rogikotha/test-support port\` from
// ui-design-prototype/shared/rogikotha-data.js. Do not hand-edit — re-run
// the script and commit the diff instead (types live in ./types.ts).
import type {
  CorpusAuditRow,
  CorpusFieldChange,
  CorpusModerationCase,
  CorpusProviderClaim,
  CorpusProviderSubmission,
  CorpusQuarantineStage,
} from './types.js';

`;
  fs.writeFileSync(
    path.join(corpusDir, 'moderation.ts'),
    moderationHeader +
      `export const MODERATION_CASES = ${JSON.stringify(moderation.cases, null, 2)} as const satisfies CorpusModerationCase[];\n\n` +
      `export const MODERATION_AUDIT_LOG = ${JSON.stringify(moderation.auditLog, null, 2)} as const satisfies CorpusAuditRow[];\n\n` +
      `export const MODERATION_QUARANTINE = ${JSON.stringify(moderation.quarantine, null, 2)} as const satisfies CorpusQuarantineStage[];\n\n` +
      `export const PROVIDER_SUBMISSIONS = ${JSON.stringify(moderation.providers.pending, null, 2)} as const satisfies CorpusProviderSubmission[];\n\n` +
      `export const PROVIDER_CLAIMS = ${JSON.stringify(moderation.providers.claims, null, 2)} as const satisfies CorpusProviderClaim[];\n\n` +
      `export const PROVIDER_FIELD_CHANGES = ${JSON.stringify(moderation.providers.fieldChanges, null, 2)} as const satisfies CorpusFieldChange[];\n`,
    'utf8',
  );

  const notifHeader = `// Generated by \`pnpm --filter @rogikotha/test-support port\` from
// ui-design-prototype/shared/rogikotha-data.js (RK.user.notifications,
// RK.user.drafts, RK.moderation.notifications). Do not hand-edit — re-run
// the script and commit the diff instead (types live in ./types.ts).
import type { CorpusDraft, CorpusNotification, CorpusStaffNotification } from './types.js';

`;
  fs.writeFileSync(
    path.join(corpusDir, 'notifications.ts'),
    notifHeader +
      `export const STAFF_NOTIFICATIONS = ${JSON.stringify(buildStaffNotifications(RK), null, 2)} as const satisfies CorpusStaffNotification[];\n\n` +
      `export const USER_NOTIFICATIONS = ${JSON.stringify(buildNotifications(RK), null, 2)} as const satisfies CorpusNotification[];\n\n` +
      `export const USER_DRAFTS = ${JSON.stringify(buildDrafts(RK), null, 2)} as const satisfies CorpusDraft[];\n`,
    'utf8',
  );

  // config.ts mirrors a subset of `ConfigValues`' shape loosely (seed-config.ts
  // merges it into DEFAULT_CONFIG_VALUES) — no dedicated corpus type.
  fs.writeFileSync(
    path.join(corpusDir, 'config.ts'),
    `// Generated by \`pnpm --filter @rogikotha/test-support port\` from
// ui-design-prototype/shared/rogikotha-data.js (RK.config + RK.moderation.thresholds).
// Do not hand-edit — re-run the script and commit the diff instead.
export const CORPUS_CONFIG = ${JSON.stringify(buildConfig(RK), null, 2)} as const;
`,
    'utf8',
  );

  console.log('Ported corpus into packages/test-support/src/corpus/*.ts');
}

main();
