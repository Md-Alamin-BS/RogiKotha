/* Shell — top-nav editorial console, shared by all three design variants.

   The markup and the behaviour are IDENTICAL across variants A, B and C.
   Only the stylesheet differs, which is the point of the exercise: hold
   everything else constant and compare the visual systems.

   Routes match the shipped console: #queue, #evidence, #providers,
   #notifications, #audit, #config. */

(function () {
  'use strict';

  var X = window.RKX;
  var $ = function (s, r) { return (r || document).querySelector(s); };

  var state = {
    lang: 'en', theme: '', view: 'queue',
    selCase: 'MOD-2041', selAction: null, filter: '', lane: 'all',
    role: 'Super Admin'
  };

  var VARIANT = document.body.getAttribute('data-variant') || 'a';
  var chrome = X.chrome('rk.variant.' + VARIANT, state, function () { render(); });
  function T(k) { return X.T(k, state.lang); }

  var LANE_TABS = [
    { k: 'all',      key: null },
    { k: 'critical', key: 'admin.critical' },
    { k: 'standard', key: 'admin.standard' },
    { k: 'appeal',   key: 'admin.appeals' }
  ];

  /* ---------- navigation ---------- */

  function renderTopNav() {
    var c = X.counts();
    var html = '';
    X.GROUPS.forEach(function (g, gi) {
      if (gi) { html += '<span class="nav-sep" aria-hidden="true"></span>'; }
      html += g.items.map(function (it) {
        var n = it.count ? c[it.count] : 0;
        var urgent = it.urgent && c[it.urgent] > 0;
        return '<a class="top-item" href="#' + it.id + '" data-nav="' + it.id + '"' +
          (state.view === it.id ? ' aria-current="page"' : '') + '>' +
          X.icon(it.icon) + '<span>' + X.esc(T(it.key)) + '</span>' +
          (n ? '<span class="count' + (urgent ? ' urgent' : '') + '">' + X.bn(n, state.lang) + '</span>' : '') +
        '</a>';
      }).join('');
    });
    $('#topnav').innerHTML = html;
  }

  /* Mobile: the four most-used sections plus a More entry that jumps to
     configuration. Six equal thumb targets do not fit a phone bar. */
  function renderTabBar() {
    var c = X.counts();
    var ids = ['queue', 'evidence', 'providers', 'notifications', 'config'];
    $('#tabbar').innerHTML = ids.map(function (id) {
      var it = X.navById(id);
      var n = it.count ? c[it.count] : 0;
      var urgent = it.urgent && c[it.urgent] > 0;
      return '<a class="tab-item" href="#' + it.id + '" data-nav="' + it.id + '"' +
        (state.view === it.id ? ' aria-current="page"' : '') + '>' +
        X.icon(it.icon) +
        (n ? '<span class="tab-dot' + (urgent ? ' urgent' : '') + '">' + X.bn(n, state.lang) + '</span>' : '') +
        '<span>' + X.esc(T(it.key).split(' ')[0]) + '</span>' +
      '</a>';
    }).join('');
  }

  function groupOf(id) {
    return X.GROUPS.filter(function (g) {
      return g.items.some(function (i) { return i.id === id; });
    })[0] || X.GROUPS[0];
  }

  /* ---------- header + body ---------- */

  function renderHeader() {
    var item = X.navById(state.view);
    $('#crumbs').innerHTML =
      '<span>' + X.esc(X.L(groupOf(state.view).label, state.lang)) + '</span>' +
      '<span class="sep" aria-hidden="true">/</span>' +
      '<b>' + X.esc(T(item.key)) + '</b>';
    $('#page-title').textContent = T(item.key);
    $('#page-sub').textContent = state.view === 'queue' ? T('admin.threshold') : T('admin.permissionNote');
    $('#banner').textContent = T('demo.banner') + ' · ' + T('admin.demoNote');

    var subnav = $('#subnav');
    if (state.view !== 'queue') { subnav.innerHTML = ''; subnav.hidden = true; return; }
    subnav.hidden = false;
    var cases = RK.moderation.cases;
    subnav.innerHTML = LANE_TABS.map(function (l) {
      var n = l.k === 'all' ? cases.length : cases.filter(function (c) { return c.lane === l.k; }).length;
      var label = l.key ? T(l.key) : (state.lang === 'bn' ? 'সব' : 'All');
      return '<button type="button" role="tab" class="sub-item" data-lane="' + l.k + '"' +
        ' aria-selected="' + (state.lane === l.k) + '">' + X.esc(label) +
        '<span class="count">' + X.bn(n, state.lang) + '</span></button>';
    }).join('');
  }

  function renderChrome() {
    $('#lang').innerHTML = X.icon('globe') + '<span>' + (state.lang === 'bn' ? 'EN' : 'বাং') + '</span>';
    $('#theme').innerHTML = X.icon('sun');
    $('#theme').setAttribute('aria-pressed', String(chrome.effectiveTheme() === 'dark'));
    $('#role-initials').textContent = state.role === 'Super Admin' ? 'SA' : (state.role === 'Admin' ? 'AD' : 'MO');
    $('#role').setAttribute('title', state.role);
    $('#q').placeholder = state.lang === 'bn' ? 'কেস খুঁজুন…' : 'Search cases…';
  }

  function renderBody() {
    var host = $('#body');
    if (state.view !== 'queue') { host.innerHTML = X.sectionStub(state.view, state); return; }
    var sel = RK.moderation.cases.filter(function (c) { return c.id === state.selCase; })[0];
    host.innerHTML =
      '<div class="split"><div>' + X.caseList(state) + '</div>' +
      '<aside>' + X.caseDetail(sel, state) + '</aside></div>';
  }

  function render() { renderTopNav(); renderTabBar(); renderChrome(); renderHeader(); renderBody(); }
  function announce(m) { $('#sr-live').textContent = m; }

  /* ---------- routing + events ---------- */

  var VIEWS = X.navItems().map(function (i) { return i.id; });
  function route() {
    var raw = (location.hash || '#queue').replace('#', '');
    state.view = VIEWS.indexOf(raw) === -1 ? 'queue' : raw;
    render();
    announce(T(X.navById(state.view).key));
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  document.addEventListener('click', function (e) {
    var t = e.target;

    var row = t.closest && t.closest('[data-case]');
    if (row) { state.selCase = row.getAttribute('data-case'); state.selAction = null; renderBody(); return; }

    var act = t.closest && t.closest('[data-action]');
    if (act) { state.selAction = act.getAttribute('data-action'); renderBody(); return; }

    var lane = t.closest && t.closest('[data-lane]');
    if (lane) { state.lane = lane.getAttribute('data-lane'); renderHeader(); renderBody(); return; }

    var commit = t.closest && t.closest('[data-commit]');
    if (commit) {
      announce(commit.getAttribute('data-commit') === 'record'
        ? T('admin.recorded') : T('admin.bulk.cancel'));
      return;
    }

    if (t.closest && t.closest('#lang')) { chrome.toggleLang(); return; }
    if (t.closest && t.closest('#theme')) { chrome.toggleTheme(); return; }
    if (t.closest && t.closest('#role')) {
      var order = ['Super Admin', 'Admin', 'Moderator'];
      state.role = order[(order.indexOf(state.role) + 1) % order.length];
      render();
      announce('Role: ' + state.role);
    }
  });

  document.addEventListener('input', function (e) {
    if (e.target.id === 'q') { state.filter = e.target.value; renderBody(); }
  });

  window.addEventListener('hashchange', route);

  (function init() { chrome.apply(); route(); }());
}());
