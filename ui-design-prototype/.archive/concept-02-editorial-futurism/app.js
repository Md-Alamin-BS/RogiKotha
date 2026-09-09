/* Concept 02 — Editorial Futurism
   Type-led longform, provenance in the margin. Ten public screens. */
(function () {
  'use strict';

  var state = {
    lang: 'en', theme: null, motion: 'on',
    query: 'diabetes',
    filters: { sort: 'relevance' },
    tab: 'doctors',
    compare: [],
    doctorId: 'd1',
    accountId: 'r6',
    conditionId: 'c1',
    facilityId: 'f1',
    profileCondition: null,
    profileFilter: {},
    composeMode: 'detailed',
    composeSentiment: null, composeOutcome: null,
    composeIdentity: 'pseudo', composeClaims: [], composeTags: [],
    composeStory: '',
    composeFiles: [],
    ignoredChecks: [],
    published: false,
    mineTab: 'published',
    reactions: {}
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
    /* Bengali digits, so numerals do not stay Latin in a Bangla interface. */
    if (state.lang !== 'bn') { return String(n); }
    return String(n).replace(/[0-9]/g, function (d) { return '০১২৩৪৫৬৭৮৯'[+d]; });
  }

  /* =====================================================================
     Living field — atmosphere only, never a carrier of meaning
     ===================================================================== */
  var Field = (function () {
    var canvas, ctx, parts = [], raf = null, w = 0, h = 0, dpr = 1;

    function seed() {
      var count = Math.min(70, Math.round((w * h) / 26000));
      parts = [];
      for (var i = 0; i < count; i++) {
        parts.push({
          x: Math.random() * w, y: Math.random() * h,
          r: 0.6 + Math.random() * 2.2,
          vx: (Math.random() - 0.5) * 0.13, vy: -0.04 - Math.random() * 0.18,
          hue: [196, 268, 158][Math.floor(Math.random() * 3)],
          phase: Math.random() * Math.PI * 2, speed: 0.005 + Math.random() * 0.01
        });
      }
    }
    function resize() {
      if (!canvas || !ctx) { return; }
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      seed();
    }
    function frame() {
      ctx.clearRect(0, 0, w, h);
      var dark = document.documentElement.getAttribute('data-theme') === 'dark' ||
        (!document.documentElement.getAttribute('data-theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
      for (var i = 0; i < parts.length; i++) {
        var p = parts[i];
        p.x += p.vx; p.y += p.vy; p.phase += p.speed;
        if (p.y < -20) { p.y = h + 20; p.x = Math.random() * w; }
        if (p.x < -20) { p.x = w + 20; } if (p.x > w + 20) { p.x = -20; }
        var pulse = 0.45 + 0.55 * (0.5 + 0.5 * Math.sin(p.phase));
        var alpha = (dark ? 0.5 : 0.26) * pulse;
        var light = dark ? 66 : 44;
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 9);
        g.addColorStop(0, 'hsl(' + p.hue + ' 90% ' + light + '% / ' + alpha.toFixed(3) + ')');
        g.addColorStop(1, 'hsl(' + p.hue + ' 90% ' + light + '% / 0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'hsl(' + p.hue + ' 95% ' + (dark ? 82 : 42) + '% / ' + (alpha * 1.5).toFixed(3) + ')';
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      }
      raf = requestAnimationFrame(frame);
    }
    return {
      start: function () {
        canvas = $('#field');
        if (!canvas || raf) { return; }
        /* No 2D context means no field — never a broken page. */
        ctx = canvas.getContext && canvas.getContext('2d');
        if (!ctx) { canvas.style.display = 'none'; return; }
        resize();
        window.addEventListener('resize', resize);
        raf = requestAnimationFrame(frame);
      },
      stop: function () {
        if (raf) { cancelAnimationFrame(raf); raf = null; }
        if (ctx) { ctx.clearRect(0, 0, w, h); }
      }
    };
  })();

  /* =====================================================================
     Shell
     ===================================================================== */

  function setLang(lang) {
    state.lang = lang;
    RK.applyLang(document, lang);
    $('#lang').setAttribute('aria-pressed', String(lang === 'bn'));
    $('#lang').querySelector('span').textContent = lang === 'bn' ? 'A' : 'অ';
    try { localStorage.setItem('rk02.lang', lang); } catch (e) {}
    renderAll();
  }
  function setTheme(theme) {
    state.theme = theme;
    if (theme) { document.documentElement.setAttribute('data-theme', theme); }
    else { document.documentElement.removeAttribute('data-theme'); }
    try { localStorage.setItem('rk02.theme', theme || ''); } catch (e) {}
  }
  function currentIsDark() {
    if (state.theme) { return state.theme === 'dark'; }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function setMotion(on) {
    state.motion = on ? 'on' : 'off';
    document.body.setAttribute('data-motion', state.motion);
    $('#motion').setAttribute('aria-pressed', String(!on));
    if (on) { Field.start(); } else { Field.stop(); }
    try { localStorage.setItem('rk02.motion', state.motion); } catch (e) {}
  }
  function motionAllowed() {
    return state.motion === 'on' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  var VIEWS = ['discover', 'results', 'profile', 'account', 'condition', 'facility', 'compose', 'mine'];

  function route() {
    var raw = (location.hash || '#discover').replace('#', '');
    var parts = raw.split('/');
    var v = parts[0];
    if (VIEWS.indexOf(v) === -1) { v = 'discover'; }
    if (parts[1]) {
      if (v === 'profile') { state.doctorId = parts[1]; }
      if (v === 'account') { state.accountId = parts[1]; }
      if (v === 'condition') { state.conditionId = parts[1]; }
      if (v === 'facility') { state.facilityId = parts[1]; }
    }
    document.body.setAttribute('data-view', v);
    VIEWS.forEach(function (n) { var el = $('#view-' + n); if (el) { el.hidden = (n !== v); } });
    $$('.tabs a').forEach(function (a) {
      if (a.getAttribute('data-nav') === v) { a.setAttribute('aria-current', 'page'); }
      else { a.removeAttribute('aria-current'); }
    });
    if (v === 'profile') { renderProfile(); }
    if (v === 'account') { renderAccount(); }
    if (v === 'condition') { renderCondition(); }
    if (v === 'facility') { renderFacility(); }
    $('#tray').hidden = !(v === 'results' && state.compare.length);
    window.scrollTo({ top: 0, behavior: motionAllowed() ? 'smooth' : 'auto' });
  }
  function go(path) {
    if (location.hash === '#' + path) { route(); } else { location.hash = '#' + path; }
  }

  /* =====================================================================
     Shared fragments
     ===================================================================== */

  function badge(cls, text) { return '<span class="badge ' + cls + '">' + esc(text) + '</span>'; }

  function notVerified() {
    return '<span class="badge warn" title="' + esc(T('label.notVerifiedWhy')) + '">' + esc(T('label.notVerified')) + '</span>';
  }

  function docCount(id) {
    var n = RK.evidenceFor ? RK.evidence.filter(function (e) { return RK.reviewById(e.reviewId) && RK.reviewById(e.reviewId).doctorId === id && e.state === 'ready'; }).length : 0;
    return n;
  }

  /* Distribution: the editorial sentence carries every fact; the spectrum
     rule is a second reading of the same numbers and can be deleted
     without losing anything. */
  function distBlock(dist, keys, prefix, title) {
    if (dist.empty) { return '<p class="denominator">' + esc(T('label.notProvided')) + '</p>'; }
    var parts = keys.map(function (k) {
      return '<span class="n-' + k + '"><b>' + bn(dist.counts[k]) + '</b> ' + esc(T(prefix + k).toLowerCase()) + '</span>';
    }).join(' · ');
    var rule = keys.map(function (k) {
      var pct = dist.pct(k);
      return pct ? '<span class="s-' + k + '" style="--w:' + pct + '%"></span>' : '';
    }).join('');
    var plain = keys.map(function (k) { return dist.counts[k] + ' ' + T(prefix + k).toLowerCase(); }).join(', ') +
      ' — ' + T('sentiment.of') + ' ' + dist.total + ' ' + T('sentiment.accounts');
    return '<div class="dist">' +
      '<p class="dist-sentence">' + esc(T('sentiment.of')) + ' <b>' + bn(dist.total) + '</b> ' +
        esc(T('sentiment.accounts')) + ': ' + parts + '</p>' +
      '<div class="spectrum" role="img" aria-label="' + esc(plain) + '">' + rule + '</div>' +
      (title ? '<p class="denominator">' + esc(title) + '</p>' : '') +
      (dist.limited ? '<p class="limited">' + esc(T('label.limitedData')) + ' — ' + esc(T('label.limitedDataWhy')) + '</p>' : '') +
    '</div>';
  }

  function sentimentBlock(list) {
    return distBlock(RK.sentimentOf(list), RK.SENTIMENTS, 'sentiment.', T('sentiment.title'));
  }

  function outcomeBlock(list) {
    var dist = RK.outcomeOf(list);
    if (dist.empty) {
      return '<h3 style="font-size:15px">' + esc(T('outcome.title')) + '</h3>' +
             '<p class="denominator">' + esc(T('label.notProvided')) + '</p>';
    }
    var rows = RK.OUTCOMES.map(function (k) {
      return '<div class="outcome-row"><span>' + esc(T('outcome.' + k)) + '</span>' +
        '<span class="track"><i style="--w:' + dist.pct(k) + '%"></i></span>' +
        '<span class="n">' + bn(dist.counts[k]) + '/' + bn(dist.total) + '</span></div>';
    }).join('');
    return '<h3 style="font-size:15px">' + esc(T('outcome.title')) + '</h3>' +
      '<div class="outcome-rows">' + rows + '</div>' +
      '<p class="denominator">' + esc(T('outcome.selfReported')) + '</p>' +
      (dist.limited ? '<p class="limited">' + esc(T('label.limitedData')) + '</p>' : '');
  }

  function emergencyPanel() {
    return '<section class="panel" style="border-color:var(--danger-line)">' +
      '<h2 style="font-size:18px;color:var(--danger-ink)">' + esc(T('emergency.title')) + '</h2>' +
      '<p class="lede" style="font-size:15px">' + esc(T('emergency.body')) + '</p>' +
      '<div class="emergency-lines">' +
        '<a href="tel:999"><b>' + bn(999) + '</b><span>' + esc(state.lang === 'bn' ? 'অ্যাম্বুলেন্স' : 'Ambulance') + '</span></a>' +
        '<a href="tel:16263"><b>' + bn(16263) + '</b><span>' + esc(state.lang === 'bn' ? 'স্বাস্থ্য পরামর্শ' : 'Health guidance') + '</span></a>' +
        '<a href="tel:09612119911"><b>' + bn('09612-119911') + '</b><span>' + esc(T('emergency.crisis')) + '</span></a>' +
      '</div>' +
      '<p class="note">' + esc(L(RK.config.emergency.lastVerified)) + '</p>' +
    '</section>';
  }

  function filterFields() {
    var defs = [
      { key: 'specialty', label: 'filter.specialty', opts: RK.doctors.map(function (d) { return { v: d.specialty.en, l: P(d.specialty) }; }) },
      { key: 'city', label: 'filter.location', opts: RK.doctors.map(function (d) { return { v: d.city.en, l: P(d.city) }; }) },
      { key: 'sentiment', label: 'filter.sentiment', opts: RK.SENTIMENTS.map(function (s) { return { v: s, l: T('sentiment.' + s) }; }) },
      { key: 'outcome', label: 'filter.outcome', opts: RK.OUTCOMES.map(function (o) { return { v: o, l: T('outcome.' + o) }; }) },
      { key: 'gender', label: 'filter.gender', opts: [
        { v: 'female', l: state.lang === 'bn' ? 'নারী' : 'Female' }, { v: 'male', l: state.lang === 'bn' ? 'পুরুষ' : 'Male' }] }
    ];
    return defs.map(function (f) {
      var seen = {};
      var opts = f.opts.filter(function (o) { if (seen[o.v]) { return false; } seen[o.v] = 1; return true; });
      return '<div class="fset"><span>' + esc(T(f.label)) + '</span>' +
        '<select data-filter="' + f.key + '"><option value="">' + esc(T('filter.any')) + '</option>' +
        opts.map(function (o) {
          return '<option value="' + esc(o.v) + '"' + (state.filters[f.key] === o.v ? ' selected' : '') + '>' + esc(o.l) + '</option>';
        }).join('') + '</select></div>';
    }).join('');
  }

  /* =====================================================================
     1 · Discover
     ===================================================================== */

  function renderDiscover() {
    var host = $('#view-discover');
    if (!host) { return; }
    var byCondition = RK.conditions.map(function (c) {
      return { c: c, n: RK.conditionAccounts(c.id).length };
    }).filter(function (x) { return x.n > 0; });

    host.innerHTML =
      '<section class="opener">' +
        '<span class="kicker">' + esc(state.lang === 'bn' ? 'বাংলাদেশ · পাবলিক বেটা' : 'Bangladesh · Public beta') + '</span>' +
        '<h1 class="display">' + esc(T('hero.title')) + '</h1>' +
        '<div class="opener-grid">' +
          '<div>' +
            '<p class="lede">' + esc(T('hero.body')) + '</p>' +
            '<form class="search" id="search-form" role="search">' +
              '<label class="sr-only" for="q">' + esc(T('search.label')) + '</label>' +
              '<div class="search-shell">' +
                '<svg class="search-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4.2-4.2"/></svg>' +
                '<input id="q" type="search" autocomplete="off" placeholder="' + esc(T('search.placeholder')) + '" value="' + esc(state.query) + '">' +
                '<button type="submit" class="btn">' + esc(T('search.submit')) + '</button>' +
              '</div>' +
              '<p class="note" style="margin:10px 0 0 18px">' + esc(T('search.banglish')) + '</p>' +
            '</form>' +
            '<div class="chips">' + RK.conditions.slice(0, 5).map(function (c) {
              return '<button class="chip" type="button" data-q="' + esc(P(c.name)) + '">' + esc(P(c.name)) + '</button>';
            }).join('') + '</div>' +
          '</div>' +
          '<aside class="margin-note">' +
            '<span class="k">' + esc(state.lang === 'bn' ? 'সম্পাদকীয় নোট' : 'Editorial note') + '</span>' +
            '<p>' + esc(T('disclaimer.short')) + '</p>' +
          '</aside>' +
        '</div>' +
      '</section>' +

      emergencyPanel() +

      '<h2 class="section-head">' + esc(T('discover.browse')) + '</h2>' +
      '<p class="note" style="margin-bottom:14px">' + esc(T('discover.browseNote')) + '</p>' +
      '<div class="browse-grid">' + byCondition.map(function (x) {
        return '<button class="browse-card" type="button" data-condition="' + x.c.id + '">' +
          '<b>' + esc(P(x.c.name)) + '</b>' +
          '<span>' + bn(x.n) + ' ' + esc(T('sentiment.accounts')) + '</span></button>';
      }).join('') + '</div>' +

      '<section class="panel" style="margin-top:26px">' +
        '<h2 style="font-size:17px">' + esc(T('discover.facilities')) + '</h2>' +
        '<p class="note" style="margin-bottom:14px">' + esc(T('facility.separation')) + '</p>' +
        '<div class="mini-list">' + RK.facilities.slice(0, 3).map(function (f) {
          return '<button class="mini-row" type="button" data-facility="' + f.id + '">' +
            '<span class="mini-av">' + RK.avatar(f.name.en + f.id, f.accent, 38) + '</span>' +
            '<span><b>' + esc(P(f.name)) + (f.branch ? ' — ' + esc(P(f.branch)) : '') + '</b>' +
            '<span>' + esc(T('facility.type.' + f.type)) + ' · ' + esc(P(f.area)) + ', ' + esc(P(f.city)) +
            ' · ' + bn(RK.facilityReviewsFor(f.id).length) + ' ' + esc(T('sentiment.accounts')) + '</span></span></button>';
        }).join('') + '</div>' +
      '</section>' +

      '<h2 class="section-head">' + esc(T('how.title')) + '</h2>' +
      '<ol class="how-list">' +
        ['1', '2', '3'].map(function (i) {
          return '<li class="reveal"><span class="fig">0' + i + '</span>' +
            '<h3>' + esc(T('how.' + i + '.t')) + '</h3><p>' + esc(T('how.' + i + '.b')) + '</p></li>';
        }).join('') +
      '</ol>' +

      '<h2 class="section-head">' + esc(state.lang === 'bn' ? 'সাম্প্রতিক বিবরণ' : 'From the latest accounts') + '</h2>' +
      '<div>' + RK.reviews.slice(0, 4).map(accountRow).join('') + '</div>';
  }

  function accountRow(r) {
    var d = RK.doctorById(r.doctorId);
    var c = RK.conditionById(r.conditionId);
    var ev = RK.evidenceFor(r.id).filter(function (e) { return e.state === 'ready'; }).length;
    return '<article class="acct">' +
      '<div class="row-flags">' +
        badge(r.sentiment, T('sentiment.' + r.sentiment)) +
        badge('plain', T('outcome.' + r.outcome)) +
        '<span class="tag">' + esc(P(c.name)) + '</span>' +
        (ev ? badge('warn', bn(ev) + ' ' + (state.lang === 'bn' ? 'কাগজপত্র' : 'documents')) : badge('plain', T('label.noDocuments'))) +
      '</div>' +
      '<h3>' + esc(P(r.title)) + '</h3>' +
      '<p class="who"><span>' + esc(T('rel.' + r.relationship)) + '</span><span>' + esc(P(r.author)) + '</span>' +
        '<span>' + esc(T('review.episodeDate')) + ': ' + esc(P(r.period)) + '</span>' +
        '<span>' + esc(P(d.name)) + '</span></p>' +
      '<p class="excerpt">' + esc(P(r.body).slice(0, 190)) + '…</p>' +
      '<button class="btn small ghost" type="button" data-account="' + r.id + '">' + esc(T('review.readFull')) + '</button>' +
    '</article>';
  }

  /* =====================================================================
     2 · Results
     ===================================================================== */

  function renderResults() {
    var host = $('#view-results');
    if (!host) { return; }
    var showFacilities = state.tab === 'facilities';
    var res = RK.search(state.query, state.filters);
    var facs = RK.searchFacilities(state.query, state.filters);

    var resolvedNote = '';
    if (res.resolved.condition && res.resolved.matched &&
        String(res.resolved.matched).toLowerCase() !== String(state.query).toLowerCase()) {
      resolvedNote = esc(P(res.resolved.condition.name)) + ' — ' + esc(T('search.alsoSearched')) +
        ' “' + esc(res.resolved.matched) + '”. <button type="button" class="link-btn" id="keep-exact">' +
        esc(T('search.keepOriginal')) + '</button>';
    } else if (res.resolved.condition) {
      resolvedNote = esc(P(res.resolved.condition.name)) +
        ' — <button type="button" class="link-btn" data-condition="' + res.resolved.condition.id + '">' +
        esc(T('condition.accounts')) + '</button>';
    }

    var list = showFacilities
      ? (facs.length ? facs.map(facilityEntry).join('')
          : '<div class="empty-state"><h3>' + esc(T('results.none')) + '</h3><p>' + esc(T('results.noneBody')) + '</p></div>')
      : (res.doctors.length ? res.doctors.map(doctorEntry).join('')
          : '<div class="empty-state"><h3>' + esc(T('results.none')) + '</h3><p>' + esc(T('results.noneBody')) + '</p></div>');

    host.innerHTML =
      '<section class="panel results-head">' +
        '<span class="kicker">' + esc(T('nav.results')) + '</span>' +
        '<h1 class="query-line">' + (state.query ? esc(T('search.didYouMean')) + ' <em>' + esc(state.query) + '</em>' : esc(T('nav.results'))) + '</h1>' +
        (resolvedNote ? '<p class="resolved">' + resolvedNote + '</p>' : '') +
        '<div class="seg">' +
          '<button type="button" data-tab="doctors" aria-pressed="' + (!showFacilities) + '">' + esc(T('results.tabDoctors')) + ' (' + bn(res.doctors.length) + ')</button>' +
          '<button type="button" data-tab="facilities" aria-pressed="' + showFacilities + '">' + esc(T('results.tabFacilities')) + ' (' + bn(facs.length) + ')</button>' +
        '</div>' +
        '<div class="meta-row">' +
          '<span>' + bn(showFacilities ? facs.length : res.doctors.length) + ' ' + esc(T('results.count')) + '</span>' +
          '<label class="sort">' + esc(T('sort.label')) + ' ' +
            '<select id="sort">' +
              ['relevance', 'volume', 'recent'].map(function (s) {
                return '<option value="' + s + '"' + (state.filters.sort === s ? ' selected' : '') + '>' + esc(T('sort.' + s)) + '</option>';
              }).join('') +
            '</select></label>' +
        '</div>' +
        '<details class="why"><summary>' + esc(T('sort.why')) + '</summary><p>' + esc(T('sort.whyBody')) + '</p></details>' +
      '</section>' +

      '<div class="results-body">' +
        '<aside class="panel filters">' +
          '<h2>' + esc(T('filter.title')) + '</h2>' +
          filterFields() +
          '<p class="note" style="margin:14px 0">' + esc(T('filter.note')) + '</p>' +
          '<button type="button" class="btn small ghost" id="clear-filters">' + esc(T('filter.clear')) + '</button>' +
        '</aside>' +
        '<div class="entry-list">' + list + '</div>' +
      '</div>';

    renderTray();
  }

  function doctorEntry(d) {
    var pinned = state.compare.indexOf(d.id) !== -1;
    var conds = RK.conditionsFor(d.id).slice(0, 3);
    return '<div class="doc-entry" role="group">' +
      '<span class="doc-av">' + RK.avatar(d.name.en, d.accent, 70) + '</span>' +
      '<span>' +
        '<h3>' + esc(P(d.name)) + '</h3>' +
        '<p class="doc-sub">' + esc(P(d.specialty)) + ' · ' + esc(P(d.area)) + ', ' + esc(P(d.city)) + '</p>' +
        '<span class="doc-flags">' + notVerified() +
          (docCount(d.id) ? badge('plain', bn(docCount(d.id)) + ' ' + (state.lang === 'bn' ? 'কাগজপত্র' : 'documents')) : badge('plain', T('label.noDocuments'))) +
          conds.map(function (c) { return '<span class="tag">' + esc(P(c.condition.name)) + ' (' + bn(c.count) + ')</span>'; }).join('') +
        '</span>' +
        '<span class="entry-actions">' +
          '<button class="btn small" type="button" data-doctor="' + d.id + '">' + esc(T('nav.profile')) + '</button>' +
          '<button class="btn small ghost" type="button" data-pin="' + d.id + '">' +
            esc(pinned ? T('compare.remove') : T('compare.add')) + '</button>' +
        '</span>' +
      '</span>' +
      '<span>' + sentimentBlock(RK.reviewsFor(d.id)) + '</span>' +
    '</div>';
  }

  function facilityEntry(f) {
    var list = RK.facilityReviewsFor(f.id);
    var dist = RK.criteriaDist(list, 'overall');
    return '<div class="doc-entry" role="group">' +
      '<span class="doc-av">' + RK.avatar(f.name.en + f.id, f.accent, 70) + '</span>' +
      '<span>' +
        '<h3>' + esc(P(f.name)) + (f.branch ? ' <span style="font-weight:400">— ' + esc(P(f.branch)) + '</span>' : '') + '</h3>' +
        '<p class="doc-sub">' + esc(T('facility.type.' + f.type)) + ' · ' + esc(P(f.area)) + ', ' + esc(P(f.city)) + '</p>' +
        '<span class="doc-flags">' +
          badge('plain', bn(list.length) + ' ' + T('sentiment.accounts')) +
          (f.parent ? badge('plain', T('facility.parent') + ' ' + P(f.parent)) : '') +
        '</span>' +
        '<span class="entry-actions">' +
          '<button class="btn small" type="button" data-facility="' + f.id + '">' + esc(T('nav.facility')) + '</button>' +
        '</span>' +
      '</span>' +
      '<span>' + distBlock(dist, RK.CRIT_VALUES, 'crit.', T('crit.overall')) + '</span>' +
    '</div>';
  }

  function renderTray() {
    var tray = $('#tray');
    var items = $('#tray-items');
    if (!tray || !items) { return; }
    items.innerHTML = state.compare.map(function (id) {
      var d = RK.doctorById(id);
      return '<span class="tray-chip">' + esc(P(d.name)) +
        '<button type="button" data-unpin="' + id + '" aria-label="' + esc(T('compare.remove')) + '">✕</button></span>';
    }).join('');
    tray.hidden = !(document.body.getAttribute('data-view') === 'results' && state.compare.length);
  }

  /* =====================================================================
     3 · Doctor profile
     ===================================================================== */

  function profileAccounts() {
    var list = RK.reviewsFor(state.doctorId, state.profileCondition);
    var f = state.profileFilter;
    if (f.outcome) { list = list.filter(function (r) { return r.outcome === f.outcome; }); }
    if (f.relationship) { list = list.filter(function (r) { return r.relationship === f.relationship; }); }
    if (f.docs) { list = list.filter(function (r) { return RK.evidenceFor(r.id).some(function (e) { return e.state === 'ready'; }); }); }
    return list;
  }

  function renderProfile() {
    var host = $('#view-profile');
    if (!host) { return; }
    var d = RK.doctorById(state.doctorId);
    if (!d) { return; }
    var all = RK.reviewsFor(d.id);
    var scoped = RK.reviewsFor(d.id, state.profileCondition);
    var shown = profileAccounts();
    var conds = RK.conditionsFor(d.id);
    var facs = RK.facilitiesForDoctor(d.id);

    var facts = [
      { k: T('profile.bmdc'), v: d.bmdc, p: d.provenance.bmdc },
      { k: T('profile.specialty'), v: P(d.specialty), p: d.provenance.specialty },
      { k: T('profile.qualifications'), v: P(d.qualifications), p: d.provenance.qualifications },
      { k: T('profile.languages'), v: P(d.languages), p: 'community' },
      { k: T('profile.fee'), v: P(d.fee), p: d.provenance.fee }
    ];

    host.innerHTML =
      '<section class="panel">' +
        '<div class="p-hero">' +
          '<span class="p-av">' + RK.avatar(d.name.en, d.accent, 118) + '</span>' +
          '<div>' +
            '<span class="kicker">' + esc(T('nav.profile')) + '</span>' +
            '<h1>' + esc(P(d.name)) + '</h1>' +
            '<p class="p-spec">' + esc(P(d.specialty)) + ' · ' + esc(P(d.area)) + ', ' + esc(P(d.city)) + '</p>' +
            '<div class="p-flags">' + notVerified() +
              badge('plain', bn(all.length) + ' ' + T('profile.accounts').toLowerCase()) +
              (d.claimed ? badge('plain', T('prov.provider')) : '') +
            '</div>' +
            '<div class="p-actions">' +
              '<button class="btn" type="button" data-goto="compose">' + esc(T('profile.write')) + '</button>' +
              '<button class="btn ghost small" type="button" id="claim">' + esc(T('profile.claimThis')) + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<div class="p-grid">' +
        '<div>' +
          '<section class="panel">' +
            '<h2 style="font-size:17px">' + esc(T('profile.conditions')) + '</h2>' +
            '<p class="note">' + esc(T('profile.byCondition')) + '</p>' +
            '<div class="pillrow">' +
              '<button type="button" data-pcond="" aria-pressed="' + (!state.profileCondition) + '">' + esc(T('profile.allConditions')) + ' (' + bn(all.length) + ')</button>' +
              conds.map(function (c) {
                return '<button type="button" data-pcond="' + c.condition.id + '" aria-pressed="' + (state.profileCondition === c.condition.id) + '">' +
                  esc(P(c.condition.name)) + ' (' + bn(c.count) + ')</button>';
              }).join('') +
            '</div>' +
            sentimentBlock(scoped) +
            '<div style="margin-top:22px">' + outcomeBlock(scoped) + '</div>' +
          '</section>' +

          '<section class="panel">' +
            '<h2 style="font-size:15px">' + esc(T('profile.breakdown')) + '</h2>' +
            '<table class="breakdown"><thead><tr>' +
              '<th>' + esc(T('filter.condition')) + '</th>' +
              '<th>' + esc(T('sentiment.positive')) + '</th><th>' + esc(T('sentiment.mixed')) + '</th><th>' + esc(T('sentiment.negative')) + '</th>' +
              '<th>' + esc(state.lang === 'bn' ? 'মোট' : 'Total') + '</th></tr></thead><tbody>' +
              conds.map(function (c) {
                var dd = RK.sentimentOf(RK.reviewsFor(d.id, c.condition.id));
                return '<tr><td>' + esc(P(c.condition.name)) + '</td>' +
                  '<td>' + bn(dd.counts.positive) + '</td><td>' + bn(dd.counts.mixed) + '</td><td>' + bn(dd.counts.negative) + '</td>' +
                  '<td>' + bn(dd.total) + (dd.limited ? ' ⚠' : '') + '</td></tr>';
              }).join('') +
            '</tbody></table>' +
            '<p class="denominator">' + esc(T('label.limitedDataWhy')) + '</p>' +
          '</section>' +

          '<section class="panel">' +
            '<h2 style="font-size:15px">' + esc(T('profile.filterAccounts')) + '</h2>' +
            '<div class="pillrow">' +
              RK.OUTCOMES.map(function (o) {
                return '<button type="button" data-pfilter="outcome:' + o + '" aria-pressed="' + (state.profileFilter.outcome === o) + '">' + esc(T('outcome.' + o)) + '</button>';
              }).join('') +
              '<button type="button" data-pfilter="docs:1" aria-pressed="' + (!!state.profileFilter.docs) + '">' + esc(T('profile.hasDocuments')) + '</button>' +
              ['self', 'parent', 'family', 'witness'].map(function (r) {
                return '<button type="button" data-pfilter="relationship:' + r + '" aria-pressed="' + (state.profileFilter.relationship === r) + '">' + esc(T('rel.' + r)) + '</button>';
              }).join('') +
            '</div>' +
            '<p class="denominator">' + esc(T('profile.showing')) + ' ' + bn(shown.length) + ' / ' + bn(scoped.length) + '</p>' +
          '</section>' +

          '<h2 class="section-head">' + esc(T('profile.accounts')) + '</h2>' +
          (shown.length ? shown.map(accountRow).join('')
            : '<div class="empty-state"><p>' + esc(T('mine.empty')) + '</p></div>') +
        '</div>' +

        '<aside class="p-side">' +
          '<section class="panel">' +
            '<h2 style="font-size:15px">' + esc(T('prov.title')) + '</h2>' +
            '<ul class="facts">' + facts.map(function (f) {
              return '<li><span class="k">' + esc(f.k) + '</span><span>' + esc(f.v) + '</span>' +
                '<span class="prov" data-p="' + f.p + '">' + esc(T('prov.' + f.p)) + '</span></li>';
            }).join('') + '</ul>' +
          '</section>' +
          '<section class="panel">' +
            '<h2 style="font-size:15px">' + esc(T('profile.chambers')) + '</h2>' +
            '<ul class="facts">' + d.chambers.map(function (ch) {
              return '<li><span>' + esc(P(ch.name)) + '</span><span class="k">' + esc(P(ch.hours)) + '</span>' +
                '<span class="prov" data-p="' + ch.provenance + '">' + esc(T('prov.' + ch.provenance)) + '</span></li>';
            }).join('') + '</ul>' +
          '</section>' +
          (facs.length ? '<section class="panel">' +
            '<h2 style="font-size:15px">' + esc(T('profile.facilities')) + '</h2>' +
            '<div class="mini-list">' + facs.map(function (f) {
              return '<button class="mini-row" type="button" data-facility="' + f.id + '">' +
                '<span class="mini-av">' + RK.avatar(f.name.en + f.id, f.accent, 38) + '</span>' +
                '<span><b>' + esc(P(f.name)) + '</b><span>' + esc(T('facility.type.' + f.type)) + '</span></span></button>';
            }).join('') + '</div>' +
            '<p class="note" style="margin-top:12px">' + esc(T('profile.facilitySep')) + '</p>' +
          '</section>' : '') +
        '</aside>' +
      '</div>';
  }

  /* =====================================================================
     4 · Account detail — the body
     ===================================================================== */

  var CHAPTER_KEYS = { symptoms: 'compose.symptoms', diagnosis: 'compose.diagnosis', treatment: 'compose.treatment', after: 'compose.after' };

  function renderAccount() {
    var host = $('#view-account');
    if (!host) { return; }
    var r = RK.reviewById(state.accountId);
    if (!r) { return; }
    var d = RK.doctorById(r.doctorId);
    var c = RK.conditionById(r.conditionId);
    var chain = RK.followUpsFor(r.id);
    var later = RK.laterCareFor(r.id);
    var thread = RK.commentsFor(r.id);
    var others = RK.accountsByAuthor(r);
    var related = RK.relatedByCondition(r.conditionId, r.id);
    var sameDoctor = RK.reviewsFor(r.doctorId).filter(function (x) { return x.id !== r.id; });

    /* Sections 1–13, in the order a reader needs them. */
    host.innerHTML =
      '<section class="a-head">' +
        '<span class="kicker">' + esc(T('experience.episode')) + ' · ' + esc(P(c.name)) + '</span>' +
        '<h1 class="a-title display">' + esc(P(r.title)) + '</h1>' +
        '<div class="a-flags">' +
          badge(r.sentiment, T('sentiment.' + r.sentiment)) +
          badge('plain', T('outcome.' + r.outcome)) +
          '<span class="tag">' + esc(P(c.name)) + '</span>' +
          badge('plain', T('review.episodeDate') + ': ' + P(r.period)) +
        '</div>' +
        (r.claims && r.claims.length ? '<p>' + r.claims.map(function (k) {
          return '<span class="reviewer-label"><b>' + esc(T('claim.' + k)) + '</b><i>' + esc(T('label.reviewerLabel')) + '</i></span>';
        }).join(' ') + '</p>' +
        '<p class="note">' + esc(T('label.reviewerLabelWhy')) + '</p>' : '') +
      '</section>' +

      '<div class="a-grid">' +
        '<div>' +

          '<p class="story story-lead">' + esc(P(r.body)) + '</p>' +

          (r.timeline ? '<h2 class="section-head">' + esc(T('experience.timeline')) + '</h2>' +
            '<ul class="chapters">' + r.timeline.map(function (t) {
              return '<li><span class="k">' + esc(T(CHAPTER_KEYS[t.k] || 'review.readFull')) + '</span>' +
                '<p>' + esc(L(t)) + '</p></li>';
            }).join('') + '</ul>' : '') +

          (chain.length ? '<h2 class="section-head">' + esc(T('label.followUp')) + '</h2>' +
            '<p class="note">' + esc(T('experience.currentNote')) + '</p>' +
            '<ul class="spine">' + chain.map(function (fu, i) {
              var isCurrent = i === chain.length - 1;
              return '<li class="' + (isCurrent ? 'current' : '') + '">' +
                '<span class="when">' + esc(P(fu.date)) + (isCurrent ? ' · ' + esc(T('experience.currentStatus')) : '') + '</span>' +
                '<p>' + esc(L(fu)) + '</p></li>';
            }).join('') + '</ul>' : '') +

          (later ? '<h2 class="section-head">' + esc(T('experience.laterCare')) + '</h2>' +
            '<div class="callout"><b>' + esc(P(later.provider)) + '</b>' + esc(L(later)) + '</div>' +
            '<p class="note" style="margin-top:10px">' + esc(T('experience.laterCareNote')) + '</p>' : '') +

          evidenceSection(r) +

          '<h2 class="section-head">' + esc(T('experience.discussion')) + ' <span style="font-weight:400;font-size:.6em;color:var(--ink-faint)">' + bn(thread.length) + '</span></h2>' +
          '<p class="note">' + esc(T('experience.providerNote')) + '</p>' +
          '<div>' + (thread.length ? thread.map(commentHtml).join('') : '<p class="note">' + esc(T('mine.empty')) + '</p>') + '</div>' +

          '<div class="composer-box">' +
            '<label class="sr-only" for="new-comment">' + esc(T('experience.commentBox')) + '</label>' +
            '<textarea id="new-comment" placeholder="' + esc(T('experience.commentBox')) + '"></textarea>' +
            '<p class="note" style="margin:8px 0">' + esc(T('experience.commentHint')) + '</p>' +
            '<button class="btn small" type="button">' + esc(T('experience.commentPost')) + '</button>' +
          '</div>' +

          '<div class="reactions">' +
            reactBtn(r.id + ':up', T('review.helpful'), r.likes) +
            reactBtn(r.id + ':down', T('review.notHelpful'), r.dislikes) +
            '<button class="react" type="button" data-report="account:' + r.id + '">' + esc(T('review.report')) + '</button>' +
            '<button class="react" type="button">' + esc(T('experience.bookmark')) + '</button>' +
          '</div>' +
          '<p class="note" style="margin-top:10px">' + esc(T('review.reactionNote')) + '</p>' +

          '<h2 class="section-head">' + esc(T('experience.relatedCond')) + '</h2>' +
          '<p class="note" style="margin-bottom:14px">' + esc(T('experience.relatedNote')) + '</p>' +
          (related.length ? '<div class="related-grid">' + related.map(relatedCard).join('') + '</div>'
            : '<p class="note">' + esc(T('mine.empty')) + '</p>') +

          (sameDoctor.length ? '<h2 class="section-head">' + esc(T('experience.relatedDoc')) + '</h2>' +
            '<div class="related-grid">' + sameDoctor.map(relatedCard).join('') + '</div>' : '') +

          '<div class="callout warn" style="margin-top:26px">' + esc(T('disclaimer.long')) + '</div>' +
        '</div>' +

        /* The margin: provenance, dates, identity and warnings sit beside
           the story rather than interrupting it. */
        '<aside class="a-margin">' +
          '<div><span class="k">' + esc(T('experience.writtenBy')) + '</span><span class="v">' + esc(T('rel.' + r.relationship)) + '</span></div>' +
          '<div><span class="k">' + esc(T('experience.identityMode')) + '</span><span class="v">' + esc(P(r.author)) + '</span>' +
            (r.identity === 'anon' ? '<br><span>' + esc(T('compose.identity.anonNote')) + '</span>' : '') + '</div>' +
          '<div><span class="k">' + esc(T('review.episodeDate')) + '</span><span class="v">' + esc(P(r.period)) + '</span></div>' +
          '<div><span class="k">' + esc(state.lang === 'bn' ? 'প্রকাশ' : 'Published') + '</span><span class="v">' + esc(P(r.posted)) + '</span></div>' +
          '<div><span class="k">' + esc(T('nav.profile')) + '</span>' +
            '<button class="link-btn" type="button" data-doctor="' + d.id + '">' + esc(P(d.name)) + '</button>' +
            '<br><span>' + esc(T('label.notVerified')) + '</span></div>' +
          '<div><span class="k">' + esc(T('filter.condition')) + '</span>' +
            '<button class="link-btn" type="button" data-condition="' + c.id + '">' + esc(P(c.name)) + '</button></div>' +
          '<div><span class="k">' + esc(T('review.tags')) + '</span>' +
            '<span style="display:flex;flex-wrap:wrap;gap:6px;margin-top:6px">' +
            r.tags.map(function (t) { return '<span class="tag">' + esc(L(t)) + '</span>'; }).join('') + '</span></div>' +
          (others.length ? '<div><span class="k">' + esc(T('experience.otherAccounts')) + '</span>' +
            others.map(function (o) {
              return '<button class="link-btn" type="button" data-account="' + o.id + '" style="display:block;text-align:start">' + esc(P(o.title)) + '</button>';
            }).join('') + '</div>' : '') +
        '</aside>' +
      '</div>';
  }

  function reactBtn(key, label, base) {
    var on = !!state.reactions[key];
    return '<button class="react" type="button" data-react="' + key + '" aria-pressed="' + on + '">' +
      esc(label) + ' <b>' + bn(base + (on ? 1 : 0)) + '</b></button>';
  }

  function evidenceSection(r) {
    var items = RK.evidenceFor(r.id);
    if (!items.length) {
      return '<h2 class="section-head">' + esc(T('filter.evidence')) + '</h2>' +
        '<p class="note">' + esc(T('label.noDocuments')) + '</p>';
    }
    var groups = RK.EVIDENCE_GROUPS.map(function (g) {
      var inG = items.filter(function (e) { return e.group === g; });
      if (!inG.length) { return ''; }
      return '<div class="ev-group"><h4>' + esc(T('evidence.group.' + g)) + '</h4>' +
        inG.map(function (e) {
          return '<div class="ev-item ' + (e.state === 'failed' ? 'failed' : '') + '">' +
            '<span class="doc-icon" aria-hidden="true"></span>' +
            '<span class="lbl"><b>' + esc(P(e.label)) + '</b>' +
              (e.state === 'failed'
                ? esc(P(e.failReason)) + ' ' + esc(T('ev.failNote'))
                : bn(e.pages) + ' ' + esc(state.lang === 'bn' ? 'পাতা' : 'pages')) + '</span>' +
            (e.state === 'failed' ? '' : '<button class="btn small ghost" type="button">' + esc(T('experience.openEvidence')) + '</button>') +
          '</div>';
        }).join('') + '</div>';
    }).join('');

    return '<h2 class="section-head">' + esc(T('filter.evidence')) + '</h2>' +
      '<div class="callout warn"><b>' + esc(T('evidence.status')) + '</b>' + esc(T('evidence.notice')) + '</div>' +
      '<div class="ev-groups" style="margin-top:12px">' + groups + '</div>' +
      '<p class="note" style="margin-top:10px">' + esc(T('experience.evidenceOnly')) + '</p>';
  }

  function commentHtml(k) {
    var body = esc(L(k));
    if (k.mentions) {
      k.mentions.forEach(function (m) {
        body = body.replace('@' + m, '<span class="mention">@' + esc(m) + '</span>');
      });
    }
    return '<article class="comment ' + (k.dangerous ? 'flagged' : '') + '">' +
      '<div class="comment-head">' +
        '<span class="name">' + esc(P(k.author)) + '</span>' +
        (k.providerFor ? badge('plain', T('experience.providerHere')) : '') +
        '<span>' + esc(P(k.when)) + '</span>' +
      '</div>' +
      (k.dangerous ? '<div class="callout danger" style="margin-bottom:10px"><b>⚠ ' + esc(T('report.dangerous')) + '</b>' + esc(T('experience.dangerWarning')) + '</div>' : '') +
      '<p>' + body + '</p>' +
      (k.link ? '<p class="note" style="margin-top:8px">⚠ ' + esc(T('experience.linkWarning')) + ' <code>' + esc(k.link) + '</code></p>' : '') +
      '<div class="comment-actions">' +
        '<button class="link-btn" type="button">' + esc(T('review.helpful')) + ' ' + bn(k.likes || 0) + '</button>' +
        '<button class="link-btn" type="button" data-report="comment:' + k.id + '">' + esc(T('review.report')) + '</button>' +
      '</div>' +
    '</article>';
  }

  function relatedCard(r) {
    var d = RK.doctorById(r.doctorId);
    return '<button class="related-card" type="button" data-account="' + r.id + '">' +
      badge(r.sentiment, T('sentiment.' + r.sentiment)) +
      '<h4>' + esc(P(r.title)) + '</h4>' +
      '<p>' + esc(P(d.name)) + ' · ' + esc(P(r.period)) + ' · ' + esc(T('outcome.' + r.outcome)) + '</p>' +
    '</button>';
  }

  /* =====================================================================
     5 · Condition page
     ===================================================================== */

  function renderCondition() {
    var host = $('#view-condition');
    if (!host) { return; }
    var c = RK.conditionById(state.conditionId);
    if (!c) { return; }
    var list = RK.conditionAccounts(c.id);
    var docs = RK.doctorsForCondition(c.id);
    var facIds = {};
    docs.forEach(function (x) { RK.facilitiesForDoctor(x.doctor.id).forEach(function (f) { facIds[f.id] = true; }); });
    var facs = Object.keys(facIds).map(RK.facilityById);

    function freq(group, title) {
      var rows = RK.tagFrequency(c.id, group);
      if (!rows.length) { return ''; }
      var max = rows[0].count;
      return '<section class="panel">' +
        '<h2 style="font-size:15px">' + esc(title) + '</h2>' +
        '<ul class="freq-list">' + rows.map(function (x) {
          return '<li><span>' + esc(L(x.tag)) + '</span>' +
            '<span class="track"><i style="--w:' + Math.round((x.count / max) * 100) + '%"></i></span>' +
            '<span class="n">' + bn(x.count) + '</span></li>';
        }).join('') + '</ul>' +
        '<p class="denominator">' + esc(T('condition.mentionNote')) + '</p>' +
      '</section>';
    }

    host.innerHTML =
      '<section class="a-head">' +
        '<span class="kicker">' + esc(T('nav.condition')) + '</span>' +
        '<h1 class="display">' + esc(P(c.name)) + '</h1>' +
        '<p class="note">' + esc(T('condition.alsoCalled')) + ': ' + c.aliases.map(esc).join(' · ') + '</p>' +
        '<p class="lede" style="margin-top:12px">' + bn(list.length) + ' ' + esc(T('sentiment.accounts')) + ' · ' +
          bn(docs.length) + ' ' + esc(T('condition.doctors').toLowerCase()) + '</p>' +
      '</section>' +

      '<div class="p-grid">' +
        '<div>' +
          '<section class="panel">' +
            '<h2 style="font-size:15px">' + esc(T('condition.acrossAll')) + '</h2>' +
            sentimentBlock(list) +
            '<div style="margin-top:22px">' + outcomeBlock(list) + '</div>' +
          '</section>' +

          freq('medicine', T('condition.medicines')) +
          freq('treatment', T('condition.treatments')) +
          freq('symptom', T('condition.symptoms')) +

          '<div class="callout" style="margin-bottom:18px"><b>' + esc(T('condition.provisional')) + '</b>' + esc(T('condition.provNote')) + '</div>' +

          '<h2 class="section-head">' + esc(T('condition.accounts')) + '</h2>' +
          list.map(accountRow).join('') +
        '</div>' +

        '<aside class="p-side">' +
          '<section class="panel">' +
            '<h2 style="font-size:15px">' + esc(T('condition.doctors')) + '</h2>' +
            '<div class="mini-list">' + docs.map(function (x) {
              return '<button class="mini-row" type="button" data-doctor="' + x.doctor.id + '">' +
                '<span class="mini-av">' + RK.avatar(x.doctor.name.en, x.doctor.accent, 38) + '</span>' +
                '<span><b>' + esc(P(x.doctor.name)) + '</b><span>' + esc(P(x.doctor.specialty)) + ' · ' +
                bn(x.count) + ' ' + esc(T('sentiment.accounts')) + '</span></span></button>';
            }).join('') + '</div>' +
            '<p class="note" style="margin-top:12px">' + esc(T('sort.whyBody')) + '</p>' +
          '</section>' +
          (facs.length ? '<section class="panel">' +
            '<h2 style="font-size:15px">' + esc(T('condition.facilities')) + '</h2>' +
            '<div class="mini-list">' + facs.map(function (f) {
              return '<button class="mini-row" type="button" data-facility="' + f.id + '">' +
                '<span class="mini-av">' + RK.avatar(f.name.en + f.id, f.accent, 38) + '</span>' +
                '<span><b>' + esc(P(f.name)) + '</b><span>' + esc(T('facility.type.' + f.type)) + '</span></span></button>';
            }).join('') + '</div>' +
          '</section>' : '') +
          '<section class="panel" style="border-color:var(--danger-line)">' +
            '<h2 style="font-size:15px;color:var(--danger-ink)">' + esc(T('emergency.title')) + '</h2>' +
            '<p class="note">' + esc(T('emergency.body')) + '</p>' +
          '</section>' +
        '</aside>' +
      '</div>';
  }

  /* =====================================================================
     6 · Facility profile
     ===================================================================== */

  function renderFacility() {
    var host = $('#view-facility');
    if (!host) { return; }
    var f = RK.facilityById(state.facilityId);
    if (!f) { return; }
    var list = RK.facilityReviewsFor(f.id);
    var docs = RK.doctorsForFacility(f.id);
    var siblings = RK.branchesOf(f.id).filter(function (o) { return o.id !== f.id; });

    host.innerHTML =
      '<section class="panel">' +
        '<div class="p-hero">' +
          '<span class="p-av">' + RK.avatar(f.name.en + f.id, f.accent, 118) + '</span>' +
          '<div>' +
            '<span class="kicker">' + esc(T('facility.type.' + f.type)) + '</span>' +
            '<h1>' + esc(P(f.name)) + '</h1>' +
            '<p class="p-spec">' + (f.branch ? esc(P(f.branch)) + ' · ' : '') + esc(P(f.area)) + ', ' + esc(P(f.city)) + '</p>' +
            '<div class="p-flags">' +
              badge('plain', bn(list.length) + ' ' + T('sentiment.accounts')) +
              '<span class="prov" data-p="' + f.provenance.name + '">' + esc(T('prov.' + f.provenance.name)) + '</span>' +
              (f.parent ? badge('plain', T('facility.parent') + ' ' + P(f.parent)) : '') +
            '</div>' +
            '<button class="btn" type="button" data-goto="compose">' + esc(T('facility.write')) + '</button>' +
          '</div>' +
        '</div>' +
      '</section>' +

      '<div class="callout warn" style="margin-bottom:18px"><b>' + esc(T('facility.separation')) + '</b></div>' +

      '<div class="p-grid">' +
        '<div>' +
          '<section class="panel">' +
            '<h2 style="font-size:17px">' + esc(T('facility.criteria')) + '</h2>' +
            '<div class="crit-grid">' + RK.CRITERIA.map(function (key) {
              var dist = RK.criteriaDist(list, key);
              return '<div class="crit"><h4>' + esc(T('crit.' + key)) + '</h4>' +
                distBlock(dist, RK.CRIT_VALUES, 'crit.', null) +
                (key === 'reportTrust' ? '<p class="denominator">' + esc(T('crit.reportTrustNote')) + '</p>' : '') +
              '</div>';
            }).join('') + '</div>' +
          '</section>' +

          '<h2 class="section-head">' + esc(T('facility.accounts')) + '</h2>' +
          list.map(function (r) {
            return '<article class="acct">' +
              '<div class="row-flags">' +
                badge(r.criteria.overall || 'plain', r.criteria.overall ? T('crit.' + r.criteria.overall) : T('label.notProvided')) +
                badge('plain', T('review.episodeDate') + ': ' + P(r.period)) +
              '</div>' +
              '<p class="who"><span>' + esc(P(r.author)) + '</span><span>' + esc(P(r.posted)) + '</span></p>' +
              '<p class="excerpt">' + esc(P(r.body)) + '</p>' +
              '<div style="display:flex;flex-wrap:wrap;gap:7px;margin-top:10px">' +
                RK.CRITERIA.filter(function (k) { return r.criteria[k]; }).map(function (k) {
                  return '<span class="tag">' + esc(T('crit.' + k)) + ': ' + esc(T('crit.' + r.criteria[k])) + '</span>';
                }).join('') +
              '</div>' +
            '</article>';
          }).join('') +
        '</div>' +

        '<aside class="p-side">' +
          (docs.length ? '<section class="panel">' +
            '<h2 style="font-size:15px">' + esc(T('facility.doctorsHere')) + '</h2>' +
            '<div class="mini-list">' + docs.map(function (d) {
              return '<button class="mini-row" type="button" data-doctor="' + d.id + '">' +
                '<span class="mini-av">' + RK.avatar(d.name.en, d.accent, 38) + '</span>' +
                '<span><b>' + esc(P(d.name)) + '</b><span>' + esc(P(d.specialty)) + '</span></span></button>';
            }).join('') + '</div>' +
            '<p class="note" style="margin-top:12px">' + esc(T('facility.doctorsNote')) + '</p>' +
          '</section>' : '') +
          (siblings.length ? '<section class="panel">' +
            '<h2 style="font-size:15px">' + esc(T('facility.branch')) + '</h2>' +
            '<div class="mini-list">' + siblings.map(function (o) {
              return '<button class="mini-row" type="button" data-facility="' + o.id + '">' +
                '<span class="mini-av">' + RK.avatar(o.name.en + o.id, o.accent, 38) + '</span>' +
                '<span><b>' + esc(P(o.branch || o.name)) + '</b><span>' + esc(P(o.area)) + '</span></span></button>';
            }).join('') + '</div>' +
          '</section>' : '') +
        '</aside>' +
      '</div>';
  }

  /* =====================================================================
     7 · Composer
     ===================================================================== */

  var TAG_GROUPS = [
    { g: 'symptom', label: 'compose.tagGroup.symptom', items: [
      { en: 'Excessive thirst', bn: 'অতিরিক্ত তৃষ্ণা' }, { en: 'Fatigue', bn: 'ক্লান্তি' },
      { en: 'Chest tightness', bn: 'বুকে চাপ' }, { en: 'Blurred vision', bn: 'ঝাপসা দৃষ্টি' }] },
    { g: 'condition', label: 'compose.tagGroup.condition', items: [
      { en: 'Type 2 diabetes', bn: 'টাইপ ২ ডায়াবেটিস' }, { en: 'High blood pressure', bn: 'উচ্চ রক্তচাপ' },
      { en: 'Hypothyroidism', bn: 'হাইপোথাইরয়েড' }] },
    { g: 'treatment', label: 'compose.tagGroup.treatment', items: [
      { en: 'Insulin adjustment', bn: 'ইনসুলিন সমন্বয়' }, { en: 'Physiotherapy', bn: 'ফিজিওথেরাপি' },
      { en: 'Diet plan', bn: 'খাদ্য পরিকল্পনা' }] },
    { g: 'medicine', label: 'compose.tagGroup.medicine', items: [
      { en: 'Metformin', bn: 'মেটফরমিন' }, { en: 'Levothyroxine', bn: 'লেভোথাইরক্সিন' }] }
  ];

  /* Automated checks, run on the text as typed. They are advisory: none of
     them blocks publishing, matching the "eligible text publishes
     immediately" rule. */
  function safetyChecks() {
    var out = [];
    var txt = state.composeStory || '';
    if (/(\+?8801|01)[0-9\s-]{7,}/.test(txt)) {
      out.push({ id: 'pii', level: 'warn', title: T('compose.safetyPii'), fix: T('compose.safetyPiiFix') });
    }
    if (/(emergency|জরুরি|chest pain now|ambulance|অ্যাম্বুলেন্স|999)/i.test(txt)) {
      out.push({ id: 'emerg', level: 'danger', title: T('compose.safetyEmerg'), fix: T('compose.safetyEmergFix') });
    }
    var dup = RK.user.published.some(function (id) {
      var pub = RK.reviewById(id);
      return pub && pub.doctorId === state.doctorId &&
        state.composeTags.some(function (t) { return t !== 'notsure' && t.split(':')[0] === 'condition' && t.split(':')[1] === RK.conditionById(pub.conditionId).name.en; });
    });
    if (dup) {
      out.push({ id: 'dup', level: 'warn', title: T('compose.safetyDup'), fix: T('compose.safetyDupFix') });
    }
    return out.filter(function (x) { return state.ignoredChecks.indexOf(x.id) === -1; });
  }

  function renderCompose() {
    var host = $('#view-compose');
    if (!host) { return; }
    var detailed = state.composeMode === 'detailed';
    var checks = safetyChecks();

    var storyFields = detailed
      ? ['compose.symptoms', 'compose.diagnosis', 'compose.treatment', 'compose.after'].map(function (k, i) {
          return '<div class="field"><label for="f-' + i + '">' + esc(T(k)) + '</label>' +
            '<textarea id="f-' + i + '"' + (i === 0 ? ' data-story="1"' : '') + '></textarea></div>';
        }).join('')
      : '<div class="field"><label for="f-story">' + esc(T('compose.story')) + '<span class="req">' + esc(T('compose.required')) + '</span></label>' +
        '<p class="sub">' + esc(T('compose.storyHint')) + '</p>' +
        '<textarea id="f-story" data-story="1" style="min-height:170px"></textarea></div>';

    host.innerHTML =
      '<section class="a-head">' +
        '<span class="kicker">' + esc(T('nav.compose')) + '</span>' +
        '<h1 class="display">' + esc(T('compose.title')) + '</h1>' +
        '<p class="lede">' + esc(T('compose.intro')) + '</p>' +
      '</section>' +

      '<div class="c-modes">' +
        '<button class="c-mode" type="button" data-mode="quick" aria-pressed="' + (!detailed) + '">' +
          '<b>' + esc(T('compose.mode.quick')) + '</b><span>' + esc(T('compose.mode.quickHint')) + '</span></button>' +
        '<button class="c-mode" type="button" data-mode="detailed" aria-pressed="' + detailed + '">' +
          '<b>' + esc(T('compose.mode.detailed')) + '</b><span>' + esc(T('compose.mode.detailedHint')) + '</span></button>' +
      '</div>' +

      '<div class="c-grid">' +
        '<section class="panel">' +

          '<div class="field"><label for="f-doctor">' + esc(T('compose.doctor')) + '<span class="req">' + esc(T('compose.required')) + '</span></label>' +
            '<select id="f-doctor">' + RK.doctors.map(function (d) {
              return '<option value="' + d.id + '"' + (d.id === state.doctorId ? ' selected' : '') + '>' + esc(P(d.name)) + ' — ' + esc(P(d.specialty)) + '</option>';
            }).join('') + '</select>' +
            '<p class="sub" style="margin-top:10px">' +
              '<button class="link-btn" type="button" id="add-doctor">' + esc(T('compose.addDoctor')) + '</button></p>' +
            '<div id="add-doctor-panel" hidden>' +
              '<div class="callout" style="margin-top:10px">' +
                '<div class="field" style="margin-bottom:12px"><label for="ad-name">' + esc(T('compose.addName')) + '</label><input id="ad-name" type="text"></div>' +
                '<div class="field" style="margin-bottom:12px"><label for="ad-bmdc">' + esc(T('compose.addBmdc')) + '</label><input id="ad-bmdc" type="text"></div>' +
                '<div class="field" style="margin-bottom:12px"><label for="ad-spec">' + esc(T('compose.addSpecialty')) + '</label><input id="ad-spec" type="text"></div>' +
                '<div class="field" style="margin-bottom:12px"><label for="ad-cham">' + esc(T('compose.addChamber')) + '</label><input id="ad-cham" type="text"></div>' +
                '<button class="btn small" type="button" id="ad-submit">' + esc(T('compose.addSubmit')) + '</button>' +
                '<p class="note" style="margin-top:10px">' + esc(T('compose.addPending')) + '</p>' +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="field"><span class="lbl">' + esc(T('compose.relationship')) + '<span class="req">' + esc(T('compose.required')) + '</span></span>' +
            '<div class="opt-row">' + ['self', 'parent', 'family', 'witness'].map(function (r) {
              return '<button class="opt" type="button" data-rel="' + r + '" aria-pressed="' + (r === 'self') + '">' + esc(T('rel.' + r)) + '</button>';
            }).join('') + '</div></div>' +

          '<div class="field"><label for="f-period">' + esc(T('compose.period')) + '</label>' +
            '<p class="sub">' + esc(T('compose.periodNote')) + '</p>' +
            '<input id="f-period" type="text" value="' + esc(state.lang === 'bn' ? 'মার্চ ২০২৬' : 'March 2026') + '"></div>' +

          storyFields +

          '<div class="field"><span class="lbl">' + esc(T('compose.tags')) + '<span class="req">' + esc(T('compose.required')) + '</span></span>' +
            '<p class="sub">' + esc(T('compose.tagsRequired')) + '</p>' +
            '<div class="tag-groups">' + TAG_GROUPS.map(function (grp) {
              return '<div class="tag-group"><span>' + esc(T(grp.label)) + '</span><div class="opt-row">' +
                grp.items.map(function (it) {
                  var id = grp.g + ':' + it.en;
                  return '<button class="opt" type="button" data-tag="' + esc(id) + '" aria-pressed="' +
                    (state.composeTags.indexOf(id) !== -1) + '">' + esc(P(it)) + '</button>';
                }).join('') + '</div></div>';
            }).join('') +
            '<div class="opt-row"><button class="opt" type="button" data-tag="notsure" aria-pressed="' +
              (state.composeTags.indexOf('notsure') !== -1) + '">' + esc(T('compose.notSure')) + '</button></div>' +
            '</div></div>' +

          '<div class="field"><span class="lbl">' + esc(T('compose.sentiment')) + ' — ' + esc(T('compose.optional')) + '</span>' +
            '<div class="opt-row">' + RK.SENTIMENTS.map(function (s) {
              var cls = s === 'positive' ? 'pos' : (s === 'mixed' ? 'mix' : 'neg');
              return '<button class="opt ' + cls + '" type="button" data-sent="' + s + '" aria-pressed="' + (state.composeSentiment === s) + '">' +
                esc(T('sentiment.' + s)) + '</button>';
            }).join('') + '</div></div>' +

          '<div class="field"><span class="lbl">' + esc(T('compose.outcome')) + ' — ' + esc(T('compose.optional')) + '</span>' +
            '<div class="opt-row">' + RK.OUTCOMES.map(function (o) {
              return '<button class="opt" type="button" data-out="' + o + '" aria-pressed="' + (state.composeOutcome === o) + '">' + esc(T('outcome.' + o)) + '</button>';
            }).join('') + '</div></div>' +

          '<div class="field"><span class="lbl">' + esc(T('compose.claims')) + ' — ' + esc(T('compose.optional')) + '</span>' +
            '<p class="sub">' + esc(T('compose.claimsNote')) + '</p>' +
            '<div class="opt-row">' + ['wrongDx', 'wrongRx', 'secondOpinion'].map(function (c) {
              return '<button class="opt" type="button" data-claim="' + c + '" aria-pressed="' + (state.composeClaims.indexOf(c) !== -1) + '">' + esc(T('claim.' + c)) + '</button>';
            }).join('') + '</div></div>' +

          '<div class="field"><span class="lbl">' + esc(T('compose.identity')) + '</span>' +
            '<div class="opt-row">' + [['real', 'compose.identity.real'], ['pseudo', 'compose.identity.pseudo'], ['anon', 'compose.identity.anon']].map(function (p) {
              return '<button class="opt" type="button" data-ident="' + p[0] + '" aria-pressed="' + (state.composeIdentity === p[0]) + '">' + esc(T(p[1])) + '</button>';
            }).join('') + '</div>' +
            (state.composeIdentity === 'anon' ? '<p class="limited" style="margin-top:12px">' + esc(T('compose.identity.anonNote')) + '</p>' : '') +
          '</div>' +

          '<div class="field"><span class="lbl">' + esc(T('compose.evidence')) + ' — ' + esc(T('compose.optional')) + '</span>' +
            '<p class="sub">' + esc(T('compose.evidenceOptional')) + '</p>' +
            '<div class="redact"><b>' + esc(T('compose.redact')) + '</b><span>' + esc(T('compose.redactBody')) + '</span>' +
              '<div class="redact-canvas" id="redact" role="application" aria-label="' + esc(T('compose.redactTool')) + '"></div>' +
              '<p class="note" style="margin-top:8px;color:inherit">' + esc(T('compose.redactTool')) + '</p></div>' +
            '<div class="ev-upload" id="ev-upload">' + state.composeFiles.map(evFileHtml).join('') + '</div>' +
            '<button class="btn small ghost" type="button" id="add-file" style="margin-top:10px">' + esc(T('compose.evidence')) + ' +</button>' +
          '</div>' +

          '<div class="field"><span class="lbl">' + esc(T('compose.safety')) + '</span>' +
            '<p class="sub">' + esc(T('compose.safetyNote')) + '</p>' +
            '<div class="safety">' +
              (checks.length ? checks.map(function (ch) {
                return '<div class="safety-item ' + ch.level + '"><span class="mark">⚠</span>' +
                  '<span><b>' + esc(ch.title) + '</b>' + esc(ch.fix) +
                  '<span class="safety-actions">' +
                    '<button class="link-btn" type="button" data-ignore="' + ch.id + '">' + esc(T('compose.ignore')) + '</button>' +
                  '</span></span></div>';
              }).join('')
              : '<div class="safety-item ok"><span class="mark">✓</span><span><b>' + esc(T('compose.safetyPass')) + '</b>' +
                esc(T('compose.publishedNote')) + '</span></div>') +
            '</div>' +
          '</div>' +

          '<div class="field" style="margin-bottom:0">' +
            '<span class="lbl">' + esc(T('compose.confirmTitle')) + '</span>' +
            '<div class="check-list">' + ['compose.confirm1', 'compose.confirm2', 'compose.confirm3', 'compose.age'].map(function (k, i) {
              return '<label class="check"><input type="checkbox" data-confirm="' + i + '"><span>' + esc(T(k)) + '</span></label>';
            }).join('') + '</div>' +
            '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">' +
              '<button class="btn" type="button" id="publish">' + esc(T('compose.publish')) + '</button>' +
              '<button class="btn ghost small" type="button" id="save-draft">' + esc(T('compose.saveExit')) + '</button>' +
              '<span class="saved-flag" id="saved-flag">' + esc(T('compose.draftSaved')) + '</span>' +
            '</div>' +
            (state.published ? '<div class="callout" style="margin-top:14px;border-color:var(--positive);color:var(--positive)">✓ ' + esc(T('compose.publishedNote')) + '</div>' : '') +
          '</div>' +
        '</section>' +

        '<aside class="c-side">' +
          '<section class="panel preview-card"><span class="k">' + esc(T('compose.preview')) + '</span><div id="preview"></div></section>' +
          '<section class="panel" style="border-color:var(--warn-line)"><p class="note" style="color:var(--warn-ink)">' + esc(T('disclaimer.long')) + '</p></section>' +
        '</aside>' +
      '</div>';

    renderPreview();
    buildRedactDoc();
  }

  function evFileHtml(f) {
    var cls = f.state === 'ready' ? 'done' : (f.state === 'failed' ? 'bad' : '');
    var order = ['quarantine', 'checking', 'scanning', 'redact', 'processing', 'ready'];
    var pct = f.state === 'failed' ? 100 : Math.round((order.indexOf(f.state) + 1) / order.length * 100);
    return '<div class="ev-file ' + cls + '" data-file="' + f.id + '">' +
      '<span><b>' + esc(f.name) + '</b>' +
        '<span class="state">' + esc(T('ev.state.' + (f.state === 'failed' ? 'failed' : f.state))) + '</span>' +
        (f.state === 'failed' ? '<span class="state">' + esc(T('ev.failNote')) + '</span>' : '') +
        '<span class="ev-bar"><i style="--w:' + pct + '%"></i></span>' +
      '</span>' +
      '<span style="display:flex;gap:8px">' +
        '<button class="link-btn" type="button" data-refile="' + f.id + '">' + esc(T('ev.replace')) + '</button>' +
        '<button class="link-btn" type="button" data-rmfile="' + f.id + '">' + esc(T('ev.remove')) + '</button>' +
      '</span>' +
    '</div>';
  }

  /* Walks a file through the real pipeline stages. With motion off the
     states still advance — just without the wait. */
  function advanceFile(f) {
    var order = ['quarantine', 'checking', 'scanning', 'redact', 'processing', 'ready'];
    var step = function () {
      var i = order.indexOf(f.state);
      if (i < 0 || i >= order.length - 1) { return; }
      f.state = f.failAt && order[i + 1] === f.failAt ? 'failed' : order[i + 1];
      var host = $('#ev-upload');
      if (host) { host.innerHTML = state.composeFiles.map(evFileHtml).join(''); }
      if (f.state !== 'ready' && f.state !== 'failed') {
        setTimeout(step, motionAllowed() ? 700 : 0);
      }
    };
    setTimeout(step, motionAllowed() ? 500 : 0);
  }

  function renderPreview() {
    var host = $('#preview');
    if (!host) { return; }
    var d = RK.doctorById(state.doctorId);
    var who = state.composeIdentity === 'anon' ? T('compose.identity.anon')
      : (state.composeIdentity === 'real' ? (state.lang === 'bn' ? 'আপনার নাম' : 'Your name') : 'shirin_88');
    host.innerHTML =
      '<p class="denominator" style="margin:0 0 9px">' + esc(who) + ' · ' + esc(P(d.name)) + '</p>' +
      (state.composeSentiment ? badge(state.composeSentiment, T('sentiment.' + state.composeSentiment)) : badge('plain', T('label.notProvided'))) +
      ' ' + (state.composeOutcome ? badge('plain', T('outcome.' + state.composeOutcome)) : '') +
      '<p style="margin-top:11px;font-size:15px;color:var(--ink-soft)">' +
        esc(state.composeStory ? state.composeStory.slice(0, 220) : (state.lang === 'bn' ? 'আপনার লেখা এখানে দেখা যাবে।' : 'Your words will appear here.')) + '</p>' +
      (state.composeClaims.length ? '<p style="margin-top:10px">' + state.composeClaims.map(function (c) {
        return '<span class="reviewer-label">' + esc(T('claim.' + c)) + '</span>';
      }).join(' ') + '</p>' : '') +
      (state.composeTags.length ? '<p style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap">' + state.composeTags.map(function (t) {
        return '<span class="tag">' + esc(t === 'notsure' ? T('compose.notSure') : t.split(':')[1]) + '</span>';
      }).join('') + '</p>' : '');
  }

  function buildRedactDoc() {
    var host = $('#redact');
    if (!host) { return; }
    var lines = '', seed = 91;
    for (var i = 0; i < 14; i++) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      lines += '<span class="doc-line" style="left:8%;top:' + (7 + i * 6.2) + '%;width:' + (24 + (seed % 60)) + '%"></span>';
    }
    host.innerHTML = lines;
    var drawing = false, start = null, box = null;
    host.addEventListener('pointerdown', function (e) {
      drawing = true;
      var rect = host.getBoundingClientRect();
      start = { x: e.clientX - rect.left, y: e.clientY - rect.top };
      box = document.createElement('span'); box.className = 'mask';
      host.appendChild(box);
      if (host.setPointerCapture) { host.setPointerCapture(e.pointerId); }
    });
    host.addEventListener('pointermove', function (e) {
      if (!drawing || !box) { return; }
      var rect = host.getBoundingClientRect();
      var x = e.clientX - rect.left, y = e.clientY - rect.top;
      box.style.left = Math.min(x, start.x) + 'px';
      box.style.top = Math.min(y, start.y) + 'px';
      box.style.width = Math.abs(x - start.x) + 'px';
      box.style.height = Math.abs(y - start.y) + 'px';
    });
    host.addEventListener('pointerup', function () { drawing = false; box = null; });
  }

  /* =====================================================================
     8 · My contributions
     ===================================================================== */

  function renderMine() {
    var host = $('#view-mine');
    if (!host) { return; }
    var u = RK.user;
    var tabs = [
      { k: 'published', n: u.published.length },
      { k: 'drafts', n: u.drafts.length },
      { k: 'bookmarks', n: u.bookmarks.length },
      { k: 'notifications', n: u.notifications.filter(function (n) { return n.unread; }).length }
    ];

    var body = '';
    if (state.mineTab === 'published') {
      body = u.published.map(function (id) {
        var r = RK.reviewById(id);
        var d = RK.doctorById(r.doctorId);
        return '<article class="mine-item">' +
          '<div class="row-flags">' + badge(r.sentiment, T('sentiment.' + r.sentiment)) +
            badge('plain', T('outcome.' + r.outcome)) +
            badge('plain', bn(RK.followUpsFor(r.id).length) + ' ' + T('label.followUp').toLowerCase()) + '</div>' +
          '<h3>' + esc(P(r.title)) + '</h3>' +
          '<p class="note">' + esc(P(d.name)) + ' · ' + esc(P(r.period)) + ' · ' + esc(P(r.posted)) + '</p>' +
          '<div class="mine-actions">' +
            '<button class="btn small ghost" type="button" data-account="' + r.id + '">' + esc(T('review.readFull')) + '</button>' +
            '<button class="btn small ghost" type="button">' + esc(T('mine.edit')) + '</button>' +
            '<button class="btn small ghost" type="button">' + esc(T('mine.addFollowUp')) + '</button>' +
            '<button class="btn small ghost" type="button">' + esc(T('mine.delete')) + '</button>' +
          '</div>' +
          '<p class="note">' + esc(T('mine.deleteNote')) + '</p>' +
        '</article>';
      }).join('');
    } else if (state.mineTab === 'drafts') {
      body = '<p class="note" style="margin-bottom:14px">' + esc(T('mine.draftNote')) + '</p>' +
        u.drafts.map(function (dr) {
          return '<article class="mine-item">' +
            '<div class="row-flags">' +
              badge(dr.expiresInDays <= 7 ? 'warn' : 'plain', T('mine.draftExpires') + ' ' + bn(dr.expiresInDays) + ' ' + T('mine.days')) +
              (dr.blocked ? badge('warn', T('compose.addPending').slice(0, 40) + '…') : '') +
            '</div>' +
            '<h3>' + esc(P(dr.title)) + '</h3>' +
            '<p class="excerpt">' + esc(P(dr.excerpt)) + '</p>' +
            '<div class="mine-actions">' +
              '<button class="btn small" type="button" data-goto="compose">' + esc(T('mine.continue')) + '</button>' +
              '<button class="btn small ghost" type="button">' + esc(T('mine.delete')) + '</button>' +
            '</div>' +
          '</article>';
        }).join('');
    } else if (state.mineTab === 'bookmarks') {
      body = '<p class="note" style="margin-bottom:14px">' + esc(T('mine.bookmarkNote')) + '</p>' +
        u.bookmarks.map(function (id) { return accountRow(RK.reviewById(id)); }).join('');
    } else {
      body = '<p class="note" style="margin-bottom:14px">' + esc(T('mine.notifNote')) + '</p>' +
        u.notifications.map(function (n) {
          return '<div class="notif ' + (n.unread ? 'unread' : '') + '">' +
            '<span class="dot" aria-hidden="true"></span>' +
            '<span>' + esc(L(n.text)) + '<span class="when">' + esc(P(n.when)) + '</span></span></div>';
        }).join('');
    }

    host.innerHTML =
      '<section class="a-head">' +
        '<span class="kicker">' + esc(P(RK.user.display)) + ' · ' + esc(RK.user.username) + '</span>' +
        '<h1 class="display">' + esc(T('mine.title')) + '</h1>' +
        '<p class="note">' + esc(P(RK.user.joined)) + '</p>' +
      '</section>' +
      '<section class="panel">' +
        '<div class="mine-tabs">' + tabs.map(function (t) {
          return '<button type="button" data-mine="' + t.k + '" aria-pressed="' + (state.mineTab === t.k) + '">' +
            esc(T('mine.' + t.k)) + '<span class="count">' + bn(t.n) + '</span></button>';
        }).join('') + '</div>' +
        (body || '<p class="note">' + esc(T('mine.empty')) + '</p>') +
      '</section>' +
      '<section class="panel" style="border-color:var(--warn-line)">' +
        '<h2 style="font-size:15px;color:var(--warn-ink)">' + esc(T('appeal.title')) + '</h2>' +
        '<table class="kv"><tbody>' +
          '<tr><th>' + esc(T('appeal.action')) + '</th><td>' + esc(T('admin.act.hide')) + ' — ' + esc(P(RK.reviewById('r4').title)) + '</td></tr>' +
          '<tr><th>' + esc(T('appeal.policyReason')) + '</th><td>' + esc(T('report.dangerous')) + '</td></tr>' +
          '<tr><th>' + esc(T('report.identityNote')) + '</th><td>' + esc(T('appeal.noReporter')) + '</td></tr>' +
        '</tbody></table>' +
        '<button class="btn small" type="button" id="open-appeal" style="margin-top:12px">' + esc(T('appeal.button')) + '</button>' +
      '</section>';
  }

  /* =====================================================================
     Sheets: compare, report, appeal
     ===================================================================== */

  function openSheet(title, body) {
    $('#sheet-title').textContent = title;
    $('#sheet-body').innerHTML = body;
    $('#overlay').hidden = false;
    var c = $('#sheet-close');
    if (c) { c.focus(); }
  }
  function closeSheet() { $('#overlay').hidden = true; }

  function openCompare() {
    if (!state.compare.length) {
      openSheet(T('compare.title'), '<p class="note">' + esc(T('compare.empty')) + '</p>');
      return;
    }
    var cols = state.compare.map(function (id) {
      var d = RK.doctorById(id);
      var list = RK.reviewsFor(id);
      return '<div class="compare-col">' +
        '<h3>' + esc(P(d.name)) + '</h3>' +
        '<p class="doc-sub">' + esc(P(d.specialty)) + ' · ' + esc(P(d.city)) + '</p>' +
        '<div style="margin:10px 0">' + notVerified() + '</div>' +
        sentimentBlock(list) +
        '<div style="margin-top:16px">' + outcomeBlock(list) + '</div>' +
        '<table class="breakdown" style="margin-top:14px"><tbody>' +
          RK.conditionsFor(id).map(function (c) {
            return '<tr><td>' + esc(P(c.condition.name)) + '</td><td>' + bn(c.count) + '</td></tr>';
          }).join('') + '</tbody></table>' +
        '<button class="btn small ghost block" type="button" data-doctor="' + id + '" style="margin-top:12px">' + esc(T('nav.profile')) + '</button>' +
      '</div>';
    }).join('');
    openSheet(T('compare.title'),
      '<div class="callout warn" style="margin-bottom:16px"><b>' + esc(T('compare.notRanking')) + '</b></div>' +
      '<div class="compare-grid">' + cols + '</div>');
  }

  function openReport(target) {
    var reasons = ['privacy', 'threat', 'unsafeFile', 'dangerous', 'factual', 'spam', 'impersonation'];
    openSheet(T('report.title'),
      '<div class="field"><span class="lbl">' + esc(T('report.reason')) + '</span>' +
        '<div class="opt-row">' + reasons.map(function (r) {
          return '<button class="opt" type="button" data-reason="' + r + '">' + esc(T('report.' + r)) + '</button>';
        }).join('') + '</div>' +
        '<p class="note" style="margin-top:10px">' + esc(T('report.factualNote')) + '</p></div>' +
      '<div class="field"><label for="rep-detail">' + esc(T('report.detail')) + '</label>' +
        '<textarea id="rep-detail" style="min-height:90px"></textarea></div>' +
      '<div class="callout"><b>' + esc(T('report.evidence')) + '</b>' + esc(T('report.evidenceNote')) + '</div>' +
      '<div class="callout warn" style="margin-top:10px">' + esc(T('report.identityNote')) + '</div>' +
      '<button class="btn" type="button" id="rep-send" style="margin-top:14px">' + esc(T('report.submit')) + '</button>' +
      '<p class="note" style="margin-top:10px">' + esc(target) + '</p>');
  }

  function openAppeal() {
    openSheet(T('appeal.title'),
      '<table class="kv"><tbody>' +
        '<tr><th>' + esc(T('appeal.action')) + '</th><td>' + esc(T('admin.act.hide')) + '</td></tr>' +
        '<tr><th>' + esc(T('appeal.policyReason')) + '</th><td>' + esc(T('report.dangerous')) + '</td></tr>' +
      '</tbody></table>' +
      '<div class="callout warn" style="margin:14px 0">' + esc(T('appeal.noReporter')) + '</div>' +
      '<div class="field"><label for="ap-text">' + esc(T('appeal.text')) + '</label>' +
        '<textarea id="ap-text" style="min-height:110px"></textarea></div>' +
      '<p class="note">' + esc(T('appeal.target')) + '</p>' +
      '<button class="btn" type="button" id="ap-send" style="margin-top:12px">' + esc(T('appeal.button')) + '</button>');
  }

  /* =====================================================================
     Events
     ===================================================================== */

  function renderAll() {
    renderDiscover(); renderResults(); renderProfile(); renderAccount();
    renderCondition(); renderFacility(); renderCompose(); renderMine();
    renderTray();
  }

  document.addEventListener('click', function (e) {
    var el;

    if ((el = e.target.closest('[data-q]'))) { state.query = el.getAttribute('data-q'); renderResults(); go('results'); return; }
    if ((el = e.target.closest('[data-tab]'))) { state.tab = el.getAttribute('data-tab'); renderResults(); return; }
    if ((el = e.target.closest('[data-doctor]'))) { state.doctorId = el.getAttribute('data-doctor'); state.profileCondition = null; state.profileFilter = {}; closeSheet(); go('profile/' + state.doctorId); return; }
    if ((el = e.target.closest('[data-account]'))) { state.accountId = el.getAttribute('data-account'); go('account/' + state.accountId); return; }
    if ((el = e.target.closest('[data-condition]'))) { state.conditionId = el.getAttribute('data-condition'); go('condition/' + state.conditionId); return; }
    if ((el = e.target.closest('[data-facility]'))) { state.facilityId = el.getAttribute('data-facility'); go('facility/' + state.facilityId); return; }
    if ((el = e.target.closest('[data-goto]'))) { go(el.getAttribute('data-goto')); return; }

    if ((el = e.target.closest('[data-pin]'))) {
      var pid = el.getAttribute('data-pin');
      var pi = state.compare.indexOf(pid);
      if (pi === -1) {
        if (state.compare.length >= 3) { openSheet(T('compare.title'), '<p class="note">' + esc(T('compare.max')) + '</p>'); return; }
        state.compare.push(pid);
      } else { state.compare.splice(pi, 1); }
      renderResults(); return;
    }
    if ((el = e.target.closest('[data-unpin]'))) {
      var ui = state.compare.indexOf(el.getAttribute('data-unpin'));
      if (ui !== -1) { state.compare.splice(ui, 1); }
      renderResults(); return;
    }
    if (e.target.closest('#open-compare')) { openCompare(); return; }
    if (e.target.closest('#clear-compare')) { state.compare = []; renderResults(); return; }

    if ((el = e.target.closest('[data-pcond]'))) { state.profileCondition = el.getAttribute('data-pcond') || null; renderProfile(); return; }
    if ((el = e.target.closest('[data-pfilter]'))) {
      var pf = el.getAttribute('data-pfilter').split(':');
      if (pf[0] === 'docs') { state.profileFilter.docs = !state.profileFilter.docs; }
      else { state.profileFilter[pf[0]] = state.profileFilter[pf[0]] === pf[1] ? null : pf[1]; }
      renderProfile(); return;
    }
    if (e.target.closest('#claim')) {
      openSheet(T('profile.claimThis'), '<p>' + esc(T('profile.claimNote')) + '</p>');
      return;
    }

    if ((el = e.target.closest('[data-react]'))) {
      var rk = el.getAttribute('data-react');
      state.reactions[rk] = !state.reactions[rk];
      renderAccount(); return;
    }
    if ((el = e.target.closest('[data-report]'))) { openReport(el.getAttribute('data-report')); return; }
    if (e.target.closest('#rep-send')) { openSheet(T('report.title'), '<p>' + esc(T('report.sent')) + '</p>'); return; }
    if (e.target.closest('#open-appeal')) { openAppeal(); return; }
    if (e.target.closest('#ap-send')) { openSheet(T('appeal.title'), '<p>' + esc(T('appeal.sent')) + '</p>'); return; }
    if ((el = e.target.closest('[data-reason]'))) {
      $$('[data-reason]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === el)); }); return;
    }

    if ((el = e.target.closest('[data-mine]'))) { state.mineTab = el.getAttribute('data-mine'); renderMine(); return; }


    if ((el = e.target.closest('[data-mode]'))) { state.composeMode = el.getAttribute('data-mode'); renderCompose(); return; }
    if ((el = e.target.closest('[data-sent]'))) {
      var s = el.getAttribute('data-sent');
      state.composeSentiment = state.composeSentiment === s ? null : s; renderCompose(); return;
    }
    if ((el = e.target.closest('[data-out]'))) {
      var o = el.getAttribute('data-out');
      state.composeOutcome = state.composeOutcome === o ? null : o; renderCompose(); return;
    }
    if ((el = e.target.closest('[data-ident]'))) { state.composeIdentity = el.getAttribute('data-ident'); renderCompose(); return; }
    if ((el = e.target.closest('[data-claim]'))) {
      var cm = el.getAttribute('data-claim'), ci = state.composeClaims.indexOf(cm);
      if (ci === -1) { state.composeClaims.push(cm); } else { state.composeClaims.splice(ci, 1); }
      renderCompose(); return;
    }
    if ((el = e.target.closest('[data-tag]'))) {
      var tg = el.getAttribute('data-tag'), ti = state.composeTags.indexOf(tg);
      if (ti === -1) { state.composeTags.push(tg); } else { state.composeTags.splice(ti, 1); }
      renderCompose(); return;
    }
    if ((el = e.target.closest('[data-rel]'))) {
      $$('[data-rel]').forEach(function (b) { b.setAttribute('aria-pressed', String(b === el)); }); return;
    }
    if ((el = e.target.closest('[data-ignore]'))) {
      state.ignoredChecks.push(el.getAttribute('data-ignore')); renderCompose(); return;
    }
    if (e.target.closest('#add-doctor')) {
      var pnl = $('#add-doctor-panel');
      if (pnl) { pnl.hidden = !pnl.hidden; }
      return;
    }
    if (e.target.closest('#ad-submit')) {
      openSheet(T('compose.addDoctor'), '<p>' + esc(T('compose.addPending')) + '</p>');
      return;
    }
    if (e.target.closest('#add-file')) {
      var n = state.composeFiles.length;
      var f = { id: 'nf' + (n + 1), name: ['prescription.jpg', 'lab_report.pdf', 'discharge.docx'][n % 3], state: 'quarantine' };
      /* The third demo file fails at the scan, so the fail-closed path is
         visible without having to break anything. */
      if (n === 2) { f.failAt = 'redact'; }
      state.composeFiles.push(f);
      renderCompose();
      advanceFile(f);
      return;
    }
    if ((el = e.target.closest('[data-rmfile]'))) {
      var rid = el.getAttribute('data-rmfile');
      state.composeFiles = state.composeFiles.filter(function (x) { return x.id !== rid; });
      renderCompose(); return;
    }
    if ((el = e.target.closest('[data-refile]'))) {
      var fid = el.getAttribute('data-refile');
      var target = state.composeFiles.filter(function (x) { return x.id === fid; })[0];
      if (target) { target.state = 'quarantine'; delete target.failAt; renderCompose(); advanceFile(target); }
      return;
    }
    if (e.target.closest('#publish')) { state.published = true; renderCompose(); return; }
    if (e.target.closest('#save-draft')) {
      var flag = $('#saved-flag');
      if (flag) { flag.classList.add('on'); setTimeout(function () { flag.classList.remove('on'); }, 1800); }
      return;
    }

    if (e.target.closest('#clear-filters')) { state.filters = { sort: state.filters.sort }; renderResults(); return; }
    if (e.target.closest('#keep-exact')) { renderResults(); return; }

    if (e.target.closest('#sheet-close') || e.target.id === 'overlay') { closeSheet(); return; }

    if (e.target.closest('#lang')) { setLang(state.lang === 'en' ? 'bn' : 'en'); return; }
    if (e.target.closest('#theme')) { setTheme(currentIsDark() ? 'light' : 'dark'); return; }
    if (e.target.closest('#motion')) { setMotion(state.motion !== 'on'); return; }
  });

  document.addEventListener('change', function (e) {
    var el = e.target;
    if (el.id === 'sort') { state.filters.sort = el.value; renderResults(); return; }
    if (el.hasAttribute && el.hasAttribute('data-filter')) {
      var k = el.getAttribute('data-filter');
      if (el.value) { state.filters[k] = el.value; } else { delete state.filters[k]; }
      renderResults(); return;
    }
    if (el.id === 'f-doctor') { state.doctorId = el.value; renderPreview(); }
  });

  document.addEventListener('input', function (e) {
    if (e.target.hasAttribute && e.target.hasAttribute('data-story')) {
      state.composeStory = e.target.value;
      renderPreview();
      /* Re-render only the checks so the caret is not lost while typing. */
      var host = $('.safety');
      if (host) {
        var checks = safetyChecks();
        host.innerHTML = checks.length ? checks.map(function (ch) {
          return '<div class="safety-item ' + ch.level + '"><span class="mark">⚠</span>' +
            '<span><b>' + esc(ch.title) + '</b>' + esc(ch.fix) +
            '<span class="safety-actions"><button class="link-btn" type="button" data-ignore="' + ch.id + '">' +
            esc(T('compose.ignore')) + '</button></span></span></div>';
        }).join('')
        : '<div class="safety-item ok"><span class="mark">✓</span><span><b>' + esc(T('compose.safetyPass')) + '</b>' +
          esc(T('compose.publishedNote')) + '</span></div>';
      }
    }
  });

  document.addEventListener('submit', function (e) {
    if (e.target.id === 'search-form') {
      e.preventDefault();
      state.query = $('#q').value.trim();
      renderResults(); go('results');
    }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('#overlay').hidden) { closeSheet(); }
  });

  window.addEventListener('hashchange', route);

  (function init() {
    var l, t, m;
    try {
      l = localStorage.getItem('rk02.lang');
      t = localStorage.getItem('rk02.theme');
      m = localStorage.getItem('rk02.motion');
    } catch (e) { /* blocked storage — defaults are fine */ }
    setTheme(t || null);
    setLang(l === 'bn' ? 'bn' : 'en');
    setMotion(m !== 'off' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    route();
  })();
})();
