/* RogiKotha — Staff console (separate portal)

   This file is the moderation console. It is intentionally NOT bundled
   into the patient prototype under concepts/. The two artefacts share
   only the data layer (../shared/rogikotha-data.js); the staff console
   has its own minimal chrome, its own CSS, and its own state.

   Three sections:
     · Report queue         — lane triage (Critical 24h, Standard 3d, Appeals 7d)
     · Evidence quarantine  — per-file pipeline state (received → published)
     · Providers & claims   — new profiles, ownership claims, protected-field edits

   Permission-gated data is shown as present-but-restricted (the .restricted
   box), so it's obvious something exists that this account cannot open —
   matching Concept 03's permission-as-typography convention. */

(function () {
  'use strict';

  var state = {
    lang: 'en', theme: null, motion: 'on',
    tab: 'queue',
    selCase: 'MOD-2041',
    selAction: null,
    done: false
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var T = function (k) { return RK.t(k, state.lang); };
  var P = function (f) { return RK.pick(f, state.lang); };
  var L = function (o) { return o ? (state.lang === 'bn' ? o.bn : o.en) : ''; };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function bn(n) {
    if (state.lang !== 'bn') { return String(n); }
    return String(n).replace(/[0-9]/g, function (d) { return '০১২৩৪৫৬৭৮৯'[+d]; });
  }

  function badge(cls, text) { return '<span class="badge ' + cls + '">' + esc(text) + '</span>'; }

  /* ---------------------------------------------------------------------
     Shell — language, theme, motion, route
     ------------------------------------------------------------------- */

  function setLang(lang) {
    state.lang = lang;
    RK.applyLang(document, lang);
    $('#lang').setAttribute('aria-pressed', String(lang === 'bn'));
    $('#lang').querySelector('span').textContent = lang === 'bn' ? 'A' : 'অ';
    try { localStorage.setItem('rk04.admin.lang', lang); } catch (e) {}
    renderAll();
  }
  function setTheme(theme) {
    state.theme = theme;
    if (theme) { document.documentElement.setAttribute('data-theme', theme); }
    else { document.documentElement.removeAttribute('data-theme'); }
    try { localStorage.setItem('rk04.admin.theme', theme || ''); } catch (e) {}
  }
  function setMotion(on) {
    state.motion = on ? 'on' : 'off';
    document.body.setAttribute('data-motion', state.motion);
    try { localStorage.setItem('rk04.admin.motion', state.motion); } catch (e) {}
  }

  var VIEWS = ['queue', 'evidence', 'providers'];
  function route() {
    var raw = (location.hash || '#queue').replace('#', '');
    var v = VIEWS.indexOf(raw) === -1 ? 'queue' : raw;
    state.tab = v;
    document.body.setAttribute('data-view', v);
    VIEWS.forEach(function (n) { var el = $('#view-' + n); if (el) { el.hidden = (n !== v); } });
    $$('.admin-tabs button').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-admin') === v));
    });
    if (v === 'queue') { renderQueue(); }
    if (v === 'evidence') { renderEvidence(); }
    if (v === 'providers') { renderProviders(); }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ---------------------------------------------------------------------
     Renderers
     ------------------------------------------------------------------- */

  function renderAll() {
    if (state.tab === 'queue') { renderQueue(); }
    if (state.tab === 'evidence') { renderEvidence(); }
    if (state.tab === 'providers') { renderProviders(); }
  }

  function permissionCallout() {
    return '<div class="callout admin-note" style="margin-top:14px"><b>' + esc(T('admin.demoNote')) + '</b> ' +
      esc(T('admin.permissionNote')) + '</div>';
  }

  /* ----- Report queue ------------------------------------------------- */

  function renderQueue() {
    var host = $('#view-queue');
    if (!host) { return; }
    host.innerHTML =
      '<section class="a-head">' +
        '<span class="kicker">' + esc(T('nav.admin')) + '</span>' +
        '<h1 class="display">' + esc(T('admin.title')) + '</h1>' +
      '</section>' + permissionCallout() + queueBody();
  }

  function queueBody() {
    var lanes = [
      { k: 'critical', target: T('admin.criticalTarget') },
      { k: 'standard', target: T('admin.standardTarget') },
      { k: 'appeal', target: T('admin.appealTarget') }
    ];
    var sel = RK.moderation.cases.filter(function (c) { return c.id === state.selCase; })[0];

    return '<div class="p-grid"><div>' +
      '<p class="note" style="margin-bottom:14px">' + esc(T('admin.threshold')) + '</p>' +
      lanes.map(function (lane) {
        var list = RK.moderation.cases.filter(function (c) { return c.lane === lane.k; });
        if (!list.length) { return ''; }
        return '<div class="lane">' +
          '<div class="lane-head"><h3>' + esc(T(lane.k === 'appeal' ? 'admin.appeals' : 'admin.' + lane.k)) + '</h3>' +
            '<span class="target">' + esc(lane.target) + '</span></div>' +
          list.map(function (c) {
            return '<button class="case" type="button" data-case="' + c.id + '" aria-pressed="' + (state.selCase === c.id) + '">' +
              '<span><span class="id">' + esc(c.id) + '</span>' +
                '<span class="age">' + esc(T('admin.age')) + ' ' + bn(c.ageHours) + esc(T('admin.hours')) + '</span></span>' +
              '<span><h4>' + esc(L(c.summary)) + '</h4>' +
                '<span class="case-flags">' +
                  badge('plain', T('target.' + c.targetKind)) +
                  badge(c.autoHidden ? 'danger' : 'plain', c.autoHidden ? T('admin.autoHidden') : T('admin.stillVisible')) +
                  (c.reports ? badge('plain', bn(c.reports) + ' ' + T('admin.reports')) : '') +
                  (c.coordinated ? badge('warn', T('admin.coordinated')) : '') +
                '</span></span>' +
              '<span></span></button>';
          }).join('') +
        '</div>';
      }).join('') +
      '</div>' +
      '<aside class="p-side">' + (sel ? caseDetail(sel) : '') + '</aside></div>';
  }

  function caseDetail(c) {
    var actions = ['warn', 'redact', 'removeFile', 'lock', 'hide', 'remove', 'restrict', 'none'];
    return '<section class="panel">' +
      '<span class="kicker">' + esc(T('admin.case')) + ' ' + esc(c.id) + '</span>' +
      '<h2 style="font-size:16px">' + esc(L(c.summary)) + '</h2>' +
      '<p class="note">' + esc(L(c.note)) + '</p>' +

      (c.appealText ? '<div class="callout" style="margin-top:12px"><b>' + esc(T('appeal.text')) + '</b> ' + esc(L(c.appealText)) + '</div>' : '') +

      (c.reasons && c.reasons.length ? '<h3 style="font-size:13px;margin-top:16px">' + esc(T('admin.reasonsGiven')) + '</h3>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px">' + c.reasons.map(function (r) {
          return '<span class="tag">' + esc(T('report.' + r)) + '</span>';
        }).join('') + '</div>' : '') +

      (c.coordinated ? '<div class="callout warn" style="margin-top:12px"><b>' + esc(T('admin.coordinated')) + '</b> ' + esc(T('admin.coordinatedNote')) + '</div>' : '') +

      '<div class="restricted" style="margin-top:14px"><b>' + esc(T('admin.reporterMasked')) + '</b>' +
        '<span>' + esc(T('admin.reporterNote')) + '</span></div>' +
      (c.targetKind === 'evidence' ? '<div class="restricted" style="margin-top:10px"><b>' + esc(T('admin.evidenceGated')) + '</b>' +
        '<span>' + esc(T('admin.evidenceGateNote')) + '</span>' +
        '<button class="btn small ghost" type="button" style="margin-top:8px;justify-self:start">' + esc(T('admin.requestAccess')) + '</button></div>' : '') +

      '<h3 style="font-size:13px;margin-top:18px">' + esc(T('admin.decision')) + '</h3>' +
      '<p class="note">' + esc(T('admin.proportion')) + '</p>' +
      '<div class="opt-row" style="margin-top:8px">' + actions.map(function (a) {
        return '<button class="opt" type="button" data-action="' + a + '" aria-pressed="' + (state.selAction === a) + '">' + esc(T('admin.act.' + a)) + '</button>';
      }).join('') + '</div>' +

      '<div class="callout warn" style="margin-top:12px">' + esc(T('admin.noRewrite')) + '</div>' +

      '<div class="field" style="margin-top:14px"><label for="mod-reason">' + esc(T('admin.reasonToAuthor')) + '</label>' +
        '<textarea id="mod-reason" style="min-height:80px"></textarea></div>' +

      '<h3 style="font-size:13px">' + esc(T('admin.auditPreview')) + '</h3>' +
      '<div class="audit">' + esc(
        'case=' + c.id +
        '\nactor=moderator:you' +
        '\naction=' + (state.selAction || '—') +
        '\nobject=' + c.targetKind + ':' + c.targetId +
        '\nresult=' + (state.done ? 'recorded' : 'pending') +
        '\nreason=<written above>' +
        '\nreporter_identity=not_accessed' +
        '\noriginal_evidence=not_accessed'
      ) + '</div>' +

      '<button class="btn block" type="button" id="mod-commit" style="margin-top:12px">' + esc(T('admin.commit')) + '</button>' +
      (state.done ? '<div class="callout" style="margin-top:12px;border-color:var(--positive);color:var(--positive)">✓ ' + esc(T('admin.recorded')) + '</div>' : '') +
    '</section>';
  }

  /* ----- Evidence quarantine ----------------------------------------- */

  function renderEvidence() {
    var host = $('#view-evidence');
    if (!host) { return; }
    var steps = ['received', 'validated', 'scanned', 'converted', 'rasterised', 'redacted', 'published'];
    host.innerHTML =
      '<section class="a-head">' +
        '<span class="kicker">' + esc(T('admin.tab.evidence')) + '</span>' +
        '<h1 class="display">' + esc(T('admin.tab.evidence')) + '</h1>' +
      '</section>' + permissionCallout() +
      '<section class="panel">' +
        '<p class="note">' + esc(T('admin.failClosedNote')) + '</p>' +
        '<p class="note" style="margin-top:6px">' + esc(T('admin.retention')) + ' · ' + esc(T('admin.legalHoldNote')) + '</p>' +
      '</section>' +
      RK.moderation.quarantine.map(function (q) {
        return '<div class="q-item">' +
          '<div class="q-head"><b>' + esc(q.file) + '</b><span class="size">' + esc(q.size) + '</span>' +
            '<span class="size">' + esc(q.id) + '</span>' +
            (q.failed ? badge('danger', T('ev.state.failed')) : '') +
            (q.failClosed ? badge('warn', T('admin.failClosed')) : '') +
            (q.waiting ? badge('warn', T('ev.state.redact')) : '') +
            (q.stage === 'published' ? badge('good', T('admin.pl.published')) : '') +
          '</div>' +
          '<div class="pipeline">' + steps.map(function (s) {
            return '<span class="pipe-step" data-s="' + esc(q.stages[s]) + '"><span class="s"></span>' + esc(T('admin.pl.' + s)) + '</span>';
          }).join('') + '</div>' +
          '<p class="note">' + esc(L(q.note)) + '</p>' +
          (q.failed || q.failClosed ? '<p class="note" style="margin-top:6px;color:var(--positive)">' + esc(T('admin.textStays')) + '</p>' : '') +
          '<div class="restricted" style="margin-top:12px"><b>' + esc(T('admin.evidenceGated')) + '</b>' +
            '<span>' + esc(T('admin.evidenceGateNote')) + '</span></div>' +
        '</div>';
      }).join('');
  }

  /* ----- Providers & claims ------------------------------------------- */

  function renderProviders() {
    var host = $('#view-providers');
    if (!host) { return; }
    var p = RK.moderation.providers;
    host.innerHTML =
      '<section class="a-head">' +
        '<span class="kicker">' + esc(T('admin.tab.providers')) + '</span>' +
        '<h1 class="display">' + esc(T('admin.tab.providers')) + '</h1>' +
      '</section>' + permissionCallout() +
      '<section class="panel">' +
        '<h2 style="font-size:16px">' + esc(T('admin.newProfiles')) + '</h2>' +
        '<p class="note" style="margin-bottom:14px">' + esc(T('admin.newProfileNote')) + '</p>' +
        p.pending.map(function (x) {
          var dup = x.duplicateOf ? RK.doctorById(x.duplicateOf) : null;
          return '<div class="q-item">' +
            '<div class="q-head"><b>' + esc(P(x.name)) + '</b><span class="size">' + esc(x.id) + '</span>' +
              badge('warn', T('label.notVerified')) +
              (dup ? badge('danger', T('admin.possibleDup')) : badge('plain', T('prov.community'))) +
            '</div>' +
            '<table class="kv"><tbody>' +
              '<tr><th>' + esc(T('profile.specialty')) + '</th><td>' + esc(P(x.specialty)) + '</td></tr>' +
              '<tr><th>' + esc(T('profile.bmdc')) + '</th><td>' + esc(x.bmdc) + '</td></tr>' +
              '<tr><th>' + esc(T('filter.location')) + '</th><td>' + esc(P(x.city)) + '</td></tr>' +
              (dup ? '<tr><th>' + esc(T('admin.possibleDup')) + '</th><td>' + esc(P(dup.name)) + ' — ' + esc(dup.bmdc) + '</td></tr>' : '') +
            '</tbody></table>' +
            '<p class="note" style="margin-top:8px">' + esc(L(x.note)) + '</p>' +
            '<div class="mine-actions" style="margin-top:10px">' +
              (dup ? '<button class="btn small" type="button">' + esc(T('admin.merge')) + '</button>'
                   : '<button class="btn small" type="button">' + esc(T('admin.approve')) + '</button>') +
              '<button class="btn small ghost" type="button">' + esc(T('admin.reject')) + '</button>' +
            '</div>' +
            (dup ? '<p class="note" style="margin-top:8px">' + esc(T('admin.mergeNote')) + '</p>' : '') +
          '</div>';
        }).join('') +
      '</section>' +

      '<section class="panel">' +
        '<h2 style="font-size:16px">' + esc(T('admin.claims')) + '</h2>' +
        p.claims.map(function (x) {
          var d = RK.doctorById(x.doctorId);
          return '<div class="q-item">' +
            '<div class="q-head"><b>' + esc(P(d.name)) + '</b><span class="size">' + esc(x.id) + '</span></div>' +
            '<p class="note">' + esc(P(x.method)) + '</p>' +
            '<p class="note" style="margin-top:6px">' + esc(L(x.note)) + '</p>' +
            '<div class="mine-actions" style="margin-top:10px">' +
              '<button class="btn small" type="button">' + esc(T('admin.approve')) + '</button>' +
              '<button class="btn small ghost" type="button">' + esc(T('admin.reject')) + '</button>' +
            '</div>' +
          '</div>';
        }).join('') +
      '</section>' +

      '<section class="panel">' +
        '<h2 style="font-size:16px">' + esc(T('admin.protectedFields')) + '</h2>' +
        '<p class="note" style="margin-bottom:14px">' + esc(T('admin.protectedNote')) + '</p>' +
        p.fieldChanges.map(function (x) {
          var d = RK.doctorById(x.doctorId);
          return '<div class="q-item">' +
            '<div class="q-head"><b>' + esc(P(x.field)) + '</b><span class="size">' + esc(x.id) + '</span>' +
              badge(x.protected ? 'warn' : 'plain', x.protected ? T('admin.protectedFields') : T('prov.provider')) +
            '</div>' +
            '<p class="note">' + esc(P(d.name)) + '</p>' +
            '<div class="audit" style="margin-top:8px">' + esc(T('admin.wasNow')) + '\n' + esc(P(x.from)) + '\n' + esc(P(x.to)) + '</div>' +
            (x.protected ? '<div class="mine-actions" style="margin-top:10px">' +
              '<button class="btn small" type="button">' + esc(T('admin.approve')) + '</button>' +
              '<button class="btn small ghost" type="button">' + esc(T('admin.reject')) + '</button></div>'
              : '<p class="note" style="margin-top:8px;color:var(--positive)">✓ ' + esc(T('admin.protectedNote')) + '</p>') +
          '</div>';
        }).join('') +
      '</section>';
  }

  /* ---------------------------------------------------------------------
     Events
     ------------------------------------------------------------------- */

  document.addEventListener('click', function (e) {
    var el;
    if ((el = e.target.closest('[data-admin]'))) { location.hash = '#' + el.getAttribute('data-admin'); return; }
    if ((el = e.target.closest('[data-case]'))) { state.selCase = el.getAttribute('data-case'); state.done = false; renderQueue(); return; }
    if ((el = e.target.closest('[data-action]'))) { state.selAction = el.getAttribute('data-action'); renderQueue(); return; }
    if (e.target.closest('#mod-commit')) { state.done = true; renderQueue(); return; }
    if (e.target.closest('#lang')) { setLang(state.lang === 'bn' ? 'en' : 'bn'); return; }
    if (e.target.closest('#theme')) {
      var next = state.theme === 'dark' ? 'light' : state.theme === 'light' ? null : 'dark';
      setTheme(next);
      e.target.closest('#theme').setAttribute('aria-pressed', String(next === 'dark'));
      return;
    }
  });

  window.addEventListener('hashchange', route);

  /* ---------------------------------------------------------------------
     Init
     ------------------------------------------------------------------- */

  function init() {
    /* Restore preferences if any */
    try {
      var lang = localStorage.getItem('rk04.admin.lang');
      if (lang === 'bn' || lang === 'en') { state.lang = lang; }
      var theme = localStorage.getItem('rk04.admin.theme');
      if (theme === 'dark' || theme === 'light') { state.theme = theme; }
    } catch (e) {}

    if (state.lang === 'bn') {
      RK.applyLang(document, 'bn');
      var lbtn = $('#lang');
      if (lbtn) { lbtn.setAttribute('aria-pressed', 'true'); lbtn.querySelector('span').textContent = 'A'; }
    }
    if (state.theme) { document.documentElement.setAttribute('data-theme', state.theme); }

    /* Wire the admin tab buttons */
    VIEWS.forEach(function (v) {
      var btn = document.querySelector('.admin-tabs button[data-admin="' + v + '"]');
      if (!btn) { return; }
      btn.addEventListener('click', function () { location.hash = '#' + v; });
    });

    route();
  }
  init();
})();
