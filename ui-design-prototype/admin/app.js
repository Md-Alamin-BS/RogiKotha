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
    done: false,
    role: 'Admin',
    bulkSelected: {},
    bulkConfirmed: false
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
    announce('Language: ' + (lang === 'bn' ? 'Bengali' : 'English'));
  }
  /* Theme: two states (light / dark). Default follows the OS via the
     stylesheet's @media (prefers-color-scheme: dark) block — no JS
     attribute is set until the user picks. Once picked, that choice
     is remembered in localStorage. The toggle button shows the icon
     for the CURRENT active state and uses aria-pressed to expose it. */
  function setTheme(theme) {
    state.theme = theme;
    if (theme) { document.documentElement.setAttribute('data-theme', theme); }
    else { document.documentElement.removeAttribute('data-theme'); }
    try { localStorage.setItem('rk04.admin.theme', theme || ''); } catch (e) {}
    var btn = $('#theme');
    if (btn) {
      btn.setAttribute('aria-pressed', String(effectiveTheme() === 'dark'));
      var span = btn.querySelector('span');
      if (span) { span.textContent = effectiveTheme() === 'dark' ? '☾' : '☀'; }
      btn.setAttribute('title', effectiveTheme() === 'dark' ? T('a11y.themeDark') : T('a11y.themeLight'));
    }
    announce('Theme: ' + (effectiveTheme() === 'dark' ? 'dark' : 'light'));
  }
  function effectiveTheme() {
    if (state.theme === 'light' || state.theme === 'dark') { return state.theme; }
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  function setMotion(on) {
    state.motion = on ? 'on' : 'off';
    document.body.setAttribute('data-motion', state.motion);
    try { localStorage.setItem('rk04.admin.motion', state.motion); } catch (e) {}
  }

  var VIEWS = ['queue', 'evidence', 'providers', 'config', 'notifications'];

  // STORY-NFR-006: announce view/lang/theme changes to screen readers
  function announce(msg) {
    var node = document.getElementById('sr-live');
    if (node) { node.textContent = msg; }
  }

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
    if (v === 'config') { renderConfig(); }
    if (v === 'notifications') { renderNotifications(); }
    window.scrollTo({ top: 0, behavior: 'auto' });
    announce('View: ' + v);
  }

  /* ---------------------------------------------------------------------
     Renderers
     ------------------------------------------------------------------- */

  function renderAll() {
    if (state.tab === 'queue') { renderQueue(); }
    if (state.tab === 'evidence') { renderEvidence(); }
    if (state.tab === 'providers') { renderProviders(); }
    if (state.tab === 'config') { renderConfig(); }
    if (state.tab === 'notifications') { renderNotifications(); }
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
      '</section>' + permissionCallout() + queueBody() +
      (state.bulkConfirmed ? '<div class="callout" style="margin-top:14px;border-color:var(--positive);color:var(--positive)">✓ ' + esc(T('admin.bulk.done')) + '</div>' : '');
  }

  function queueBody() {
    var lanes = [
      { k: 'critical', target: T('admin.criticalTarget') },
      { k: 'standard', target: T('admin.standardTarget') },
      { k: 'appeal', target: T('admin.appealTarget') }
    ];
    // STORY-MOD-002: moderation queue lanes (critical/standard/appeals)
    var sel = RK.moderation.cases.filter(function (c) { return c.id === state.selCase; })[0];

    return '<div class="p-grid"><div>' +
      '<p class="note" style="margin-bottom:18px">' + esc(T('admin.threshold')) + '</p>' +
      // STORY-ADMIN-002: bulk preview modal toolbar
      bulkToolbar() +
      lanes.map(function (lane) {
        var list = RK.moderation.cases.filter(function (c) { return c.lane === lane.k; });
        if (!list.length) { return ''; }
        return '<div class="lane">' +
          '<div class="lane-head"><h2>' + esc(T(lane.k === 'appeal' ? 'admin.appeals' : 'admin.' + lane.k)) + '</h2>' +
            '<span class="target">· ' + esc(lane.target) + '</span></div>' +
          list.map(function (c) {
            var checked = !!state.bulkSelected[c.id];
            return '<div class="case-row" style="display:grid;grid-template-columns:24px 1fr;gap:10px;align-items:start;border-bottom:1px solid var(--rule);padding-block:6px">' +
              '<label style="display:flex;align-items:center;justify-content:center;height:34px">' +
                '<input type="checkbox" data-bulk-check="' + esc(c.id) + '"' + (checked ? ' checked' : '') + ' aria-label="' + esc(T('admin.bulk.select')) + ' ' + esc(c.id) + '">' +
              '</label>' +
              '<button class="case" type="button" data-case="' + c.id + '" aria-pressed="' + (state.selCase === c.id) + '" style="border-bottom:0;padding-block:8px">' +
                '<span><span class="id">' + esc(c.id) + '</span>' +
                  '<span class="age">' + esc(T('admin.age')) + ' ' + bn(c.ageHours) + esc(T('admin.hours')) + '</span></span>' +
                '<span><h4>' + esc(L(c.summary)) + '</h4>' +
                  '<span class="case-flags">' +
                    badge('plain', T('target.' + c.targetKind)) +
                    badge(c.autoHidden ? 'danger' : 'plain', c.autoHidden ? T('admin.autoHidden') : T('admin.stillVisible')) +
                    (c.reports ? badge('plain', bn(c.reports) + ' ' + T('admin.reports')) : '') +
                    (c.coordinated ? badge('warn', T('admin.coordinated')) : '') +
                  '</span></span>' +
                '<span></span></button>' +
            '</div>';
          }).join('') +
        '</div>';
      }).join('') +
      '</div>' +
      '<aside class="p-side">' + (sel ? caseDetail(sel) : '') + '</aside></div>';
  }

  // STORY-MOD-003: enforcement lifecycle split (warn/restrict/suspend/ban)
  function caseDetail(c) {
    var actions = ['warn', 'restrict', 'suspend', 'ban', 'redact', 'removeFile', 'lock', 'hide', 'remove', 'none'];
    var isSA = state.role === 'Super Admin';
    return '<section class="panel">' +
      '<span class="kicker">' + esc(T('admin.case')) + ' ' + esc(c.id) + '</span>' +
      '<h2 style="font-size:17px;font-weight:600;letter-spacing:-.012em">' + esc(L(c.summary)) + '</h2>' +
      '<p class="note">' + esc(L(c.note)) + '</p>' +

      (c.appealText ? '<div class="callout sub-in"><b>' + esc(T('appeal.text')) + '</b> ' + esc(L(c.appealText)) + '</div>' : '') +

      (c.reasons && c.reasons.length ? '<div class="sub"><h4 class="sub-head">' + esc(T('admin.reasonsGiven')) + '</h4>' +
        '<div style="display:flex;flex-wrap:wrap;gap:6px">' + c.reasons.map(function (r) {
          return '<span class="tag">' + esc(T('report.' + r)) + '</span>';
        }).join('') + '</div></div>' : '') +

      (c.coordinated ? '<div class="callout sub-in"><b>' + esc(T('admin.coordinated')) + '</b> ' + esc(T('admin.coordinatedNote')) + '</div>' : '') +

      '<div class="sub">' +
        '<h4 class="sub-head">' + esc(T('admin.permissions')) + '</h4>' +
        '<div class="restricted"><b>' + esc(T('admin.reporterMasked')) + '</b>' +
          '<span>' + esc(T('admin.reporterNote')) + '</span>' +
          (isSA ? '<button class="btn small" type="button" style="margin-top:8px;justify-self:start">' + esc(T('admin.reveal.audited')) + '</button>' : '') +
        '</div>' +
        (c.targetKind === 'evidence' ? '<div class="restricted" style="margin-top:8px"><b>' + esc(T('admin.evidenceGated')) + '</b>' +
          '<span>' + esc(T('admin.evidenceGateNote')) + '</span>' +
          (isSA
            ? '<button class="btn small" type="button" style="margin-top:8px;justify-self:start">' + esc(T('admin.reveal.audited')) + '</button>'
            : '<button class="btn small ghost" type="button" style="margin-top:8px;justify-self:start">' + esc(T('admin.requestAccess')) + '</button>') +
          '</div>' : '') +
      '</div>' +

      '<div class="sub">' +
        '<h4 class="sub-head">' + esc(T('admin.decision')) + '</h4>' +
        '<p class="note">' + esc(T('admin.proportion')) + '</p>' +
        '<div class="opt-row">' + actions.map(function (a) {
          return '<button class="opt" type="button" data-action="' + a + '" aria-pressed="' + (state.selAction === a) + '">' + esc(T('admin.act.' + a)) + '</button>';
        }).join('') + '</div>' +
        '<div class="callout" style="margin-top:14px">' + esc(T('admin.noRewrite')) + '</div>' +
        '<div class="field" style="margin-top:14px"><label for="mod-reason">' + esc(T('admin.reasonToAuthor')) + '</label>' +
          '<textarea id="mod-reason" style="min-height:72px"></textarea></div>' +
      '</div>' +

      '<div class="sub">' +
        '<h4 class="sub-head">' + esc(T('admin.auditPreview')) + '</h4>' +
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
        '<button class="btn block" type="button" id="mod-commit" style="margin-top:14px">' + esc(T('admin.commit')) + '</button>' +
        (state.done ? '<div class="callout" style="margin-top:12px;border-color:var(--positive);color:var(--positive)">✓ ' + esc(T('admin.recorded')) + '</div>' : '') +
      '</div>' +

      auditTimeline(c) +
    '</section>';
  }

  /* ----- Evidence quarantine ----------------------------------------- */

  // STORY-EVID-003: custody/retention pipeline renderer (panel only, no actionable controls)
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
        '<h4 class="sub-head">' + esc(T('admin.tab.evidence')) + '</h4>' +
        '<p class="note">' + esc(T('admin.failClosedNote')) + ' ' + esc(T('admin.retention')) + ' · ' + esc(T('admin.legalHoldNote')) + '</p>' +
      '</section>' +
      RK.moderation.quarantine.map(function (q) {
        return '<section class="panel">' +
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
          '<p class="note" style="margin-top:12px">' + esc(L(q.note)) + '</p>' +
          (q.failed || q.failClosed ? '<p class="note" style="margin-top:6px;color:var(--positive)">' + esc(T('admin.textStays')) + '</p>' : '') +
          '<div class="restricted" style="margin-top:14px"><b>' + esc(T('admin.evidenceGated')) + '</b>' +
            '<span>' + esc(T('admin.evidenceGateNote')) + '</span></div>' +
        '</section>';
      }).join('');
  }

  /* ----- Providers & claims ------------------------------------------- */

  // STORY-DIR-002: admin providers view with pending claims + duplicate merge
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
        '<h4 class="sub-head">' + esc(T('admin.newProfiles')) + '</h4>' +
        '<p class="note" style="margin-bottom:14px">' + esc(T('admin.newProfileNote')) + '</p>' +
        p.pending.map(function (x) {
          var dup = x.duplicateOf ? RK.doctorById(x.duplicateOf) : null;
          return '<div class="sub">' +
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
        '<h4 class="sub-head">' + esc(T('admin.claims')) + '</h4>' +
        p.claims.map(function (x) {
          var d = RK.doctorById(x.doctorId);
          return '<div class="sub">' +
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
        '<h4 class="sub-head">' + esc(T('admin.protectedFields')) + '</h4>' +
        '<p class="note" style="margin-bottom:14px">' + esc(T('admin.protectedNote')) + '</p>' +
        p.fieldChanges.map(function (x) {
          var d = RK.doctorById(x.doctorId);
          return '<div class="sub">' +
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

  /* ----- Role switcher (masthead chip) -------------------------------- */

  // STORY-ADMIN-001: role switcher demo control
  var ROLE_ORDER = ['Super Admin', 'Admin', 'Moderator'];
  function roleKey(role) {
    if (role === 'Super Admin') { return 'sa'; }
    if (role === 'Moderator') { return 'mod'; }
    return 'admin';
  }
  function setRole(role) {
    if (ROLE_ORDER.indexOf(role) === -1) { return; }
    state.role = role;
    try { localStorage.setItem('rk04.admin.role', role); } catch (e) {}
    var btn = $('#role');
    if (btn) {
      var span = btn.querySelector('span');
      if (span) { span.textContent = role === 'Super Admin' ? 'SA' : role === 'Admin' ? 'Ad' : 'Mo'; }
      btn.setAttribute('title', role + ' — ' + T('admin.act.cycleTip'));
      btn.setAttribute('aria-pressed', String(role === 'Super Admin'));
    }
    /* Mutate the prototype's permission surface so the role change is
       visible without code branching: Super Admin sees the reveal
       buttons; everyone else sees the existing restricted boxes. */
    RK.moderation.permissions.reporterIdentity  = (role === 'Super Admin');
    RK.moderation.permissions.originalEvidence  = (role === 'Super Admin');
    renderAll();
  }

  /* ----- #config view (versioned runtime configuration) -------------- */

  // STORY-ADMIN-001: versioned runtime configuration + capability matrix
  function loadConfig() {
    try {
      var raw = localStorage.getItem('rk04.admin.config');
      if (!raw) { return Object.assign({}, RK.moderation.thresholds); }
      var parsed = JSON.parse(raw);
      return Object.assign({}, RK.moderation.thresholds, parsed);
    } catch (e) {
      return Object.assign({}, RK.moderation.thresholds);
    }
  }
  function saveConfig(cfg) {
    try { localStorage.setItem('rk04.admin.config', JSON.stringify(cfg)); } catch (e) {}
  }
  function renderConfig() {
    var host = $('#view-config');
    if (!host) { return; }
    var cfg = loadConfig();
    var matrix = {
      sa:    { reports: true,  actions: true,  identity: true,  originalEvidence: true  },
      admin: { reports: true,  actions: true,  identity: false, originalEvidence: false },
      mod:   { reports: true,  actions: true,  identity: false, originalEvidence: false }
    };
    var yes = '✓';
    var no  = '—';
    function row(roleKey) {
      var r = matrix[roleKey];
      return '<tr>' +
        '<th>' + esc(T('admin.config.role.' + roleKey)) + '</th>' +
        '<td>' + (r.reports ? yes : no) + '</td>' +
        '<td>' + (r.actions ? yes : no) + '</td>' +
        '<td>' + (r.identity ? yes : no) + '</td>' +
        '<td>' + (r.originalEvidence ? yes : no) + '</td>' +
      '</tr>';
    }
    host.innerHTML =
      '<section class="a-head">' +
        '<span class="kicker">' + esc(T('admin.tab.config')) + '</span>' +
        '<h1 class="display">' + esc(T('admin.config.title')) + '</h1>' +
      '</section>' + permissionCallout() +
      '<section class="panel">' +
        '<div class="sub">' +
          '<h4 class="sub-head">' + esc(T('admin.config.thresholds')) + '</h4>' +
          '<div class="field" style="margin-top:8px"><label>' + esc(T('admin.config.threshold.five')) + '</label>' +
            '<input id="cfg-five" type="number" min="2" max="50" value="' + esc(cfg.fiveAccountHide) + '"></div>' +
          '<div class="field" style="margin-top:8px"><label>' + esc(T('admin.config.threshold.criticalHours')) + '</label>' +
            '<input id="cfg-critical" type="number" min="1" max="168" value="' + esc(cfg.criticalHours) + '"></div>' +
          '<div class="field" style="margin-top:8px"><label>' + esc(T('admin.config.threshold.standardDays')) + '</label>' +
            '<input id="cfg-standard" type="number" min="1" max="30" value="' + esc(cfg.standardDays) + '"></div>' +
        '</div>' +
        '<div class="sub">' +
          '<h4 class="sub-head">' + esc(T('admin.config.retention')) + '</h4>' +
          '<div class="field" style="margin-top:8px"><label>' + esc(T('admin.config.retention.defaultDays')) + '</label>' +
            '<input id="cfg-retdef" type="number" min="1" max="3650" value="' + esc(cfg.retentionDefaultDays) + '"></div>' +
          '<div class="field" style="margin-top:8px"><label>' + esc(T('admin.config.retention.maxDays')) + '</label>' +
            '<input id="cfg-retmax" type="number" min="1" max="36500" value="' + esc(cfg.retentionMaxDays) + '"></div>' +
        '</div>' +
        '<div class="sub">' +
          '<h4 class="sub-head">' + esc(T('admin.config.roles')) + '</h4>' +
          '<p class="note" style="margin-bottom:8px">' + esc(T('admin.role.current')) + ': <b>' + esc(state.role) + '</b></p>' +
          '<table class="kv"><thead><tr>' +
            '<th></th>' +
            '<th>' + esc(T('admin.config.cap.reports')) + '</th>' +
            '<th>' + esc(T('admin.config.cap.actions')) + '</th>' +
            '<th>' + esc(T('admin.config.cap.identity')) + '</th>' +
            '<th>' + esc(T('admin.config.cap.originalEvidence')) + '</th>' +
          '</tr></thead><tbody>' +
            row('sa') + row('admin') + row('mod') +
          '</tbody></table>' +
        '</div>' +
      '</section>';
    ['five', 'critical', 'standard', 'retdef', 'retmax'].forEach(function (k) {
      var el = document.getElementById('cfg-' + k);
      if (!el) { return; }
      el.addEventListener('change', function () {
        cfg = loadConfig();
        if (k === 'five')     { cfg.fiveAccountHide    = parseInt(el.value, 10) || 5; }
        if (k === 'critical') { cfg.criticalHours      = parseInt(el.value, 10) || 24; }
        if (k === 'standard') { cfg.standardDays       = parseInt(el.value, 10) || 3; }
        if (k === 'retdef')   { cfg.retentionDefaultDays = parseInt(el.value, 10) || 90; }
        if (k === 'retmax')   { cfg.retentionMaxDays     = parseInt(el.value, 10) || 3650; }
        saveConfig(cfg);
      });
    });
  }

  /* ----- #notifications view ----------------------------------------- */

  // STORY-NOTIF-001: notification triage surface
  function renderNotifications() {
    var host = $('#view-notifications');
    if (!host) { return; }
    var list = (RK.moderation.notifications || []);
    host.innerHTML =
      '<section class="a-head">' +
        '<span class="kicker">' + esc(T('admin.tab.notifications')) + '</span>' +
        '<h1 class="display">' + esc(T('admin.notif.title')) + '</h1>' +
      '</section>' + permissionCallout() +
      '<section class="panel">' +
        (list.length ? list.map(function (n) {
          return '<div class="sub">' +
            '<div class="q-head"><b>' + esc(L(n.target)) + '</b>' +
              '<span class="size">' + esc(L(n.when)) + '</span>' +
              badge('plain', T('admin.notif.kind.' + n.kind)) +
            '</div>' +
            '<p class="note" style="margin-top:6px">' + esc(L(n.text)) + '</p>' +
            '<div class="mine-actions" style="margin-top:10px">' +
              '<button class="btn small ghost" type="button">' + esc(T('admin.notif.action.open')) + '</button>' +
              '<button class="btn small" type="button">' + esc(T('admin.notif.action.ack')) + '</button>' +
            '</div>' +
          '</div>';
        }).join('') : '<p class="note">' + esc(T('admin.bulk.empty')) + '</p>') +
      '</section>';
  }

  /* ----- Relative time formatter (audit timeline) -------------------- */

  // STORY-NFR-009: audit timeline list
  function relTime(min) {
    if (min < 60) { return bn(min) + ' ' + T('admin.timeline.timeAgo'); }
    var h = Math.floor(min / 60);
    if (h < 24) { return bn(h) + ' h ' + T('admin.timeline.timeAgo'); }
    var d = Math.floor(h / 24);
    return bn(d) + ' d ' + T('admin.timeline.timeAgo');
  }
  function auditTimeline(c) {
    var events = RK.moderation.auditLog || [];
    var rows = events.filter(function (e) { return e.case === c.id; })
                     .sort(function (a, b) { return a.timeMin - b.timeMin; })
                     .slice(-10)
                     .reverse();
    if (!rows.length) { return ''; }
    return '<div class="sub">' +
      '<h4 class="sub-head">' + esc(T('admin.timeline.recent')) + '</h4>' +
      '<ol style="list-style:none;padding:0;margin:0">' + rows.map(function (e) {
        return '<li style="display:grid;grid-template-columns:120px minmax(0,1fr) auto;gap:10px;padding:8px 0;border-bottom:1px solid var(--rule)">' +
          '<span class="id" style="font-family:var(--mono);font-size:11.5px;color:var(--ink-faint)">' + esc(relTime(e.timeMin)) + '</span>' +
          '<span style="font-size:13px"><b>' + esc(e.action) + '</b> · ' + esc(e.actor) + ' · <span class="note">' + esc(c.id) + '</span></span>' +
          '<span class="note" style="font-size:11px">' + esc(e.targetId) + '</span>' +
        '</li>';
      }).join('') + '</ol>' +
    '</div>';
  }

  /* ----- Bulk-preview toolbar (queue view) --------------------------- */

  // STORY-ADMIN-002: bulk preview modal toolbar
  function bulkToolbar() {
    var n = Object.keys(state.bulkSelected).filter(function (k) { return state.bulkSelected[k]; }).length;
    return '<div class="sub" style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;margin-bottom:8px">' +
      '<span class="kicker" style="margin:0">' + esc(T('admin.bulk.toolbar')) + '</span>' +
      '<button class="btn small ghost" type="button" data-bulk="selectCritical">' + esc(T('admin.bulk.selectCritical')) + '</button>' +
      '<button class="btn small' + (n ? '' : ' ghost') + '" type="button" data-bulk="preview"' + (n ? '' : ' disabled aria-disabled="true"') + '>' +
        esc(T('admin.bulk.preview')) + ' (' + bn(n) + ')' +
      '</button>' +
    '</div>';
  }
  function openBulkSheet() {
    var ids = Object.keys(state.bulkSelected).filter(function (k) { return state.bulkSelected[k]; });
    var cases = RK.moderation.cases.filter(function (c) { return ids.indexOf(c.id) !== -1; });
    var body = cases.length ? cases.map(function (c) {
      return '<div class="sub">' +
        '<div class="q-head"><b>' + esc(c.id) + '</b>' +
          badge('plain', T('target.' + c.targetKind)) +
          '<span class="size">· ' + esc(T('admin.' + c.lane)) + '</span>' +
        '</div>' +
        '<p class="note" style="margin-top:4px">' + esc(L(c.summary)) + '</p>' +
      '</div>';
    }).join('') : '<p class="note">' + esc(T('admin.bulk.empty')) + '</p>';
    var overlay = $('#overlay');
    var sheetBody = $('#sheet-body');
    var sheetTitle = $('#sheet-title');
    if (!overlay || !sheetBody) { return; }
    sheetTitle.textContent = T('admin.bulk.preview') + ' (' + ids.length + ')';
    sheetBody.innerHTML =
      body +
      '<div class="mine-actions" style="margin-top:16px;justify-content:flex-end">' +
        '<button class="btn small ghost" type="button" id="bulk-cancel">' + esc(T('admin.bulk.cancel')) + '</button>' +
        '<button class="btn small" type="button" id="bulk-confirm">' + esc(T('admin.bulk.confirm')) + '</button>' +
      '</div>';
    overlay.hidden = false;
  }
  function closeBulkSheet() {
    var overlay = $('#overlay');
    if (overlay) { overlay.hidden = true; }
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
      /* One click flips between light and dark. If the user has never
         picked, the current state is whatever the OS says — flip to
         the opposite, then remember it. */
      setTheme(effectiveTheme() === 'dark' ? 'light' : 'dark');
      return;
    }
    if (e.target.closest('#role')) {
      var idx = ROLE_ORDER.indexOf(state.role);
      setRole(ROLE_ORDER[(idx + 1) % ROLE_ORDER.length]);
      return;
    }
    if ((el = e.target.closest('[data-bulk]'))) {
      var cmd = el.getAttribute('data-bulk');
      if (cmd === 'selectCritical') {
        RK.moderation.cases.filter(function (c) { return c.lane === 'critical'; })
          .forEach(function (c) { state.bulkSelected[c.id] = true; });
        renderQueue();
        return;
      }
      if (cmd === 'preview') { openBulkSheet(); return; }
    }
    if ((el = e.target.closest('[data-bulk-check]'))) {
      var id = el.getAttribute('data-bulk-check');
      state.bulkSelected[id] = !!el.checked;
      renderQueue();
      return;
    }
    if (e.target.closest('#bulk-confirm')) {
      state.bulkConfirmed = true;
      closeBulkSheet();
      var live = $('#sr-live');
      if (live) { live.textContent = T('admin.bulk.done'); }
      renderQueue();
      return;
    }
    if (e.target.closest('#bulk-cancel') || e.target.closest('#sheet-close')) {
      closeBulkSheet();
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
      var role = localStorage.getItem('rk04.admin.role');
      if (ROLE_ORDER.indexOf(role) !== -1) { state.role = role; }
    } catch (e) {}

    if (state.lang === 'bn') {
      RK.applyLang(document, 'bn');
      var lbtn = $('#lang');
      if (lbtn) { lbtn.setAttribute('aria-pressed', 'true'); lbtn.querySelector('span').textContent = 'A'; }
    }
    if (state.theme) { document.documentElement.setAttribute('data-theme', state.theme); }
    /* Sync the theme button icon + aria-pressed with whatever is
       actually visible (could be system default, not user-picked). */
    var tbtn = $('#theme');
    if (tbtn) {
      tbtn.setAttribute('aria-pressed', String(effectiveTheme() === 'dark'));
      var tspan = tbtn.querySelector('span');
      if (tspan) { tspan.textContent = effectiveTheme() === 'dark' ? '☾' : '☀'; }
    }
    /* Sync the role chip + permissions surface */
    setRole(state.role);

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
