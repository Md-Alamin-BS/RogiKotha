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
    bulkConfirmed: false,
    /* Demo-local staff decisions. Nothing leaves the page. */
    decisions: {},   /* itemId -> 'approved' | 'rejected' | 'merged' */
    revealed: {},    /* gate key -> 'revealed' | 'requested' */
    acked: {},       /* notification key -> true */
    /* STORY-AUTH-001/002: static auth simulation for the staff console.
       ASSUMPTION(D-001): the console still opens directly on #queue by
       default, matching every pre-existing route/smoke expectation -
       staffSignedIn only gates the new #sign-in/#approve-device/#security
       walkthrough this task adds, not the rest of the console. ISS-023. */
    staffSignedIn: true,
    authError: null,
    deviceTrusted: false,
    approveToken: false,
    approveAttempts: 0,
    revokedDevices: [],
    securityPasswordChanged: false,
    stepUpUntil: 0,
    pendingStepUp: null
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

  /* =====================================================================
     STORY-AUTH-001/002: shared markup for the staff auth forms.
     ASSUMPTION(D-001): admin/styles.css has no .link-btn text-button class
     (only the patient stylesheet does), and the task caps new CSS classes
     at .field-error and .ctl.account - so secondary text actions here reuse
     the existing .btn.ghost.small instead of introducing one. ISS-024.
     ===================================================================== */
  function authErrMsg(view, name) {
    var e = state.authError;
    return (e && e.view === view && e.fields && e.fields[name]) || '';
  }
  function authField(view, name, labelKey, type, hintKey, extraAttrs) {
    var err = authErrMsg(view, name);
    var fid = 'f-' + view + '-' + name, eid = 'err-' + view + '-' + name;
    return '<div class="field">' +
      '<label for="' + fid + '">' + esc(T(labelKey)) + '</label>' +
      (hintKey ? '<p class="note">' + esc(T(hintKey)) + '</p>' : '') +
      '<input id="' + fid + '" name="' + name + '" type="' + type + '"' +
        (err ? ' aria-invalid="true" aria-describedby="' + eid + '"' : '') +
        (extraAttrs || '') + '>' +
      (err ? '<p class="field-error" id="' + eid + '">' + esc(err) + '</p>' : '') +
    '</div>';
  }
  function authPasswordField(view, name, labelKey, hintKey) {
    var err = authErrMsg(view, name);
    var fid = 'f-' + view + '-' + name, eid = 'err-' + view + '-' + name;
    return '<div class="field">' +
      '<label for="' + fid + '">' + esc(T(labelKey)) + '</label>' +
      (hintKey ? '<p class="note">' + esc(T(hintKey)) + '</p>' : '') +
      '<input id="' + fid + '" name="' + name + '" type="password"' +
        (err ? ' aria-invalid="true" aria-describedby="' + eid + '"' : '') + '>' +
      '<p style="margin-top:6px"><button class="btn ghost small" type="button" data-toggle-pw="' + fid + '" aria-pressed="false">' + esc(T('auth.showPassword')) + '</button></p>' +
      (err ? '<p class="field-error" id="' + eid + '">' + esc(err) + '</p>' : '') +
    '</div>';
  }
  function authErrorSummary(view) {
    var e = state.authError;
    if (!e || e.view !== view || !e.fields) { return ''; }
    var names = Object.keys(e.fields);
    if (!names.length) { return ''; }
    return '<div class="callout warn" id="auth-error-summary-' + view + '" tabindex="-1">' +
      '<b>' + esc(T('auth.errorSummary')) + '</b>' +
      '<ul>' + names.map(function (n) { return '<li><a href="#f-' + view + '-' + n + '">' + esc(e.fields[n]) + '</a></li>'; }).join('') + '</ul>' +
    '</div>';
  }
  function focusAuthSummary(view) {
    var s = $('#auth-error-summary-' + view);
    if (s) { s.focus(); }
  }

  /* A decided item shows its outcome and the audit promise instead of
     offering the action again. */
  function decided(id) { return state.decisions[id]; }
  function decisionNote(id) {
    return '<p class="note" style="margin-top:10px;color:var(--positive)">✓ ' +
      esc(T('admin.done.' + state.decisions[id])) + '</p>';
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

  var VIEWS = ['queue', 'evidence', 'providers', 'config', 'notifications',
               /* STORY-AUTH-001/002 - not in NAV_GROUPS, not navigation */
               'signin', 'approve', 'security'];
  // slug (as it appears in the address bar) -> internal view name, for the
  // handful of auth routes whose slug differs from the view name; every
  // other view's slug and name are identical, per the existing route().
  var ADMIN_AUTH_SLUG = { 'sign-in': 'signin', 'approve-device': 'approve' };

  /* ---------------------------------------------------------------------
     Navigation

     The console used to navigate by five identical pills: no icons, no
     grouping, no counts, and <button> rather than <a>, so there was no
     middle-click, no open-in-new-tab and no aria-current. The grouping
     below carries real meaning — queue / evidence / providers are things
     you WORK, notifications / config are things you OVERSEE — and the
     counts say how much is waiting without making anyone click in.
     ------------------------------------------------------------------- */

  var ICONS = {
    inbox:  '<path d="M4 13h4l1.6 2.6h4.8L16 13h4"/><path d="M6 4h12l3 9v7H3v-7z"/>',
    shield: '<path d="M12 3.2 19 6v5.8c0 4-2.8 7-7 9-4.2-2-7-5-7-9V6z"/><path d="m9 12 2.2 2.2L15.4 10"/>',
    idcard: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2"/><path d="M14 10h4M14 14h4M6.2 16.2c.9-1.8 4.7-1.8 5.6 0"/>',
    bell:   '<path d="M18.5 16.5V11a6.5 6.5 0 1 0-13 0v5.5L4 18.5h16z"/><path d="M10 21.5h4"/>',
    sliders:'<path d="M4 7.5h9M17.5 7.5H20M4 16.5h3.5M12 16.5h8"/><circle cx="15" cy="7.5" r="2.4"/><circle cx="9.5" cy="16.5" r="2.4"/>'
  };
  function icon(name) {
    return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false" ' +
      'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" ' +
      'stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
  }

  var NAV_GROUPS = [
    { label: { en: 'Casework', bn: 'কেসের কাজ' }, items: [
      { id: 'queue',    icon: 'inbox',  key: 'admin.tab.queue' },
      { id: 'evidence', icon: 'shield', key: 'admin.tab.evidence' },
      { id: 'providers',icon: 'idcard', key: 'admin.tab.providers' }
    ] },
    { label: { en: 'Oversight', bn: 'তদারকি' }, items: [
      { id: 'notifications', icon: 'bell',    key: 'admin.tab.notifications' },
      { id: 'config',        icon: 'sliders', key: 'admin.tab.config' }
    ] }
  ];

  function navCounts() {
    var m = RK.moderation;
    return {
      queue:         m.cases.length,
      critical:      m.cases.filter(function (c) { return c.lane === 'critical'; }).length,
      evidence:      m.quarantine.filter(function (q) { return q.stage !== 'published'; }).length,
      providers:     m.providers.pending.length + (m.providers.claims || []).length,
      notifications: (m.notifications || []).filter(function (n, i) { return !state.acked['n' + i]; }).length,
      config:        0
    };
  }
  function navItemById(id) {
    for (var g = 0; g < NAV_GROUPS.length; g++) {
      for (var i = 0; i < NAV_GROUPS[g].items.length; i++) {
        if (NAV_GROUPS[g].items[i].id === id) { return NAV_GROUPS[g].items[i]; }
      }
    }
    return NAV_GROUPS[0].items[0];
  }
  function navGroupOf(id) {
    for (var g = 0; g < NAV_GROUPS.length; g++) {
      for (var i = 0; i < NAV_GROUPS[g].items.length; i++) {
        if (NAV_GROUPS[g].items[i].id === id) { return NAV_GROUPS[g].label; }
      }
    }
    return NAV_GROUPS[0].label;
  }

  function renderNav() {
    var host = $('#topnav');
    if (!host) { return; }
    var c = navCounts();
    var html = '';
    NAV_GROUPS.forEach(function (g, gi) {
      if (gi) { html += '<span class="nav-sep" aria-hidden="true"></span>'; }
      html += g.items.map(function (it) {
        var n = c[it.id];
        /* The queue badge goes urgent when anything sits in the critical
           lane — the one count on this screen that carries a deadline. */
        var urgent = it.id === 'queue' && c.critical > 0;
        return '<a class="top-item" href="#' + it.id + '" data-admin="' + it.id + '"' +
          (state.tab === it.id ? ' aria-current="page"' : '') + '>' +
          icon(it.icon) + '<span>' + esc(T(it.key)) + '</span>' +
          (n ? '<span class="count' + (urgent ? ' urgent' : '') + '">' + bn(n) + '</span>' : '') +
        '</a>';
      }).join('');
    });
    host.innerHTML = html;
  }

  function renderTabBar() {
    var host = $('#tabbar');
    if (!host) { return; }
    var c = navCounts();
    /* Iterate the nav groups, not VIEWS — VIEWS is route order (…config,
       notifications) and would put the tab bar out of step with the top
       nav, which is grouped Casework then Oversight. */
    var order = NAV_GROUPS.reduce(function (all, g) { return all.concat(g.items); }, []);
    host.innerHTML = order.map(function (it) {
      var id = it.id;
      var n = c[id];
      var urgent = id === 'queue' && c.critical > 0;
      return '<a class="tab-item" href="#' + id + '" data-admin="' + id + '"' +
        (state.tab === id ? ' aria-current="page"' : '') + '>' +
        icon(it.icon) +
        (n ? '<span class="tab-dot' + (urgent ? ' urgent' : '') + '">' + bn(n) + '</span>' : '') +
        '<span>' + esc(T(it.key).split(' ')[0]) + '</span>' +
      '</a>';
    }).join('');
  }

  function renderCrumbs() {
    var host = $('#crumbs');
    if (!host) { return; }
    host.innerHTML =
      '<span>' + esc(T('admin.portal')) + '</span>' +
      '<span class="sep" aria-hidden="true">/</span>' +
      '<span>' + esc(L(navGroupOf(state.tab))) + '</span>' +
      '<span class="sep" aria-hidden="true">/</span>' +
      '<b>' + esc(T(navItemById(state.tab).key)) + '</b>';
  }

  // STORY-NFR-006: announce view/lang/theme changes to screen readers
  function announce(msg) {
    var node = document.getElementById('sr-live');
    if (node) { node.textContent = msg; }
  }

  function route() {
    var raw = (location.hash || '#queue').replace('#', '');
    var mapped = ADMIN_AUTH_SLUG[raw];
    var v = mapped || (VIEWS.indexOf(raw) === -1 ? 'queue' : raw);
    state.tab = v;
    document.body.setAttribute('data-view', v);
    VIEWS.forEach(function (n) { var el = $('#view-' + n); if (el) { el.hidden = (n !== v); } });
    // STORY-AUTH-001/002: the auth screens have no console chrome
    var isAuthView = (v === 'signin' || v === 'approve' || v === 'security');
    var topnav = $('#topnav'), tabbar = $('#tabbar'), crumbs = $('#crumbs');
    if (topnav) { topnav.hidden = isAuthView; }
    if (tabbar) { tabbar.hidden = isAuthView; }
    if (crumbs) { crumbs.hidden = isAuthView; }
    if (!isAuthView) { renderNav(); renderTabBar(); renderCrumbs(); }
    if (v === 'queue') { renderQueue(); }
    if (v === 'evidence') { renderEvidence(); }
    if (v === 'providers') { renderProviders(); }
    if (v === 'config') { renderConfig(); }
    if (v === 'notifications') { renderNotifications(); }
    if (v === 'signin') { renderSignin(); }
    if (v === 'approve') { renderApprove(); }
    if (v === 'security') { renderSecurity(); }
    window.scrollTo({ top: 0, behavior: 'auto' });
    announce('View: ' + v);
  }

  /* ---------------------------------------------------------------------
     Renderers
     ------------------------------------------------------------------- */

  function renderAll() {
    renderNav();
    renderTabBar();
    renderCrumbs();
    if (state.tab === 'queue') { renderQueue(); }
    if (state.tab === 'evidence') { renderEvidence(); }
    if (state.tab === 'providers') { renderProviders(); }
    if (state.tab === 'config') { renderConfig(); }
    if (state.tab === 'notifications') { renderNotifications(); }
    // STORY-AUTH-001/002
    renderSignin(); renderApprove(); renderSecurity();
    renderStaffAccount();
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
        '<h1 class="display">' + esc(T('admin.tab.queue')) + '</h1>' +
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
        /* Each lane is its own TRAY — a rectangle on the raised plane with
           40px of page colour between it and the next. The lane heading no
           longer carries a rule, because a group boundary must not use the
           same mark as the rows inside it. */
        return '<div class="lane" data-tier="' + esc(lane.k) + '">' +
          '<div class="lane-head"><h2>' + esc(T(lane.k === 'appeal' ? 'admin.appeals' : 'admin.' + lane.k)) + '</h2>' +
            '<span class="lane-count">' + bn(list.length) + '</span>' +
            '<span class="target">' + esc(lane.target) + '</span></div>' +
          list.map(function (c) {
            var checked = !!state.bulkSelected[c.id];
            return '<div class="case-row">' +
              '<label style="display:flex;align-items:center;justify-content:center">' +
                '<input type="checkbox" data-bulk-check="' + esc(c.id) + '"' + (checked ? ' checked' : '') + ' aria-label="' + esc(T('admin.bulk.select')) + ' ' + esc(c.id) + '">' +
              '</label>' +
              '<button class="case" type="button" data-case="' + c.id + '" aria-pressed="' + (state.selCase === c.id) + '">' +
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
          (isSA ? (state.revealed['reporter:' + c.id]
            ? '<span class="note" style="margin-top:8px;color:var(--positive)">✓ ' + esc(T('admin.done.revealed')) + '</span>'
            : '<button class="btn small" type="button" style="margin-top:8px;justify-self:start" data-reveal="reporter:' + c.id + '">' + esc(T('admin.reveal.audited')) + '</button>') : '') +
        '</div>' +
        (c.targetKind === 'evidence' ? '<div class="restricted" style="margin-top:8px"><b>' + esc(T('admin.evidenceGated')) + '</b>' +
          '<span>' + esc(T('admin.evidenceGateNote')) + '</span>' +
          (state.revealed['evidence:' + c.id]
            ? '<span class="note" style="margin-top:8px;color:var(--positive)">✓ ' + esc(T('admin.done.' + state.revealed['evidence:' + c.id])) + '</span>'
            : isSA
              ? '<button class="btn small" type="button" style="margin-top:8px;justify-self:start" data-reveal="evidence:' + c.id + '">' + esc(T('admin.reveal.audited')) + '</button>'
              : '<button class="btn small ghost" type="button" style="margin-top:8px;justify-self:start" data-request="evidence:' + c.id + '">' + esc(T('admin.requestAccess')) + '</button>') +
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
          '\noriginal_evidence=not_accessed' +
          // STORY-AUTH-002: the audit row carries step_up when this action
          // was gated behind the password recheck (spec §4.4)
          (state.stepUpUntil > Date.now() ? '\nstep_up=true' : '')
        ) + '</div>' +
        (state.done ? '<div class="callout" style="margin-top:12px;border-color:var(--positive);color:var(--positive)">✓ ' + esc(T('admin.recorded')) + '</div>' : '') +
      '</div>' +

      auditTimeline(c) +

      /* The console had no commit action at all — ten option buttons, a
         textarea, and no submit, so the page that exists to record a
         moderation decision had no way to finish the job. One solid
         accent fill, docked at the foot of the tray: at 8.67:1 against
         the tray it is the only object besides the plane edges that
         survives a hard squint. */
      '<div class="dock">' +
        /* Name what is about to be committed, not the guidance — the
           proportionality line is already on screen a few rows above, and
           repeating it here wasted the one place that can say WHICH case
           and WHICH action the button will record. */
        '<span class="note">' + esc(T('admin.case') + ' ' + c.id) +
          (state.selAction ? ' · <b>' + esc(T('admin.act.' + state.selAction)) + '</b>' : '') + '</span>' +
        '<button class="btn primary" type="button" id="mod-commit">' + esc(T('admin.commit')) + '</button>' +
      '</div>' +
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
        '<h1 class="display">' + esc(T('admin.tab.evidence')) + '</h1>' +
      '</section>' + permissionCallout() +
      /* This panel states the custody policy; it is not a second copy of
         the page title, which is what it read as once the a-head kicker
         was removed. */
      '<section class="panel">' +
        '<h4 class="sub-head">' + esc(T('admin.pipeline')) + '</h4>' +
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
            (decided(x.id) ? decisionNote(x.id) : '<div class="mine-actions" style="margin-top:10px">' +
              (dup ? '<button class="btn small" type="button" data-decide="' + x.id + ':merged">' + esc(T('admin.merge')) + '</button>'
                   : '<button class="btn small" type="button" data-decide="' + x.id + ':approved">' + esc(T('admin.approve')) + '</button>') +
              '<button class="btn small ghost" type="button" data-decide="' + x.id + ':rejected">' + esc(T('admin.reject')) + '</button>' +
            '</div>') +
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
            (decided(x.id) ? decisionNote(x.id) : '<div class="mine-actions" style="margin-top:10px">' +
              '<button class="btn small" type="button" data-decide="' + x.id + ':approved">' + esc(T('admin.approve')) + '</button>' +
              '<button class="btn small ghost" type="button" data-decide="' + x.id + ':rejected">' + esc(T('admin.reject')) + '</button>' +
            '</div>') +
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
            (x.protected ? (decided(x.id) ? decisionNote(x.id) : '<div class="mine-actions" style="margin-top:10px">' +
              '<button class="btn small" type="button" data-decide="' + x.id + ':approved">' + esc(T('admin.approve')) + '</button>' +
              '<button class="btn small ghost" type="button" data-decide="' + x.id + ':rejected">' + esc(T('admin.reject')) + '</button></div>')
              : '<p class="note" style="margin-top:8px;color:var(--positive)">✓ ' + esc(T('admin.protectedNote')) + '</p>') +
          '</div>';
        }).join('') +
      '</section>';
  }

  /* =====================================================================
     STORY-AUTH-001/002: staff auth screens (spec §4). Static simulation
     only - no real credential check, no real device trust.
     ===================================================================== */

  // A fixed fictional signed-in staff identity for the account entry, since
  // the console (unlike the patient prototype) has no notion of "the
  // current user" beyond the role chip.
  var STAFF_USER = { en: 'Rahim Uddin', bn: 'রহিম উদ্দিন' };
  function staffInitials() {
    var parts = (P(STAFF_USER) || '').split(/\s+/).filter(Boolean);
    return (parts[0] || '').charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '');
  }

  // STORY-AUTH-001: renderSignin - non-staff email is refused; anything
  // else either lands in the queue (trusted device) or goes to approval.
  function renderSignin() {
    var host = $('#view-signin');
    if (!host) { return; }
    host.innerHTML =
      '<section class="panel" style="max-width:480px;margin:40px auto">' +
        '<span class="kicker">' + esc(T('staff.signIn.kicker')) + '</span>' +
        '<h1 class="display">' + esc(T('staff.signIn.title')) + '</h1>' +
        authErrorSummary('signin') +
        '<form id="staff-signin-form" novalidate>' +
          authField('signin', 'email', 'auth.email', 'email') +
          authPasswordField('signin', 'password', 'auth.password') +
          '<button class="btn primary" type="submit" style="margin-top:6px">' + esc(T('staff.signIn.submit')) + '</button>' +
        '</form>' +
        '<p class="note" style="margin-top:14px">' + esc(T('staff.signIn.note')) + ' <a href="../index.html">RogiKotha</a></p>' +
      '</section>';
  }

  // STORY-AUTH-002: renderApprove - new-device approval (spec §4.2)
  function renderApprove() {
    var host = $('#view-approve');
    if (!host) { return; }
    var body;
    if (state.approveToken) {
      body =
        '<h1 class="display">' + esc(T('staff.device.recheck')) + '</h1>' +
        authErrorSummary('approve') +
        '<form id="staff-approve-form" novalidate>' +
          authPasswordField('approve', 'password', 'auth.password') +
          '<button class="btn primary" type="submit" style="margin-top:6px">' + esc(T('staff.device.trust')) + '</button>' +
        '</form>';
    } else {
      body =
        '<h1 class="display">' + esc(T('staff.device.title')) + '</h1>' +
        '<p>' + esc(T('staff.device.body')) + '</p>' +
        '<table class="kv" style="margin-top:14px"><tbody>' +
          '<tr><th>' + esc(T('auth.security.device')) + '</th><td>Chrome on Windows</td></tr>' +
          '<tr><th>' + esc(T('auth.security.firstSeen')) + '</th><td>' + esc(state.lang === 'bn' ? 'এইমাত্র' : 'Just now') + '</td></tr>' +
        '</tbody></table>' +
        /* ASSUMPTION(D-001): no dedicated dev-only "simulate the emailed
           approval link" copy exists in spec §5 (§4.2 explicitly says there
           is no resend button); reusing auth.verify.devInbox for the same
           reason as the patient verify screen. ISS-021. */
        '<p style="margin-top:14px"><button class="btn ghost small" type="button" data-approve-simulate="1">' + esc(T('auth.verify.devInbox')) + '</button></p>';
    }
    host.innerHTML = '<section class="panel" style="max-width:480px;margin:40px auto">' + body + '</section>';
  }

  // STORY-AUTH-002: renderSecurity - trusted devices, sessions, password
  function renderSecurity() {
    var host = $('#view-security');
    if (!host) { return; }
    if (!state.staffSignedIn) {
      host.innerHTML = '<section class="panel" style="max-width:560px;margin:40px auto">' +
        '<h1 class="display">' + esc(T('staff.security.title')) + '</h1>' +
        '<div class="callout warn"><b>' + esc(T('auth.gate.title')) + '</b><p>' + esc(T('auth.gate.body')) + '</p></div>' +
        '<button class="btn small" type="button" data-goto-admin="sign-in" style="margin-top:14px">' + esc(T('auth.signIn')) + '</button>' +
      '</section>';
      return;
    }
    var devices = [
      { idx: 0, label: 'Chrome on Windows', first: '3 Jan 2026', last: state.lang === 'bn' ? 'এইমাত্র' : 'Just now', here: true },
      { idx: 1, label: 'Edge on Windows', first: '20 Aug 2026', last: '2 Sep 2026', here: false }
    ].filter(function (dvc) { return state.revokedDevices.indexOf(dvc.idx) === -1; });
    host.innerHTML =
      '<section class="panel" style="max-width:640px;margin:40px auto">' +
        '<h1 class="display">' + esc(T('staff.security.title')) + '</h1>' +
        '<div class="sub">' +
          '<h4 class="sub-head">' + esc(T('staff.device.trusted')) + '</h4>' +
          '<table class="kv"><thead><tr><th>' + esc(T('auth.security.device')) + '</th><th>' + esc(T('auth.security.firstSeen')) + '</th><th>' + esc(T('auth.security.lastSeen')) + '</th><th></th></tr></thead><tbody>' +
            devices.map(function (dvc) {
              return '<tr><td>' + esc(dvc.label) + (dvc.here ? ' ' + badge('plain', T('staff.device.thisDevice')) : '') + '</td><td>' + esc(dvc.first) + '</td><td>' + esc(dvc.last) + '</td>' +
                '<td><button class="btn small ghost" type="button" data-revoke-device="' + dvc.idx + '">' + esc(T('staff.device.revoke')) + '</button></td></tr>';
            }).join('') +
          '</tbody></table>' +
        '</div>' +
        '<div class="sub" style="margin-top:24px">' +
          '<h4 class="sub-head">' + esc(T('auth.security.sessions')) + '</h4>' +
          '<table class="kv"><tbody>' +
            '<tr><th>Chrome on Windows</th><td>' + esc(T('auth.security.thisDevice')) + '</td></tr>' +
          '</tbody></table>' +
        '</div>' +
        '<div class="sub" style="margin-top:24px">' +
          '<h4 class="sub-head">' + esc(T('auth.security.password')) + '</h4>' +
          authErrorSummary('security') +
          '<form id="staff-password-form" novalidate>' +
            authPasswordField('security', 'currentPassword', 'auth.security.currentPassword') +
            authPasswordField('security', 'newPassword', 'auth.reset.newPassword', 'auth.passwordHint') +
            authPasswordField('security', 'confirmPassword', 'auth.reset.confirmPassword') +
            '<button class="btn ghost small" type="submit">' + esc(T('auth.security.changePassword')) + '</button>' +
          '</form>' +
          (state.securityPasswordChanged ? '<p class="note" style="margin-top:10px;color:var(--positive)">✓ ' + esc(T('auth.security.passwordChanged')) + '</p>' : '') +
        '</div>' +
      '</section>';
  }

  // STORY-AUTH-001: masthead account entry
  function renderStaffAccount() {
    var btn = $('#staff-account');
    if (!btn) { return; }
    var span = btn.querySelector('span');
    if (!state.staffSignedIn) {
      btn.classList.remove('account');
      btn.title = T('auth.signIn');
      if (span) { span.innerHTML = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"></circle><path d="M4 21c0-4.4 3.6-7 8-7s8 2.6 8 7"></path></svg>'; }
      return;
    }
    btn.classList.add('account');
    btn.title = P(STAFF_USER);
    if (span) { span.textContent = staffInitials(); }
  }

  // STORY-AUTH-002: openStepUp - password recheck before a sensitive action
  // (spec §4.4: config apply/rollback, reporter reveal, evidence access,
  // retention bulk execute, role changes, account deletion).
  function openStepUp(onConfirm) {
    if (state.stepUpUntil > Date.now()) { onConfirm(); return; }
    state.pendingStepUp = onConfirm;
    openSheet(T('staff.stepUp.title'),
      '<p class="note">' + esc(T('staff.stepUp.body')) + '</p>' +
      '<div class="field"><label for="f-stepup-password">' + esc(T('auth.password')) + '</label>' +
        '<input id="f-stepup-password" type="password"></div>' +
      '<button class="btn primary" type="button" id="stepup-confirm">' + esc(T('staff.stepUp.confirm')) + '</button>');
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
        // STORY-AUTH-002: config apply is a step-up action (spec §4.4)
        var newVal = el.value;
        openStepUp(function () {
          cfg = loadConfig();
          if (k === 'five')     { cfg.fiveAccountHide    = parseInt(newVal, 10) || 5; }
          if (k === 'critical') { cfg.criticalHours      = parseInt(newVal, 10) || 24; }
          if (k === 'standard') { cfg.standardDays       = parseInt(newVal, 10) || 3; }
          if (k === 'retdef')   { cfg.retentionDefaultDays = parseInt(newVal, 10) || 90; }
          if (k === 'retmax')   { cfg.retentionMaxDays     = parseInt(newVal, 10) || 3650; }
          saveConfig(cfg);
        });
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
        '<h1 class="display">' + esc(T('admin.notif.title')) + '</h1>' +
      '</section>' + permissionCallout() +
      '<section class="panel">' +
        (list.length ? list.map(function (n, ni) {
          var nKey = 'n' + ni;
          return '<div class="sub">' +
            '<div class="q-head"><b>' + esc(L(n.target)) + '</b>' +
              '<span class="size">' + esc(L(n.when)) + '</span>' +
              badge('plain', T('admin.notif.kind.' + n.kind)) +
            '</div>' +
            '<p class="note" style="margin-top:6px">' + esc(L(n.text)) + '</p>' +
            (state.acked[nKey]
              ? '<p class="note" style="margin-top:10px;color:var(--positive)">✓ ' + esc(T('admin.done.acked')) + '</p>'
              : '<div class="mine-actions" style="margin-top:10px">' +
                '<button class="btn small ghost" type="button" data-admin="queue">' + esc(T('admin.notif.action.open')) + '</button>' +
                '<button class="btn small" type="button" data-ack="' + nKey + '">' + esc(T('admin.notif.action.ack')) + '</button>' +
              '</div>') +
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
  // STORY-AUTH-001/002: generic sheet opener, reusing the same #overlay
  // markup as the bulk-action sheet below (closeBulkSheet() closes either).
  function openSheet(title, bodyHtml) {
    var overlay = $('#overlay');
    var sheetBody = $('#sheet-body');
    var sheetTitle = $('#sheet-title');
    if (!overlay || !sheetBody || !sheetTitle) { return; }
    sheetTitle.textContent = title;
    sheetBody.innerHTML = bodyHtml;
    overlay.hidden = false;
    var c = $('#sheet-close');
    if (c) { c.focus(); }
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
    if ((el = e.target.closest('[data-decide]'))) {
      var dParts = el.getAttribute('data-decide').split(':');
      state.decisions[dParts[0]] = dParts[1]; renderProviders(); return;
    }
    if ((el = e.target.closest('[data-reveal]'))) {
      // STORY-AUTH-002: identity/evidence reveal is a step-up action (spec §4.4)
      var revealKey = el.getAttribute('data-reveal');
      openStepUp(function () { state.revealed[revealKey] = 'revealed'; renderQueue(); });
      return;
    }
    if ((el = e.target.closest('[data-request]'))) {
      state.revealed[el.getAttribute('data-request')] = 'requested'; renderQueue(); return;
    }
    if ((el = e.target.closest('[data-ack]'))) {
      state.acked[el.getAttribute('data-ack')] = true; renderNotifications(); return;
    }
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

    /* =====================================================================
       STORY-AUTH-001/002: account entry, device approval, step-up
       ===================================================================== */
    if (e.target.closest('#staff-account')) {
      if (!state.staffSignedIn) { location.hash = '#sign-in'; return; }
      openSheet(P(STAFF_USER),
        '<p class="sub"><a href="#security">' + esc(T('staff.security.title')) + '</a></p>' +
        '<p class="sub" style="margin-top:10px"><button class="btn ghost small" type="button" id="staff-signout">' + esc(T('auth.signOut')) + '</button></p>');
      return;
    }
    if (e.target.closest('#staff-signout')) {
      state.staffSignedIn = false;
      closeBulkSheet();
      renderStaffAccount(); renderSecurity();
      announce('Signed out');
      return;
    }
    if ((el = e.target.closest('[data-toggle-pw]'))) {
      var pwEl = document.getElementById(el.getAttribute('data-toggle-pw'));
      if (pwEl) {
        var showingPw = pwEl.type === 'text';
        pwEl.type = showingPw ? 'password' : 'text';
        el.setAttribute('aria-pressed', String(!showingPw));
        el.textContent = showingPw ? T('auth.showPassword') : T('auth.hidePassword');
      }
      return;
    }
    if (e.target.closest('[data-approve-simulate]')) { state.approveToken = true; renderApprove(); return; }
    if ((el = e.target.closest('[data-goto-admin]'))) { location.hash = '#' + el.getAttribute('data-goto-admin'); return; }
    if ((el = e.target.closest('[data-revoke-device]'))) {
      var devIdx = +el.getAttribute('data-revoke-device');
      state.revokedDevices.push(devIdx);
      // STORY-AUTH-002/spec §4.3: revoking the current device signs out
      if (devIdx === 0) {
        state.deviceTrusted = false;
        state.staffSignedIn = false;
        renderStaffAccount();
        location.hash = '#sign-in';
        return;
      }
      renderSecurity();
      return;
    }
    if (e.target.closest('#stepup-confirm')) {
      var stepPw = $('#f-stepup-password');
      if (!stepPw || stepPw.value.length < 10) { if (stepPw) { stepPw.focus(); } return; }
      state.stepUpUntil = Date.now() + 5 * 60 * 1000;
      var stepCb = state.pendingStepUp;
      state.pendingStepUp = null;
      closeBulkSheet();
      if (stepCb) { stepCb(); }
      return;
    }
  });

  document.addEventListener('submit', function (e) {
    // STORY-AUTH-001: staff sign-in - non-staff email is refused (spec §4.1)
    if (e.target.id === 'staff-signin-form') {
      e.preventDefault();
      var email = ($('#f-signin-email').value || '').trim();
      var pw = $('#f-signin-password').value || '';
      if (!email || pw.length < 10) {
        state.authError = { view: 'signin', fields: { password: T('errors.auth.invalidCredentials') } };
        renderSignin(); focusAuthSummary('signin');
        return;
      }
      // ASSUMPTION(D-001): 'reader@demo' is the fixed fictional non-staff
      // account the task names; any other address is treated as staff. ISS-025.
      if (email === 'reader@demo') {
        state.authError = { view: 'signin', fields: { email: T('staff.notStaff') } };
        renderSignin(); focusAuthSummary('signin');
        return;
      }
      state.authError = null;
      state.staffSignedIn = true;
      renderStaffAccount();
      location.hash = state.deviceTrusted ? '#queue' : '#approve-device';
      return;
    }
    // STORY-AUTH-002: device approval - password recheck trusts this device
    if (e.target.id === 'staff-approve-form') {
      e.preventDefault();
      var apPw = $('#f-approve-password').value || '';
      if (apPw.length < 10) {
        state.approveAttempts++;
        if (state.approveAttempts >= 3) {
          state.authError = { view: 'approve', fields: { password: T('errors.auth.tokenInvalid') } };
        } else {
          state.authError = { view: 'approve', fields: { password: T('errors.auth.invalidCredentials') } };
        }
        renderApprove(); focusAuthSummary('approve');
        return;
      }
      state.authError = null;
      state.approveAttempts = 0;
      state.deviceTrusted = true;
      state.approveToken = false;
      state.staffSignedIn = true;
      renderStaffAccount();
      location.hash = '#queue';
      return;
    }
    // STORY-AUTH-002: security > change password (simulated, no real check)
    if (e.target.id === 'staff-password-form') {
      e.preventDefault();
      var spNew = $('#f-security-newPassword').value || '';
      var spConfirm = $('#f-security-confirmPassword').value || '';
      var spFields = {};
      if (spNew.length < 10) { spFields.newPassword = T('errors.auth.passwordTooShort'); }
      else if (spNew !== spConfirm) { spFields.confirmPassword = T('auth.reset.mismatch'); }
      if (Object.keys(spFields).length) {
        state.authError = { view: 'security', fields: spFields };
        renderSecurity(); focusAuthSummary('security');
        return;
      }
      state.authError = null;
      state.securityPasswordChanged = true;
      renderSecurity();
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

    /* Apply the string table on EVERY load, not only when the language is
       Bengali. Twelve elements in index.html are data-i18n driven — the
       brand name, the portal label, the staff badge, the skip link, the
       demo banner, the four control titles, the sheet close label and both
       colophon lines — and skipping this for English left all of them
       rendering empty. */
    RK.applyLang(document, state.lang);
    if (state.lang === 'bn') {
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

    /* Nav items are real anchors now, so they need no wiring: the browser
       sets the hash, hashchange routes, and middle-click / open-in-new-tab
       work the way they never did with the old <button> pills. */

    route();
  }
  init();
})();
