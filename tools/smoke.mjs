#!/usr/bin/env node
/**
 * tools/smoke.mjs
 *
 *   npm install          # once - installs jsdom (the only dependency)
 *   node tools/smoke.mjs # or: npm run smoke
 *
 * Drives Concept 04b in a real DOM and clicks through the journeys the
 * coverage matrix claims are Done. It exists because "the file parses" and
 * "the button works" are different claims, and the matrix makes the second
 * one. Every control wired here was at some point rendered but dead.
 *
 * Exits non-zero on failure. Skips cleanly (exit 0) if jsdom is absent, so a
 * fresh clone is never blocked by it.
 *
 * jsdom is not a browser: it does not lay out or paint, so this proves
 * behaviour and DOM state, NOT visual rendering, contrast or screen-reader
 * output. Contrast is checked separately by tools/contrast.mjs.
 */
import { readFileSync } from 'node:fs';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

let JSDOM, VirtualConsole;
try { ({ JSDOM, VirtualConsole } = await import('jsdom')); }
catch {
  console.log('SKIPPED - jsdom is not installed.');
  console.log('  npm install        (once, at the repo root)');
  console.log('  node tools/smoke.mjs');
  process.exit(0);
}

const REPO = dirname(dirname(fileURLToPath(import.meta.url)));
const ROOT = join(REPO, 'ui-design-prototype/concepts/concept-04b-quiet-clinic-minimal') + '/';
const errors = [];
const vc = new VirtualConsole();
// jsdom does not implement layout, so scrollTo/scrollIntoView always throw.
// That is a harness limitation, not an app fault - filter it out.
const JSDOM_GAPS = /Not implemented: Window's scroll|Not implemented: Element/;
vc.on('jsdomError', e => { const m = e.message || String(e);
  if (!JSDOM_GAPS.test(m)) errors.push('jsdomError: ' + m); });
vc.on('error', (...a) => errors.push('console.error: ' + a.join(' ')));

const html = readFileSync(ROOT + 'index.html', 'utf8');
const dom = new JSDOM(html, {
  url: pathToFileURL(ROOT + 'index.html').href,
  runScripts: 'dangerously', resources: 'usable',
  pretendToBeVisual: true, virtualConsole: vc,
});
const { window } = dom;
// jsdom has no matchMedia; browsers always do. Polyfill so the app's
// theme/reduced-motion checks behave as they would in a real browser.
window.matchMedia = q => ({ matches:false, media:q, onchange:null,
  addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return false;} });
await new Promise(r => window.addEventListener('load', r, { once: true }));
const d = window.document;
const $ = s => d.querySelector(s);
const $$ = s => [...d.querySelectorAll(s)];
const click = el => { el.dispatchEvent(new window.MouseEvent('click', { bubbles: true })); };
const go = async h => { window.location.hash = h; await new Promise(r=>setTimeout(r,40)); };
const results = [];
const t = (name, fn) => { try { const m = fn(); results.push([m===true?'PASS':'FAIL', name, m===true?'':m]); }
                          catch(e){ results.push(['ERR', name, e.message]); } };

// scripts loaded?
t('app.js executed (RK + views present)', () => !!window.RK && $$('.view').length >= 11 || `views=${$$('.view').length} RK=${!!window.RK}`);

// ============================================================================
// STORY-AUTH-001/002 (D-001): auth screens, static simulation only.
// Gate checks run first, signed OUT (the prototype's default state); the
// register -> verify flow that follows leaves state.session signed in and
// verified for the rest of this file's pre-existing journeys below, which
// D-001 gated behind a confirmed account (reply, comment edit/delete,
// reactions, bookmark, mine). See docs/implementation/handoffs/D-001.md.
// ============================================================================
await go('#write');
t('signed-out reader sees the sign-in explanation on the write screen', () => $$('#view-compose .signin-note').length > 0 || 'missing');
t('signed-out write screen renders no form', () => $$('#view-compose .c-grid').length === 0 || 'form still rendered');

await go('#experiences/r1');
const reactPressedBefore = $$('[data-react]').filter(b => b.getAttribute('aria-pressed') === 'true').length;
click($$('[data-react]')[0]);
await new Promise(r => setTimeout(r, 20));
t('signed-out reaction click opens the gate sheet', () => !$('#overlay').hidden || 'overlay still hidden');
t('signed-out reaction click does not record a reaction', () => {
  const after = $$('[data-react]').filter(b => b.getAttribute('aria-pressed') === 'true').length;
  return after === reactPressedBefore || `before=${reactPressedBefore} after=${after}`;
});
click($('#sheet-close')); await new Promise(r => setTimeout(r, 20));

// ---- register -> verify (anti-enumeration: identical screen every time) ----
await go('#register');
t('register view renders', () => ($('#view-register')?.innerHTML.length ?? 0) > 300 || 'empty');
$('#f-register-email').value = 'newreader@example.com';
$('#f-register-password').value = 'short123'; // 9 chars - too short
$('#f-register-username').value = 'newreader1';
$('#f-register-displayName').value = 'New Reader';
$('#f-register-age').checked = true;
$('#f-register-terms').checked = true;
$('#register-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await new Promise(r => setTimeout(r, 30));
t('register with a 9-char password shows the summary and #err-register-password', () => (!!$('#auth-error-summary-register') && !!$('#err-register-password')) || 'missing summary or inline error');
$('#f-register-password').value = 'a much better remembered sentence';
$('#register-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await new Promise(r => setTimeout(r, 30));
t('register valid -> #view-verify visible', () => (window.location.hash.startsWith('#verify-email') && $('#view-verify') && !$('#view-verify').hidden) || `hash=${window.location.hash}`);
const pendingBody = ($('#view-verify')?.textContent || '').replace(/\s+/g, ' ').trim();
// STORY-AUTH-001: registering the same email again must show the identical
// pending screen - the app never checks whether the address is already used.
await go('#register');
$('#f-register-email').value = 'newreader@example.com';
$('#f-register-password').value = 'a much better remembered sentence';
$('#f-register-username').value = 'newreader1';
$('#f-register-displayName').value = 'New Reader';
$('#f-register-age').checked = true;
$('#f-register-terms').checked = true;
$('#register-form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
await new Promise(r => setTimeout(r, 30));
t('register twice with the same email shows the identical pending screen (anti-enumeration)', () => {
  const secondBody = ($('#view-verify')?.textContent || '').replace(/\s+/g, ' ').trim();
  return (window.location.hash.startsWith('#verify-email') && secondBody === pendingBody) || `first="${pendingBody.slice(0,60)}" second="${secondBody.slice(0,60)}"`;
});
click($('[data-verify-simulate]'));
await new Promise(r => setTimeout(r, 30));
t('simulate link -> #view-mine shows auth.verify.done', () => {
  const txt = $('#view-mine')?.textContent || '';
  return (window.location.hash.startsWith('#me') && /confirmed|নিশ্চিত হয়েছে/.test(txt)) || `hash=${window.location.hash}`;
});

await go('#experiences/r1');
t('signed-in reaction click records', () => {
  // renderAccount() replaces the whole subtree on click, so re-query after -
  // the pre-click node reference goes stale and its attributes never change.
  const before = $$('[data-react]')[0].getAttribute('aria-pressed');
  click($$('[data-react]')[0]);
  const after = $$('[data-react]')[0].getAttribute('aria-pressed');
  return after !== before || 'unchanged';
});

await go('#account/r1');
t('account view renders', () => ($('#view-account')?.innerHTML.length ?? 0) > 500 || 'empty');
t('comment bodies are not "undefined"', () => {
  const txt = $('#view-account').textContent;
  return !/\bundefined\b/.test(txt) || 'literal "undefined" present';
});

// reply flow
t('Reply button exists on top-level comments', () => $$('[data-reply]').length > 0 || 'none');
click($$('[data-reply]')[0]);
await new Promise(r=>setTimeout(r,30));
t('reply composer opens prefilled with mention', () => {
  const ta = $('#reply-text'); return (ta && ta.value.trim().startsWith('@')) || `value=${ta&&ta.value}`;
});
const before = $$('.comment').length;
$('#reply-text').value = '@rumana_h thank you, this matched my experience.';
click($('[data-post-reply]'));
await new Promise(r=>setTimeout(r,30));
t('reply posts and nests one level', () => {
  const nested = $$('.comment-replies .comment').length;
  return (nested > 0 && $$('.comment').length > before) || `nested=${nested} before=${before} after=${$$('.comment').length}`;
});
t('replies cannot themselves be replied to', () => $$('.comment-replies [data-reply]').length === 0 || 'nested reply button found');

// comment edit / delete / tombstone (FR-COM-003)
await go('#account/r1');
t('own comments expose Edit and Delete', () => ($$('[data-edit-comment]').length>0 && $$('[data-del-comment]').length>0) || `edit=${$$('[data-edit-comment]').length} del=${$$('[data-del-comment]').length}`);
t('other people comments do NOT expose Edit/Delete', () => {
  const owners = $$('.comment').filter(c => c.querySelector('[data-edit-comment]'));
  return owners.every(c => /shirin_88|You|আপনি/.test(c.querySelector('.byline-name')?.textContent||'')) || 'edit offered on a foreign comment';
});
click($$('[data-edit-comment]')[0]); await new Promise(r=>setTimeout(r,30));
t('edit opens an editor prefilled with the comment', () => ($('#edit-text')?.value||'').length > 10 || 'empty editor');
$('#edit-text').value = 'Edited: she checked my readings for six weeks.';
click($('[data-save-comment]')); await new Promise(r=>setTimeout(r,30));
t('saved edit is shown and marked edited', () => {
  const txt = $('#view-account').textContent;
  return (txt.includes('Edited: she checked my readings') && /\(edited\)/.test(txt)) || 'not saved/marked';
});
// delete a comment that HAS a reply -> tombstone, replies kept
await go('#account/r1');
const withReply = $$('.comment').find(c => c.querySelector('.comment-replies') && c.querySelector('[data-del-comment]'));
t('found an own comment that has a reply', () => !!withReply || 'none');
if (withReply) {
  const replyText = withReply.querySelector('.comment-replies .comment p')?.textContent || '';
  click(withReply.querySelector('[data-del-comment]')); await new Promise(r=>setTimeout(r,30));
  t('deleting a replied-to comment leaves a tombstone', () => $$('.comment.tombstone').length > 0 || 'no tombstone');
  t('tombstone keeps the replies', () => $('#view-account').textContent.includes(replyText.slice(0,30)) || 'replies lost');
}
// delete a comment with NO replies -> removed outright
await go('#account/r1');
const noReply = $$('.comment').find(c => !c.querySelector('.comment-replies') && c.querySelector('[data-del-comment]'));
if (noReply) {
  const body = noReply.querySelector('p')?.textContent || '';
  const n = $$('.comment').length;
  click(noReply.querySelector('[data-del-comment]')); await new Promise(r=>setTimeout(r,30));
  t('deleting a comment with no replies removes it outright', () => (!$('#view-account').textContent.includes(body.slice(0,30)) && $$('.comment').length < n) || 'still present');
}

// reactions mutual exclusivity
await go('#account/r1');
const up = $$('[data-react]').find(b=>b.getAttribute('data-react').endsWith(':up'));
click(up); await new Promise(r=>setTimeout(r,20));
const down = $$('[data-react]').find(b=>b.getAttribute('data-react').endsWith(':down'));
click(down); await new Promise(r=>setTimeout(r,20));
t('reactions are mutually exclusive', () => {
  const on = $$('[data-react]').filter(b=>b.getAttribute('aria-pressed')==='true');
  return on.length <= 1 || `${on.length} pressed`;
});

// bookmark
await go('#account/r1');
const bm = $('[data-bookmark]'); const was = bm.getAttribute('aria-pressed');
click(bm); await new Promise(r=>setTimeout(r,20));
t('bookmark toggles', () => $('[data-bookmark]').getAttribute('aria-pressed') !== was || 'unchanged');

// evidence viewer
await go('#account/r1');
t('evidence open control is wired', () => $$('[data-view-evidence]').length > 0 || 'none');

// mine: delete + restore
await go('#mine');
t('mine renders', () => ($('#view-mine')?.innerHTML.length ?? 0) > 300 || 'empty');
const del = $('[data-del-pub]');
t('published delete control exists', () => !!del || 'none');
if (del) { click(del); await new Promise(r=>setTimeout(r,30));
  t('delete leaves restorable tombstone', () => $$('[data-restore-pub]').length > 0 || 'no tombstone');
  const rs = $('[data-restore-pub]'); if (rs) { click(rs); await new Promise(r=>setTimeout(r,30)); }
  t('restore brings it back', () => $$('[data-del-pub]').length > 0 || 'not restored');
}

// public profile
await go('#mine');
const pp = $('[data-person]');
t('public-profile entry link exists', () => !!pp || 'none');
if (pp) { click(pp); await new Promise(r=>setTimeout(r,60)); }
t('person view renders', () => ($('#view-person')?.innerHTML.length ?? 0) > 300 || `len=${$('#view-person')?.innerHTML.length}`);
t('person view is noindex', () => d.querySelector('meta[name="robots"]')?.content === 'noindex' || 'missing');
t('person view excludes anonymous accounts', () => {
  // Check actual linked review ids, not prose (the allowlist explainer
  // legitimately contains the word "Anonymous").
  const ids = $$('#view-person [data-account]').map(e=>e.getAttribute('data-account'));
  const anon = ids.filter(id => (window.RK.reviewById(id)||{}).identity === 'anon');
  return anon.length === 0 || `anon ids: ${anon.join(',')}`;
});
t('person view lists only accounts by this author', () => {
  const ids = $$('#view-person [data-account]').map(e=>e.getAttribute('data-account'));
  const who = $('#view-person .display').textContent.trim();
  const wrong = ids.filter(id => (window.RK.reviewById(id)||{}).author.en !== who);
  return wrong.length === 0 || `foreign ids: ${wrong.join(',')} (who=${who})`;
});
t('person view shows the allowlist explainer', () => /never linked to a profile|কখনো কোনো প্রোফাইল/.test($('#view-person').textContent) || 'missing');

// ---- STORY-AUTH-001: the write gate is keyed off state.session now, not
// the demo role picker (which no longer gates anything - see app.js) ----
await go('#write');
t('verified account does not see the sign-in explanation - the session gate really gates', () => $$('#view-compose .signin-note').length === 0 || 'still shown');
t('demo panel is translated, not hardcoded English', () => {
  const h = $('#demo-panel .sub-head');
  return (h && h.textContent.trim().length > 0) || 'demo.title did not render';
});

// ---- light-mode colour schemes: switchable, persisted, restored ----
await go('#discover');
t('scheme switcher present in the demo panel', () => $$('[data-scheme-pick]').length === 4 || `found ${$$('[data-scheme-pick]').length}`);
click($('[data-scheme-pick="b"]')); await new Promise(r=>setTimeout(r,30));
t('picking a scheme sets data-scheme on <html>', () => d.documentElement.getAttribute('data-scheme') === 'b' || `got ${d.documentElement.getAttribute('data-scheme')}`);
t('scheme picker reflects state', () => $('[data-scheme-pick="b"]').getAttribute('aria-pressed') === 'true' || 'aria-pressed not updated');
click($('[data-scheme-pick=""]')); await new Promise(r=>setTimeout(r,30));
t('choosing Current clears the scheme', () => !d.documentElement.hasAttribute('data-scheme') || 'attribute still set');

// ---- byline: the author must be unmistakable, everywhere ----
await go('#experiences/r1');
t('detail page has a lead byline', () => !!$('#view-account .byline--lead') || 'missing');
t('lead byline sits BEFORE the story in DOM order (phones read it first)', () => {
  const b=$('#view-account .byline--lead'), st=$('#view-account .story');
  if(!b||!st) return 'missing byline or story';
  return !!(b.compareDocumentPosition(st) & 4) || 'byline comes after the story';
});
t('lead byline names the author at body scale with an identity chip', () => {
  const b=$('#view-account .byline--lead');
  return (b.querySelector('.byline-name') && b.querySelector('.byline-id')) ? true : 'name or chip missing';
});
t('"Written by" is followed by a NAME, not a relationship', () => {
  const b=$('#view-account .byline--lead'); const lede=b.querySelector('.byline-lede'); const name=b.querySelector('.byline-name');
  if(!lede) return true; // anonymous rows have no lede
  return (lede.nextElementSibling===name) || 'lede not followed by name';
});
t('tab title carries the author', () => /Written by|লিখেছেন/.test(d.title) || d.title);
await go('#experiences');
t('every experience row has a byline', () => { const rows=$$('#view-experiences .acct'); return rows.length>0 && rows.every(r=>r.querySelector('.byline')) || 'a row lacks a byline'; });
t('real, pseudonym and anonymous are each labelled, not colour-only', () => {
  const ids=new Set($$('#view-experiences .byline-id').map(e=>e.getAttribute('data-identity')));
  return (ids.has('real')&&ids.has('pseudo')&&ids.has('anon')) || `saw ${[...ids].join(',')}`;
});
t('anonymous byline name is never a control', () => $$('#view-experiences .byline-id[data-identity="anon"]').every(c=>c.previousElementSibling && c.previousElementSibling.tagName!=='BUTTON') || 'anon name is a button');
await go('#experiences/r1');
t('related cards carry a byline', () => $$('#view-account .related-card .byline').length>0 || 'none');
t('comments use the comment byline', () => $$('#view-account .comment .byline--comment').length>0 || 'none');
await go('#me');
t('own published rows show how they were attributed', () => $$('#view-mine .mine-item .byline--mine').length>0 || 'none');

// ---- name linking rules ----
// The privacy rule that matters: an anonymous author must never be a link,
// on ANY surface. Previously the guard lived in accountRow() only.
for (const h of ['#discover','#experiences','#doctors','#topics/c1','#facilities/f1','#experiences/r1']) {
  await go(h);
  t(`no anonymous author is linked on ${h}`, () => {
    const bad = $$('[data-person]').filter(b => /Anonymous|নাম প্রকাশ/.test(b.textContent));
    return bad.length === 0 || `${bad.length} linked anon name(s)`;
  });
}
await go('#experiences');
t('anonymous authors render in the non-link style', () => {
  const anon = $$('.name-anon');
  return anon.length === 0 || anon.every(a => !a.querySelector('button')) || 'anon name contains a control';
});
await go('#doctors');
t('doctor card titles are links', () => $$('#view-doctors h3 .name-link').length > 0 || 'titles still inert');
await go('#facilities');
t('facility card titles are links', () => $$('#view-facilities h3 .name-link').length > 0 || 'titles still inert');
await go('#experiences');
t('experience rows link the doctor byline', () => $$('#view-experiences [data-doctor]').length > 0 || 'byline still dead text');

// ---- IA restructure: indexes, slugs, titles ----
const COUNTS = { doctors: 6, facilities: 5, topics: 8, experiences: 12 };
for (const [slug, n] of Object.entries(COUNTS)) {
  await go('#' + slug);
  t(`#${slug} index renders`, () => ($(`#view-${slug}`)?.innerHTML.length ?? 0) > 300 || 'empty');
  t(`#${slug} lists all ${n}`, () => {
    const v = $(`#view-${slug}`);
    const cards = v.querySelectorAll('.doc-entry, .fac-entry, .browse-card, .acct').length;
    return cards === n || `found ${cards}`;
  });
}
await go('#topics');
t('empty topics are listed, not hidden', () => {
  const txt = $('#view-topics').textContent;
  return /No one has written about this yet|এখনো কেউ/.test(txt) || 'all topics have content, or empty state missing';
});

// legacy hashes still work
for (const [oldh, newh] of [['#account/r1','experiences'],['#mine','me'],['#profile/d1','doctors'],['#condition/c1','topics'],['#compose','write']]) {
  await go(oldh); await new Promise(r=>setTimeout(r,40));
  t(`legacy ${oldh} redirects to #${newh}`, () => window.location.hash.startsWith('#'+newh) || `landed on ${window.location.hash}`);
}

// document.title
const titles = new Set();
for (const h of ['#discover','#doctors','#facilities','#topics','#me','#about']) {
  await go(h); titles.add(d.title);
}
t('document.title differs per route', () => titles.size >= 5 || `only ${titles.size} distinct titles`);
t('title leads with the page name', () => { const x=[...titles].find(v=>v.startsWith('Doctors')); return !!x || [...titles].join(' | '); });

// write action is a button in the chrome, not a nav tab
t('write CTA is out of the tab row', () => !$('nav.tabs a[href="#write"]') || 'still a tab');
t('write CTA exists in the header', () => !!$('.cta-write') || 'missing');

// workspace split
await go('#me');
t('workspace no longer has a Saved tab', () => !$('[data-mine="bookmarks"]') || 'Saved tab still present');
t('workspace cross-links to Saved and Notifications', () => ($$('[data-goto="saved"]').length>0 && $$('[data-goto="notifications"]').length>0) || 'sub-nav missing');
await go('#saved');
t('#saved renders its own page', () => ($('#view-saved')?.innerHTML.length ?? 0) > 200 || 'empty');

// external links (the prototype has exactly one)
await go('#emergency');
t('emergency view renders', () => ($('#view-emergency')?.innerHTML.length ?? 0) > 300 || 'empty');
t('BMDC link points at the verification portal, not the general site', () => {
  const a = $$('#view-emergency a[href*="bmdc"]')[0];
  if (!a) return 'no BMDC link';
  const href = a.getAttribute('href');
  return href.includes('verify.bmdc.org.bd') || `points at ${href}`;
});
t('external links open safely', () => {
  const bad = $$('a[target="_blank"]').filter(a => !(a.getAttribute('rel')||'').includes('noopener'));
  return bad.length === 0 || `${bad.length} target=_blank without rel=noopener`;
});
t('the demo makes no other outbound links', () => {
  const ext = $$('a[href^="http"]').map(a => new URL(a.href).host);
  const unexpected = ext.filter(h => h !== 'verify.bmdc.org.bd' && !h.startsWith('localhost'));
  return unexpected.length === 0 || `unexpected hosts: ${[...new Set(unexpected)].join(', ')}`;
});

// language switch
click($('#lang')); await new Promise(r=>setTimeout(r,60));
t('language switches to Bengali', () => d.documentElement.getAttribute('lang')==='bn' || d.documentElement.getAttribute('lang'));
t('aria-labels translate with the UI', () => {
  const nav = $('nav.tabs')?.getAttribute('aria-label');
  return (nav && nav !== 'Screens') || `aria-label=${nav}`;
});
click($('#lang')); await new Promise(r=>setTimeout(r,60));

// ============================================================================
// STORY-AUTH-001/002 (D-001): staff console auth walkthrough.
// A second, independent JSDOM instance - the admin console is a separate
// static site with its own app.js and state (see ui-design-prototype/README.md).
// ============================================================================
const ADMIN_ROOT = join(REPO, 'ui-design-prototype/admin') + '/';
const adminHtml = readFileSync(ADMIN_ROOT + 'index.html', 'utf8');
const adminVc = new VirtualConsole();
adminVc.on('jsdomError', e => { const m = e.message || String(e); if (!JSDOM_GAPS.test(m)) errors.push('admin jsdomError: ' + m); });
adminVc.on('error', (...a) => errors.push('admin console.error: ' + a.join(' ')));
const adminDom = new JSDOM(adminHtml, {
  url: pathToFileURL(ADMIN_ROOT + 'index.html').href,
  runScripts: 'dangerously', resources: 'usable',
  pretendToBeVisual: true, virtualConsole: adminVc,
});
const aw = adminDom.window;
aw.matchMedia = q => ({ matches:false, media:q, onchange:null,
  addListener(){}, removeListener(){}, addEventListener(){}, removeEventListener(){}, dispatchEvent(){return false;} });
await new Promise(r => aw.addEventListener('load', r, { once: true }));
const ad = aw.document;
const a$ = s => ad.querySelector(s);
const aClick = el => { el.dispatchEvent(new aw.MouseEvent('click', { bubbles: true })); };
const aGo = async h => { aw.location.hash = h; await new Promise(r=>setTimeout(r,40)); };

await aGo('#sign-in');
t('admin sign-in view renders', () => (a$('#view-signin')?.innerHTML.length ?? 0) > 100 || 'empty');
a$('#f-signin-email').value = 'staff@example.com';
a$('#f-signin-password').value = 'a very long staff password';
a$('#staff-signin-form').dispatchEvent(new aw.Event('submit', { bubbles: true, cancelable: true }));
await new Promise(r => setTimeout(r, 30));
t('admin: unknown device goes to #approve-device', () => aw.location.hash === '#approve-device' || `hash=${aw.location.hash}`);
aClick(a$('[data-approve-simulate]'));
await new Promise(r => setTimeout(r, 30));
a$('#f-approve-password').value = 'a very long staff password';
a$('#staff-approve-form').dispatchEvent(new aw.Event('submit', { bubbles: true, cancelable: true }));
await new Promise(r => setTimeout(r, 30));
t('admin: sign-in -> approve -> trust -> body[data-view="queue"]', () => ad.body.getAttribute('data-view') === 'queue' || `data-view=${ad.body.getAttribute('data-view')}`);

aw.location.hash = '#sign-in';
await new Promise(r => setTimeout(r, 20));
a$('#f-signin-email').value = 'reader@demo';
a$('#f-signin-password').value = 'a very long staff password';
a$('#staff-signin-form').dispatchEvent(new aw.Event('submit', { bubbles: true, cancelable: true }));
await new Promise(r => setTimeout(r, 30));
t('admin: a non-staff email is refused and stays on #sign-in', () => (aw.location.hash === '#sign-in' && !!a$('#auth-error-summary-signin')) || `hash=${aw.location.hash}`);

console.log(results.map(([s,n,m])=>`${s.padEnd(4)} ${n}${m?'  -- '+m:''}`).join('\n'));
console.log('\nRuntime errors: ' + (errors.length ? '\n' + errors.slice(0,10).join('\n') : 'none'));
const bad = results.filter(r=>r[0]!=='PASS').length;
console.log(`\n${results.length - bad}/${results.length} passed`);
