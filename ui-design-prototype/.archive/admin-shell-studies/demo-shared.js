/* RogiKotha — staff console redesign studies: shared demo layer.

   The three shells (A sidebar console, B triage workspace, C top-nav
   editorial) differ ONLY in navigation and chrome. So the nav model, the
   icon set, and the body content live here once, and each shell renders
   them into its own frame. That is the point of the exercise: hold the
   content constant, compare the shells.

   These are design studies, kept as a record. Variant A (Chart Tray) was
   chosen and ported into the staff console at ../../admin/; B and C were
   not. Nothing here is wired into the shipped console. */

(function (global) {
  'use strict';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }
  function bn(n, lang) {
    if (lang !== 'bn') { return String(n); }
    return String(n).replace(/[0-9]/g, function (d) { return '০১২৩৪৫৬৭৮৯'[+d]; });
  }
  function T(k, lang) { return RK.t(k, lang); }
  function L(o, lang) { return o ? (lang === 'bn' ? o.bn : o.en) : ''; }

  /* ------------------------------------------------------------------
     Icons — 24px stroke set, currentColor, sized in em so they track
     the label. A menu item with no icon is the single biggest reason
     the current console reads as "a bunch of buttons": there is nothing
     to aim at and nothing to recognise at a glance. Deliberately plain
     line work so they sit inside the Quiet Clinic palette.
     ------------------------------------------------------------------ */
  var ICONS = {
    inbox:  '<path d="M4 13h4l1.6 2.6h4.8L16 13h4"/><path d="M6 4h12l3 9v7H3v-7z"/>',
    shield: '<path d="M12 3.2 19 6v5.8c0 4-2.8 7-7 9-4.2-2-7-5-7-9V6z"/><path d="m9 12 2.2 2.2L15.4 10"/>',
    idcard: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><circle cx="9" cy="11" r="2"/><path d="M14 10h4M14 14h4M6.2 16.2c.9-1.8 4.7-1.8 5.6 0"/>',
    bell:   '<path d="M18.5 16.5V11a6.5 6.5 0 1 0-13 0v5.5L4 18.5h16z"/><path d="M10 21.5h4"/>',
    sliders:'<path d="M4 7.5h9M17.5 7.5H20M4 16.5h3.5M12 16.5h8"/><circle cx="15" cy="7.5" r="2.4"/><circle cx="9.5" cy="16.5" r="2.4"/>',
    ledger: '<path d="M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3z"/><path d="M9 9.5h7M9 13.5h7"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.6-3.6"/>',
    menu:   '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close:  '<path d="m6 6 12 12M18 6 6 18"/>',
    panel:  '<rect x="3" y="4.5" width="18" height="15" rx="2.5"/><path d="M9.5 4.5v15"/>',
    sun:    '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6 7 7M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"/>',
    globe:  '<circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c4 4.6 4 12.4 0 17M12 3.5c-4 4.6-4 12.4 0 17"/>',
    exit:   '<path d="M14 4.5h4a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2h-4"/><path d="M10 8.5 6 12l4 3.5M6 12h9"/>'
  };
  function icon(name) {
    return '<svg class="ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false" ' +
      'fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" ' +
      'stroke-linejoin="round">' + (ICONS[name] || '') + '</svg>';
  }

  /* ------------------------------------------------------------------
     Nav model — grouped, named, counted.

     The grouping carries real meaning: report queue / evidence /
     providers are things a moderator WORKS; notifications / audit /
     configuration are things they OVERSEE. Five identical pills in a
     row destroy that distinction.
     ------------------------------------------------------------------ */
  function counts() {
    var m = RK.moderation;
    return {
      queue:         m.cases.length,
      critical:      m.cases.filter(function (c) { return c.lane === 'critical'; }).length,
      evidence:      m.quarantine.filter(function (q) { return q.stage !== 'published'; }).length,
      providers:     m.providers.pending.length + (m.providers.claims || []).length,
      notifications: m.notifications.length,
      audit:         m.auditLog.length,
      config:        0
    };
  }

  var GROUPS = [
    { id: 'work', label: { en: 'Casework', bn: 'কেসের কাজ' }, items: [
      { id: 'queue',     icon: 'inbox',  key: 'admin.tab.queue',     count: 'queue', urgent: 'critical' },
      { id: 'evidence',  icon: 'shield', key: 'admin.tab.evidence',  count: 'evidence' },
      { id: 'providers', icon: 'idcard', key: 'admin.tab.providers', count: 'providers' }
    ] },
    { id: 'oversight', label: { en: 'Oversight', bn: 'তদারকি' }, items: [
      { id: 'notifications', icon: 'bell',    key: 'admin.tab.notifications', count: 'notifications' },
      { id: 'audit',         icon: 'ledger',  key: 'admin.auditLog',          count: 'audit' },
      { id: 'config',        icon: 'sliders', key: 'admin.tab.config' }
    ] }
  ];

  function navItems() {
    return GROUPS.reduce(function (all, g) { return all.concat(g.items); }, []);
  }
  function navById(id) {
    return navItems().filter(function (i) { return i.id === id; })[0] || navItems()[0];
  }

  /* ------------------------------------------------------------------
     Body content — identical across the three shells.
     ------------------------------------------------------------------ */

  var LANES = [
    { k: 'critical', head: 'admin.critical', target: 'admin.criticalTarget' },
    { k: 'standard', head: 'admin.standard', target: 'admin.standardTarget' },
    { k: 'appeal',   head: 'admin.appeals',  target: 'admin.appealTarget' }
  ];

  /* Badges carry data-sev so a variant can encode severity on a channel
     other than hue — fill inversion, a CSS glyph, a rail width. Hue alone
     does not survive deuteranopia: red and amber collide at every pair
     that also clears 4.5:1. */
  function badge(sev, text) {
    return '<span class="badge" data-sev="' + sev + '">' + esc(text) + '</span>';
  }

  function caseRow(c, st, dense) {
    var lang = st.lang;
    return '<button class="c-row' + (dense ? ' dense' : '') + '" type="button" data-case="' + esc(c.id) + '"' +
      ' aria-current="' + (st.selCase === c.id ? 'true' : 'false') + '">' +
      '<span class="c-meta"><span class="c-id">' + esc(c.id) + '</span>' +
        '<span class="c-age">' + esc(T('admin.age', lang)) + ' ' + bn(c.ageHours, lang) + esc(T('admin.hours', lang)) + '</span></span>' +
      '<span class="c-main"><span class="c-sum">' + esc(L(c.summary, lang)) + '</span>' +
        '<span class="c-flags">' +
          badge('neutral', T('target.' + c.targetKind, lang)) +
          badge(c.autoHidden ? 'critical' : 'ok',
            c.autoHidden ? T('admin.autoHidden', lang) : T('admin.stillVisible', lang)) +
          (c.reports ? badge('neutral', bn(c.reports, lang) + ' ' + T('admin.reports', lang)) : '') +
          (c.coordinated ? badge('warn', T('admin.coordinated', lang)) : '') +
        '</span></span>' +
    '</button>';
  }

  function visibleCases(st) {
    var q = (st.filter || '').toLowerCase();
    return RK.moderation.cases.filter(function (c) {
      if (st.lane && st.lane !== 'all' && c.lane !== st.lane) { return false; }
      if (!q) { return true; }
      return (c.id + ' ' + L(c.summary, st.lang)).toLowerCase().indexOf(q) !== -1;
    });
  }

  function caseList(st, opts) {
    opts = opts || {};
    var all = visibleCases(st);
    var lang = st.lang;
    var out = LANES.map(function (lane) {
      var list = all.filter(function (c) { return c.lane === lane.k; });
      if (!list.length) { return ''; }
      /* data-tier lets a variant mark the lane with a coloured rail, a
         tray edge, or nothing at all — the grouping mechanism is what
         varies between the three studies. .lane-body exists so a lane
         can become a container without the heading being inside it. */
      return '<section class="lane" data-tier="' + lane.k + '">' +
        '<h2 class="lane-title"><span class="lane-name">' + esc(T(lane.head, lang)) + '</span>' +
          '<span class="lane-count">' + bn(list.length, lang) + '</span>' +
          '<span class="lane-target">' + esc(T(lane.target, lang)) + '</span></h2>' +
        '<div class="lane-body">' +
          list.map(function (c) { return caseRow(c, st, opts.dense); }).join('') +
        '</div>' +
      '</section>';
    }).join('');
    return out || '<p class="note empty">' + esc(T('admin.bulk.empty', lang)) + '</p>';
  }

  function caseDetail(c, st) {
    if (!c) { return ''; }
    var lang = st.lang;
    var isSA = st.role === 'Super Admin';
    var actions = ['warn', 'restrict', 'suspend', 'hide', 'remove', 'none'];
    return '<article class="detail">' +
      '<header class="detail-head">' +
        '<span class="kicker">' + esc(T('admin.case', lang)) + ' ' + esc(c.id) + '</span>' +
        '<h2>' + esc(L(c.summary, lang)) + '</h2>' +
        '<p class="note">' + esc(L(c.note, lang)) + '</p>' +
      '</header>' +

      (c.reasons && c.reasons.length ? '<section class="sub"><h3 class="sub-head">' + esc(T('admin.reasonsGiven', lang)) + '</h3>' +
        '<div class="chips">' + c.reasons.map(function (r) {
          return '<span class="tag">' + esc(T('report.' + r, lang)) + '</span>';
        }).join('') + '</div></section>' : '') +

      '<section class="sub"><h3 class="sub-head">' + esc(T('admin.permissions', lang)) + '</h3>' +
        '<div class="restricted"><b>' + esc(T('admin.reporterMasked', lang)) + '</b>' +
          '<span>' + esc(T('admin.reporterNote', lang)) + '</span>' +
          (isSA ? '<button class="btn small" type="button" style="margin-top:8px;justify-self:start">' +
            esc(T('admin.reveal.audited', lang)) + '</button>' : '') +
        '</div></section>' +

      '<section class="sub"><h3 class="sub-head">' + esc(T('admin.decision', lang)) + '</h3>' +
        '<p class="note">' + esc(T('admin.proportion', lang)) + '</p>' +
        '<div class="opt-row">' + actions.map(function (a) {
          return '<button class="opt" type="button" data-action="' + a + '" aria-pressed="' +
            (st.selAction === a) + '">' + esc(T('admin.act.' + a, lang)) + '</button>';
        }).join('') + '</div>' +
        '<div class="field" style="margin-top:14px"><label for="rsn-' + esc(c.id) + '">' +
          esc(T('admin.reasonToAuthor', lang)) + '</label>' +
          '<textarea id="rsn-' + esc(c.id) + '" rows="3"></textarea></div>' +
      '</section>' +

      '<section class="sub"><h3 class="sub-head">' + esc(T('admin.auditPreview', lang)) + '</h3>' +
        '<pre class="audit">' + esc('case=' + c.id + '\nactor=moderator:you\naction=' +
          (st.selAction || '—') + '\nobject=' + c.targetKind + ':' + c.targetId +
          '\nreporter_identity=not_accessed') + '</pre>' +
      '</section>' +

      /* The console had no commit action at all — six option buttons, a
         textarea, and no way to finish the job. Every variant needs one
         focal point, and this is it: exactly one primary per view. */
      '<footer class="dock">' +
        '<button class="btn ghost" type="button" data-commit="draft">' +
          esc(T('admin.bulk.cancel', lang)) + '</button>' +
        '<button class="btn primary" type="button" data-commit="record">' +
          esc(T('admin.commit', lang)) + '</button>' +
      '</footer>' +
    '</article>';
  }

  /* Compact stand-ins for the five non-queue sections. The shell is what
     is under study here; those views already exist in the shipped
     console and are not being redesigned by these files. */
  function sectionStub(id, st) {
    var lang = st.lang;
    var item = navById(id);
    var m = RK.moderation;
    var body = '';
    if (id === 'evidence') {
      body = m.quarantine.map(function (q) {
        return '<div class="stub-row"><b>' + esc(q.file) + '</b><span class="note">' + esc(q.id) +
          ' · ' + esc(q.size) + ' · ' + esc(T('admin.pl.' + q.stage, lang)) + '</span></div>';
      }).join('');
    } else if (id === 'providers') {
      body = m.providers.pending.map(function (p) {
        return '<div class="stub-row"><b>' + esc(L(p.name, lang)) + '</b><span class="note">' + esc(p.id) +
          ' · ' + esc(L(p.specialty, lang)) + ' · ' + esc(p.bmdc) + '</span></div>';
      }).join('');
    } else if (id === 'notifications') {
      body = m.notifications.map(function (n) {
        return '<div class="stub-row"><b>' + esc(L(n.text, lang)) + '</b><span class="note">' +
          esc(L(n.target, lang)) + ' · ' + esc(L(n.when, lang)) + '</span></div>';
      }).join('');
    } else if (id === 'audit') {
      body = m.auditLog.slice(0, 10).map(function (a) {
        return '<div class="stub-row"><b>' + esc(a.case) + ' — ' + esc(a.action) + '</b>' +
          '<span class="note">' + esc(a.actor) + ' · ' + bn(a.timeMin, lang) + 'm</span></div>';
      }).join('');
    } else {
      body = Object.keys(m.thresholds).map(function (k) {
        return '<div class="stub-row"><b>' + esc(k) + '</b><span class="note">' +
          bn(m.thresholds[k], lang) + '</span></div>';
      }).join('');
    }
    return '<article class="detail"><header class="detail-head">' +
      '<span class="kicker">' + esc(T('nav.admin', lang)) + '</span>' +
      '<h2>' + esc(T(item.key, lang)) + '</h2>' +
      '<p class="note">' + esc(T('admin.permissionNote', lang)) + '</p></header>' +
      '<section class="sub stub-list">' + body + '</section></article>';
  }

  /* Shared chrome behaviour: language + theme, persisted per shell. */
  function chrome(ns, st, onChange) {
    function readLS(k) { try { return localStorage.getItem(ns + '.' + k); } catch (e) { return null; } }
    function writeLS(k, v) { try { localStorage.setItem(ns + '.' + k, v); } catch (e) {} }

    st.lang = readLS('lang') === 'bn' ? 'bn' : 'en';
    st.theme = readLS('theme') || '';

    function applyLang() {
      document.documentElement.setAttribute('lang', st.lang);
      document.documentElement.setAttribute('data-lang', st.lang);
      RK.applyLang(document, st.lang);
      writeLS('lang', st.lang);
    }
    function applyTheme() {
      if (st.theme) { document.documentElement.setAttribute('data-theme', st.theme); }
      else { document.documentElement.removeAttribute('data-theme'); }
      writeLS('theme', st.theme);
    }
    function effective() {
      if (st.theme) { return st.theme; }
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return {
      apply: function () { applyLang(); applyTheme(); },
      toggleLang: function () { st.lang = st.lang === 'bn' ? 'en' : 'bn'; applyLang(); onChange(); },
      toggleTheme: function () { st.theme = effective() === 'dark' ? 'light' : 'dark'; applyTheme(); onChange(); },
      effectiveTheme: effective
    };
  }

  global.RKX = {
    esc: esc, bn: bn, T: T, L: L,
    icon: icon, ICONS: ICONS,
    GROUPS: GROUPS, navItems: navItems, navById: navById, counts: counts,
    visibleCases: visibleCases, caseList: caseList, caseDetail: caseDetail,
    sectionStub: sectionStub, chrome: chrome
  };
}(window));
