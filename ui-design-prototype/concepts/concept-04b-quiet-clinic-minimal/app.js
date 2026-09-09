/* Concept 04 — Quiet Clinic
   The unhurried consulting room: oat and teal, soft shapes, no glass.
   Eight public screens. */
(function () {
  'use strict';

  var state = {
    lang: 'en', theme: null, motion: 'on',
    role: 'reader',
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
    reactions: {},
    /* Demo-local simulation state. Nothing leaves the page. */
    bookmarks: null,        /* seeded from the fixture on first use */
    comments: {},           /* reviewId -> comments added in this session */
    commentLikes: {},       /* commentId -> boolean */
    removedPublished: [],   /* STORY-REV-003 tombstones */
    removedDrafts: [],
    replyTo: null,          /* STORY-COM-001: open reply composer */
    editingComment: null,   /* FR-COM-003: open comment editor */
    commentEdits: {},       /* commentId -> edited text */
    commentDeleted: [],     /* commentId -> deleted by its author */
    personId: null          /* STORY-USER-001: public profile handle */
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var T = function (k) { return RK.t(k, state.lang); };
  var P = function (f) { return RK.pick(f, state.lang); };
  var L = function (o) { return o ? (state.lang === 'bn' ? o.bn : o.en) : ''; };

  // STORY-PLAT-001: HTML escaping helper for safe bilingual markup
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
     Shell
     ===================================================================== */

  function setLang(lang) {
    state.lang = lang;
    RK.applyLang(document, lang);
    $('#lang').setAttribute('aria-pressed', String(lang === 'bn'));
    $('#lang').querySelector('span').textContent = lang === 'bn' ? 'A' : 'অ';
    try { localStorage.setItem('rk04.lang', lang); } catch (e) {}
    renderAll();
    announce('Language: ' + (lang === 'bn' ? 'Bengali' : 'English'));
  }
  /* Light-mode colour SCHEME, orthogonal to light/dark. A scheme only
     recolours light mode: its CSS block sits after the light base and
     before the dark blocks, so dark still wins. Persisted like the theme,
     restored before first paint by the head script in index.html. */
  function setScheme(s) {
    s = s || '';
    if (s) { document.documentElement.setAttribute('data-scheme', s); }
    else { document.documentElement.removeAttribute('data-scheme'); }
    try { localStorage.setItem('rk04.scheme', s); } catch (e) {}
    $$('[data-scheme-pick]').forEach(function (b) {
      b.setAttribute('aria-pressed', String(b.getAttribute('data-scheme-pick') === s));
    });
  }
  try { setScheme(localStorage.getItem('rk04.scheme') || ''); } catch (e) {}

  function setTheme(theme) {
    state.theme = theme;
    if (theme) { document.documentElement.setAttribute('data-theme', theme); }
    else { document.documentElement.removeAttribute('data-theme'); }
    try { localStorage.setItem('rk04.theme', theme || ''); } catch (e) {}
    announce('Theme: ' + (currentIsDark() ? 'dark' : 'light'));
  }
  function currentIsDark() {
    if (state.theme) { return state.theme === 'dark'; }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  function setMotion(on) {
    state.motion = on ? 'on' : 'off';
    document.body.setAttribute('data-motion', state.motion);
    $('#motion').setAttribute('aria-pressed', String(!on));
    /* Concept 04b has no atmospheric field; the toggle only affects CSS
       transitions/animations, not a canvas paint loop. Concept 04 keeps
       its own Field module in its own app.js. */
    try { localStorage.setItem('rk04.motion', state.motion); } catch (e) {}
  }
  function motionAllowed() {
    return state.motion === 'on' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }

  var VIEWS = ['discover', 'results', 'doctors', 'profile', 'experiences', 'account',
               'topics', 'condition', 'facilities', 'facility', 'compose',
               'mine', 'saved', 'notifications', 'person', 'emergency', 'about'];

  /* ---------------------------------------------------------------------
     Routing: URL slug <-> internal view name.

     The slug is what the reader sees and types; the view name is what the
     render functions are called. Keeping them separate means the URLs can
     read correctly ("#doctors/d1") without renaming every internal
     identifier, and one table stays the single source of truth.

     Slugs are plural so they are hackable: trimming "#doctors/d1" gives
     "#doctors", which is a real index page (NN/g, "URL as UI").
     Slugs stay in Latin script in both languages - a percent-encoded
     Bengali slug is unusable once pasted into WhatsApp or Messenger.
     --------------------------------------------------------------------- */
  var ROUTES = {
    discover:      { view: 'discover' },
    search:        { view: 'results' },
    doctors:       { view: 'doctors',      detail: 'profile',   id: 'doctorId' },
    facilities:    { view: 'facilities',   detail: 'facility',  id: 'facilityId' },
    topics:        { view: 'topics',       detail: 'condition', id: 'conditionId' },
    experiences:   { view: 'experiences',  detail: 'account',   id: 'accountId' },
    write:         { view: 'compose' },
    me:            { view: 'mine' },
    saved:         { view: 'saved' },
    notifications: { view: 'notifications' },
    authors:       { view: 'person',       detail: 'person',    id: 'personId' },
    emergency:     { view: 'emergency' },
    about:         { view: 'about' }
  };

  /* view name -> the slug that addresses it, so go('profile/d1') still works
     from every existing call site and lands on "#doctors/d1". */
  var VIEW_SLUG = {};
  Object.keys(ROUTES).forEach(function (slug) {
    var r = ROUTES[slug];
    VIEW_SLUG[r.view] = slug;
    if (r.detail) { VIEW_SLUG[r.detail] = slug; }
  });

  /* Hashes that shipped before the rename. Kept so existing links, open tabs
     and the gallery route index do not break. */
  var LEGACY_SLUG = {
    results: 'search', profile: 'doctors', account: 'experiences',
    condition: 'topics', facility: 'facilities', compose: 'write',
    mine: 'me', person: 'authors'
  };

  /* Browser tab / history / bookmark title. WCAG 2.4.2 asks for a
     descriptive title; the unique part leads because tabs, bookmark lists
     and alt-tab all truncate from the right. */
  function setTitle(text) {
    document.title = text ? text + ' — RogiKotha' : T('brand.name') + ' — ' + T('brand.tagline');
  }

  // STORY-NFR-006: announce view/lang/theme changes to screen readers
  function announce(msg) {
    var node = document.getElementById('sr-live');
    if (node) { node.textContent = msg; }
  }

  // STORY-USER-001: noindex on profile + mine
  function setNoindex(on) {
    var m = document.querySelector('meta[name="robots"]');
    if (on && !m) { m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex'; document.head.appendChild(m); }
    else if (!on && m) { m.remove(); }
  }

  function route() {
    var raw = (location.hash || '#discover').replace('#', '').replace(/^\//, '');
    var parts = raw.split('/');
    var slug = parts[0];

    /* Redirect a pre-rename hash to its new home so old links keep working. */
    if (LEGACY_SLUG[slug]) {
      location.replace('#' + LEGACY_SLUG[slug] + (parts[1] ? '/' + parts[1] : ''));
      return;
    }

    var def = ROUTES[slug];
    if (!def) { def = ROUTES.discover; slug = 'discover'; }

    /* An id segment selects the detail view; without one we show the index. */
    var v = (parts[1] && def.detail) ? def.detail : def.view;
    if (parts[1] && def.id) {
      state[def.id] = def.id === 'personId' ? decodeURIComponent(parts[1]) : parts[1];
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
    if (v === 'person') { renderPerson(); }
    if (v === 'doctors') { renderDoctorIndex(); }
    if (v === 'facilities') { renderFacilityIndex(); }
    if (v === 'topics') { renderTopicIndex(); }
    if (v === 'experiences') { renderExperienceIndex(); }
    if (v === 'saved') { renderSaved(); }
    if (v === 'notifications') { renderNotifications(); }
    $('#tray').hidden = !(v === 'results' && state.compare.length);
    setTitle(titleForView(v));
    window.scrollTo({ top: 0, behavior: motionAllowed() ? 'smooth' : 'auto' });
    announce('View: ' + v);
  }

  /* The title's first segment is the page's own H1, so the tab, the history
     entry and the heading all say the same thing. */
  function titleForView(v) {
    switch (v) {
      case 'discover':      return '';
      case 'results':       return (state.query ? state.query + ' — ' : '') + T('nav.results');
      case 'doctors':       return T('nav.profile');
      case 'profile':       return (RK.doctorById(state.doctorId) || {}).name ? P(RK.doctorById(state.doctorId).name) : T('nav.profile');
      case 'facilities':    return T('nav.facilities');
      case 'facility':      return (RK.facilityById(state.facilityId) || {}).name ? P(RK.facilityById(state.facilityId).name) : T('nav.facilities');
      case 'topics':        return T('nav.condition');
      case 'condition':     return conditionName(state.conditionId) || T('nav.condition');
      case 'experiences':   return T('nav.account');
      case 'account': {
        var rv = RK.reviewById(state.accountId);
        if (!rv || !rv.title) { return T('nav.account'); }
        /* Medium/Substack put the author in the tab title too. */
        return P(rv.title) + (rv.author && rv.identity !== 'anon' ? ' \u2014 ' + T('experience.writtenBy') + ' ' + P(rv.author) : '');
      }
      case 'compose':       return T('nav.compose');
      case 'mine':          return T('nav.mine');
      case 'saved':         return T('mine.bookmarks');
      case 'notifications': return T('mine.notifications');
      case 'person':        return state.personId || T('person.kicker');
      case 'emergency':     return T('nav.emergency');
      case 'about':         return T('nav.about');
      default:              return '';
    }
  }
  function conditionName(id) {
    var c = RK.conditions.filter(function (x) { return x.id === id; })[0];
    return c ? P(c.name) : '';
  }

  /* Call sites pass an internal view name ("profile/d1"); this maps it to the
     public slug so links and the address bar stay in one vocabulary. */
  function go(path) {
    var parts = String(path).split('/');
    var slug = VIEW_SLUG[parts[0]] || parts[0];
    path = slug + (parts[1] ? '/' + parts.slice(1).join('/') : '');
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
  // STORY-REV-004: narrative sentiment distribution block (no combined score)
  function distBlock(dist, keys, prefix, title, compact) {
    if (dist.empty) { return '<p class="denominator">' + esc(T('label.notProvided')) + '</p>'; }

    var plain = keys.map(function (k) { return dist.counts[k] + ' ' + T(prefix + k).toLowerCase(); }).join(', ') +
      ' \u2014 ' + T('sentiment.of') + ' ' + dist.total + ' ' + T('sentiment.accounts');

    /* Separate capsules rather than one stacked bar. They are proportional to
       each other, not slices of a whole, and every one states its own count —
       so nothing here can be misread as a single score. */
    var caps = keys.map(function (k) {
      return '<span class="cap c-' + k + '" style="--g:' + (dist.counts[k] || 0.4) + '">' +
        '<b>' + bn(dist.counts[k]) + '</b>' +
        '<em>' + esc(T(prefix + k)) + '</em></span>';
    }).join('');

    if (compact) {
      /* List cards: denominator first, capsules inline. Every capsule still
         states its own count, so the row cannot be read as a single score. */
      return '<div class="dist compact">' +
        '<span class="denominator">' + bn(dist.total) + ' ' + esc(T('sentiment.accounts')) + '</span>' +
        '<div class="capsules compact" role="img" aria-label="' + esc(plain) + '">' + caps + '</div>' +
      '</div>';
    }
    return '<div class="dist">' +
      '<div class="capsules" role="img" aria-label="' + esc(plain) + '">' + caps + '</div>' +
      '<p class="denominator">' + esc(T('sentiment.of')) + ' ' + bn(dist.total) + ' ' +
        esc(T('sentiment.accounts')) + (title ? ' \u00b7 ' + esc(title) : '') + '</p>' +
      (dist.limited ? '<p class="limited">' + esc(T('label.limitedData')) + ' \u2014 ' + esc(T('label.limitedDataWhy')) + '</p>' : '') +
    '</div>';
  }

  function sentimentBlock(list, compact) {
    return distBlock(RK.sentimentOf(list), RK.SENTIMENTS, 'sentiment.', T('sentiment.title'), compact);
  }

  function outcomeBlock(list) {
    var dist = RK.outcomeOf(list);
    if (dist.empty) {
      return '<h3 style="font-size:15px">' + esc(T('outcome.title')) + '</h3>' +
             '<p class="denominator">' + esc(T('label.notProvided')) + '</p>';
    }
    var rows = RK.OUTCOMES.map(function (k) {
      return '<div class="outcome-row"><span>' + esc(T('outcome.' + k)) + '</span>' +
        '<span class="track"><i style="--w:' + (dist.pct(k) / 100) + '"></i></span>' +
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
    setNoindex(false);
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

  /* ---------------------------------------------------------------------
     Name rendering.

     Two rules, enforced here so no call site can forget them:

     1. A name is a link only when it resolves to a page that exists.
        EXPERIENCE.md:57 - "the title is the primary link".
     2. An anonymous author is NEVER a link and never carries the accent
        colour. WCAG 1.4.1: colour must not be the only signal, and link
        colour is reserved for links, so an accent-tinted name that does
        nothing is a false affordance. ADR-0008 forbids the linkage itself.

     Before this helper existed the anon guard lived in accountRow() only,
     and the facility-review row simply printed every author unlinked -
     safe by omission, not by rule.
     --------------------------------------------------------------------- */
  /* ---------------------------------------------------------------------
     byline(subject, variant, opts) - THE ONLY place an author is rendered.

     Before this there were two divergent paths (a helper and an inline copy
     in accountRow), the name sat at 12.5px in the same accent as the doctor
     link, real-name and pseudonym produced identical markup, and on phones
     the author appeared after the story, the comments and the disclaimer.

     Every reference product (Care Opinion, Medium, Substack, Trustpilot,
     Airbnb) renders the author at or near body size in FULL ink while the
     rest of the byline is gray, and puts it BEFORE the content. Identity
     mode is carried by avatar glyph + chip border style + chip TEXT, so it
     survives greyscale and WCAG 1.4.1. Anonymous is never a control and
     never accent-coloured (ADR-0008).

     variant: 'row' (list), 'lead' (detail head), 'comment', 'mine'
     opts.when   - a date string to append
     opts.static - emit no control (inside a <button>, or a preview)
     --------------------------------------------------------------------- */
  function initials(r) {
    var n = (P(r.author) || '').replace(/^(Dr\.?|\u09a1\u09be\.?)\s+/, '');
    if (r.identity === 'pseudo') { return '@' + n.charAt(0); }
    var parts = n.split(/\s+/).filter(Boolean);
    return (parts[0] || '').charAt(0) + (parts.length > 1 ? parts[parts.length - 1].charAt(0) : '');
  }
  function byline(r, variant, opts) {
    opts = opts || {};
    if (!r || !r.author) { return ''; }
    var id = r.identity || 'pseudo';
    var anon = id === 'anon';
    var tag = opts.static ? 'span' : 'p';
    var av = '<span class="byline-av" data-identity="' + id + '" aria-hidden="true">' +
      (anon ? '\u2014' : esc(initials(r))) + '</span>';
    var lede = '', name;
    if (anon) {
      name = '<span class="byline-name">' + esc(T('byline.anonSentence')) + '</span>';
    } else {
      var ledeKey = variant === 'comment' ? 'byline.commentBy'
                  : variant === 'mine'    ? 'byline.yourIdentity'
                  : 'experience.writtenBy';
      lede = '<span class="byline-lede">' + esc(T(ledeKey)) + '</span>';
      name = opts.static
        ? '<span class="byline-name">' + esc(P(r.author)) + '</span>'
        : '<button class="byline-name" type="button" data-person="' + esc(r.author.en) +
          '" aria-label="' + esc(T('byline.otherBy').replace('{name}', P(r.author))) + '">' + esc(P(r.author)) + '</button>';
    }
    var chip = '<span class="byline-id" data-identity="' + id + '">' +
      esc(anon ? T('compose.identity.anon') : T('byline.identity.' + id)) + '</span>';
    var rel = (r.relationship && variant !== 'comment')
      ? '<span class="byline-rel">' + esc(T('rel.' + r.relationship)) + '</span>' : '';
    var when = '';
    if (variant === 'comment' && r.when) { when = '<span class="byline-when">' + esc(P(r.when)) + '</span>'; }
    else if (opts.when) { when = '<time class="byline-when">' + esc(opts.when) + '</time>'; }
    return '<' + tag + ' class="byline' + (variant ? ' byline--' + variant : '') + '">' +
      av + lede + name + chip + rel + when + '</' + tag + '>';
  }
  function doctorLink(d) {
    if (!d) { return ''; }
    return '<button class="link-btn name-link" type="button" data-doctor="' + d.id +
      '" title="' + esc(T('nav.viewDoctor')) + '">' + esc(P(d.name)) + '</button>';
  }
  function facilityLink(f, label) {
    if (!f) { return ''; }
    return '<button class="link-btn name-link" type="button" data-facility="' + f.id +
      '" title="' + esc(T('nav.viewFacility')) + '">' + esc(label || P(f.name)) + '</button>';
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
      /* The byline is the row's second line, under the title (M3 leading-
         avatar list item). The doctor moves to its own meta line below in
         accent, which is what removes the author/doctor ambiguity. */
      byline(r, 'row') +
      '<p class="who"><span>' + esc(T('review.episodeDate')) + ': ' + esc(P(r.period)) + '</span>' +
        '<span>' + doctorLink(d) + '</span></p>' +
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
    setNoindex(false);
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
        // STORY-SRCH-002: neutral filter panel (no engagement-based ranking)
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
      '<span class="doc-av">' + RK.avatar(d.name.en, d.accent, 48) + '</span>' +
      '<span>' +
        '<h3>' + doctorLink(d) + '</h3>' +
        '<p class="doc-sub">' + esc(P(d.specialty)) + ' · ' + esc(P(d.area)) + ', ' + esc(P(d.city)) + '</p>' +
        (conds.length ? '<p class="doc-treats">' + conds.map(function (c) { return esc(P(c.condition.name)) + ' (' + bn(c.count) + ')'; }).join(' · ') + '</p>' : '') +
        '<span class="doc-flags">' + notVerified() +
          (docCount(d.id) ? badge('plain', bn(docCount(d.id)) + ' ' + (state.lang === 'bn' ? 'কাগজপত্র' : 'documents')) : badge('plain', T('label.noDocuments'))) +
        '</span>' +
      '</span>' +
      '<span class="doc-side">' +
        sentimentBlock(RK.reviewsFor(d.id), true) +
        '<button class="btn small ghost" type="button" data-pin="' + d.id + '">' +
          esc(pinned ? T('compare.remove') : T('compare.add')) + '</button>' +
      '</span>' +
    '</div>';
  }

  function facilityEntry(f) {
    var list = RK.facilityReviewsFor(f.id);
    var dist = RK.criteriaDist(list, 'overall');
    return '<div class="doc-entry" role="group">' +
      '<span class="doc-av">' + RK.avatar(f.name.en + f.id, f.accent, 48) + '</span>' +
      '<span>' +
        '<h3>' + facilityLink(f, P(f.name) + (f.branch ? ' — ' + P(f.branch) : '')) + '</h3>' +
        '<p class="doc-sub">' + esc(T('facility.type.' + f.type)) + ' · ' + esc(P(f.area)) + ', ' + esc(P(f.city)) + '</p>' +
        '<span class="doc-flags">' +
          badge('plain', bn(list.length) + ' ' + T('sentiment.accounts')) +
          (f.parent ? badge('plain', T('facility.parent') + ' ' + P(f.parent)) : '') +
        '</span>' +
      '</span>' +
      '<span class="doc-side">' + distBlock(dist, RK.CRIT_VALUES, 'crit.', T('crit.overall'), true) + '</span>' +
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

  // STORY-DIR-001: transparent doctor profile renderer
  function renderProfile() {
    var host = $('#view-profile');
    if (!host) { return; }
    var d = RK.doctorById(state.doctorId);
    if (!d) { return; }
    setNoindex(true);
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
            '<span class="kicker">' + esc(T('profile.kicker')) + '</span>' +
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
    setNoindex(false);
    var r = RK.reviewById(state.accountId);
    if (!r) { return; }
    var d = RK.doctorById(r.doctorId);
    var c = RK.conditionById(r.conditionId);
    var chain = RK.followUpsFor(r.id);
    var later = RK.laterCareFor(r.id);
    var thread = RK.commentsFor(r.id).concat(state.comments[r.id] || []);
    /* STORY-COM-001: exactly one reply level. Top-level comments carry
       their replies; a reply never carries children of its own. */
    var topLevel = thread.filter(function (c) { return !c.parentId; });
    var repliesOf = function (id) {
      return thread.filter(function (c) { return c.parentId === id; });
    };
    var others = RK.accountsByAuthor(r);
    var related = RK.relatedByCondition(r.conditionId, r.id);
    var sameDoctor = RK.reviewsFor(r.doctorId).filter(function (x) { return x.id !== r.id; });

    /* Sections 1–13, in the order a reader needs them. */
    host.innerHTML =
      '<section class="a-head">' +
        '<span class="kicker">' + esc(T('experience.episode')) + ' · ' + esc(P(c.name)) + '</span>' +
        '<h1 class="a-title display">' + esc(P(r.title)) + '</h1>' +
        /* Directly under the title, above the story - on every viewport.
           Previously the only attribution lived in the aside, which is
           second in DOM order, so on phones it came after the comments. */
        byline(r, 'lead', { when: P(r.posted) }) +
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

          // STORY-REV-002: detailed treatment timeline chapters
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
          '<div>' + (topLevel.length
            ? topLevel.map(function (c) { return commentHtml(c, repliesOf(c.id)); }).join('')
            : '<p class="note">' + esc(T('mine.empty')) + '</p>') + '</div>' +
          '<p class="note">' + esc(T('experience.replyLevel')) + '</p>' +

          '<div class="composer-box">' +
            '<label class="sr-only" for="new-comment">' + esc(T('experience.commentBox')) + '</label>' +
            '<textarea id="new-comment" placeholder="' + esc(T('experience.commentBox')) + '"></textarea>' +
            '<p class="note" style="margin:8px 0">' + esc(T('experience.commentHint')) + '</p>' +
            '<button class="btn small" type="button" data-post-comment="' + r.id + '">' + esc(T('experience.commentPost')) + '</button>' +
          '</div>' +

          '<div class="reactions">' +
            reactBtn(r.id + ':up', T('review.helpful'), r.likes) +
            reactBtn(r.id + ':down', T('review.notHelpful'), r.dislikes) +
            '<button class="react" type="button" data-report="account:' + r.id + '">' + esc(T('review.report')) + '</button>' +
            '<button class="react" type="button" data-bookmark="' + r.id + '" aria-pressed="' + isBookmarked(r.id) + '">' +
              esc(T(isBookmarked(r.id) ? 'experience.bookmarked' : 'experience.bookmark')) + '</button>' +
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
          /* "Written by" used to label the RELATIONSHIP and "Shown as" the
             name. The lead byline now carries both; only the anonymity
             caveat stays here. */
          (r.identity === 'anon'
            ? '<div><span class="k">' + esc(T('compose.identity.anon')) + '</span><span class="v">' + esc(T('compose.identity.anonNote')) + '</span></div>'
            : '') +
          '<div><span class="k">' + esc(T('review.episodeDate')) + '</span><span class="v">' + esc(P(r.period)) + '</span></div>' +
          '<div><span class="k">' + esc(state.lang === 'bn' ? 'প্রকাশ' : 'Published') + '</span><span class="v">' + esc(P(r.posted)) + '</span></div>' +
          '<div><span class="k">' + esc(T('profile.kicker')) + '</span>' +
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

  // STORY-COM-002: like/dislike button, idempotent and anonymous-safe
  /* Bookmarks are seeded once from the fixture so the button and the
     Saved tab always agree. STORY-USER-002. */
  function bookmarks() {
    if (!state.bookmarks) { state.bookmarks = RK.user.bookmarks.slice(); }
    return state.bookmarks;
  }
  function isBookmarked(id) { return bookmarks().indexOf(id) !== -1; }

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
            (e.state === 'failed' ? '' : '<button class="btn small ghost" type="button" data-view-evidence="' + esc(e.id) + '">' + esc(T('experience.openEvidence')) + '</button>') +
          '</div>';
        }).join('') + '</div>';
    }).join('');

    return '<h2 class="section-head">' + esc(T('filter.evidence')) + '</h2>' +
      '<div class="callout warn"><b>' + esc(T('evidence.status')) + '</b>' + esc(T('evidence.notice')) + '</div>' +
      '<div class="ev-groups" style="margin-top:12px">' + groups + '</div>' +
      '<p class="note" style="margin-top:10px">' + esc(T('experience.evidenceOnly')) + '</p>';
  }

  // STORY-COM-001: flat comment thread with mentions + advice warning
  /* FR-COM-003: a user may edit or delete only their own comments.
     Locally posted comments are authored 'You'; the demo user is
     RK.user.username in the fixtures. */
  function ownComment(k) {
    return k.author && (k.author.en === 'You' || k.author.en === RK.user.username);
  }
  function commentBody(k) {
    return Object.prototype.hasOwnProperty.call(state.commentEdits, k.id)
      ? state.commentEdits[k.id] : P(k.body);
  }

  function commentHtml(k, replies, isReply) {
    /* Comment text lives in k.body ({en,bn}); L(k) read k.en/k.bn and
       rendered the literal string "undefined". */
    var body = esc(commentBody(k));
    if (k.mentions) {
      k.mentions.forEach(function (m) {
        body = body.replace('@' + m, '<span class="mention">@' + esc(m) + '</span>');
      });
    }
    /* Deleted: if replies hang off this comment we must leave a tombstone so
       the thread still reads; with no replies the comment simply goes.
       STORY-COM-001: "deleted context tombstones only when needed". */
    if (state.commentDeleted.indexOf(k.id) !== -1) {
      if (!(replies && replies.length)) { return ''; }
      return '<article class="comment tombstone">' +
        '<p class="note"><b>' + esc(T('experience.commentGone')) + '</b> ' + esc(T('experience.commentGoneWhy')) + '</p>' +
        '<div class="comment-replies">' + replies.map(function (rp) { return commentHtml(rp, null, true); }).join('') + '</div>' +
      '</article>';
    }
    if (state.editingComment === k.id) {
      return '<article class="comment">' +
        '<div class="comment-head">' + byline(k, 'comment') + '</div>' +
        '<div class="composer-box">' +
          '<label class="sr-only" for="edit-text">' + esc(T('experience.editComment')) + '</label>' +
          '<textarea id="edit-text">' + esc(commentBody(k)) + '</textarea>' +
          '<button class="btn small" type="button" data-save-comment="' + k.id + '">' + esc(T('experience.saveComment')) + '</button> ' +
          '<button class="btn small ghost" type="button" data-cancel-edit="1">' + esc(T('experience.cancelEdit')) + '</button>' +
        '</div>' +
      '</article>';
    }
    return '<article class="comment ' + (k.dangerous ? 'flagged' : '') + '">' +
      '<div class="comment-head">' +
        byline(k, 'comment') +
        (k.providerFor ? badge('plain', T('experience.providerHere')) : '') +
        (ownComment(k) ? badge('plain', T('experience.ownComment')) : '') +
        (state.commentEdits[k.id] !== undefined ? '<span>(' + esc(T('experience.edited')) + ')</span>' : '') +
        '<span>' + esc(P(k.when)) + '</span>' +
      '</div>' +
      (k.dangerous ? '<div class="callout danger" style="margin-bottom:10px"><b>⚠ ' + esc(T('report.dangerous')) + '</b>' + esc(T('experience.dangerWarning')) + '</div>' : '') +
      '<p>' + body + '</p>' +
      (k.link ? '<p class="note" style="margin-top:8px">⚠ ' + esc(T('experience.linkWarning')) + ' <code>' + esc(k.link) + '</code></p>' : '') +
      '<div class="comment-actions">' +
        '<button class="link-btn" type="button" data-clike="' + k.id + '" aria-pressed="' + !!state.commentLikes[k.id] + '">' +
          esc(T('review.helpful')) + ' ' + bn((k.likes || 0) + (state.commentLikes[k.id] ? 1 : 0)) + '</button>' +
        (isReply ? '' : '<button class="link-btn" type="button" data-reply="' + k.id + '">' + esc(T('experience.reply')) + '</button>') +
        (ownComment(k)
          ? '<button class="link-btn" type="button" data-edit-comment="' + k.id + '">' + esc(T('experience.editComment')) + '</button>' +
            '<button class="link-btn" type="button" data-del-comment="' + k.id + '">' + esc(T('experience.deleteComment')) + '</button>'
          : '') +
        '<button class="link-btn" type="button" data-report="comment:' + k.id + '">' + esc(T('review.report')) + '</button>' +
      '</div>' +
      (state.replyTo === k.id ? replyBox(k) : '') +
      ((replies && replies.length)
        ? '<div class="comment-replies">' + replies.map(function (rp) { return commentHtml(rp, null, true); }).join('') + '</div>'
        : '') +
    '</article>';
  }

  /* Inline reply composer, prefilled with the mention so the mention path
     is exercised. Non-modal, per the story's accessibility note. */
  function replyBox(k) {
    return '<div class="composer-box reply-box">' +
      '<p class="note">' + esc(T('experience.replyingTo')) + ' <b>' + esc(P(k.author)) + '</b></p>' +
      '<label class="sr-only" for="reply-text">' + esc(T('experience.commentBox')) + '</label>' +
      '<textarea id="reply-text">@' + esc(P(k.author)) + ' </textarea>' +
      '<p class="note" style="margin:8px 0">' + esc(T('experience.commentHint')) + '</p>' +
      '<button class="btn small" type="button" data-post-reply="' + k.id + '">' + esc(T('experience.commentPost')) + '</button> ' +
      '<button class="btn small ghost" type="button" data-reply-cancel="1">' + esc(T('experience.replyCancel')) + '</button>' +
    '</div>';
  }

  function relatedCard(r) {
    var d = RK.doctorById(r.doctorId);
    return '<button class="related-card" type="button" data-account="' + r.id + '">' +
      badge(r.sentiment, T('sentiment.' + r.sentiment)) +
      '<h4>' + esc(P(r.title)) + '</h4>' +
      /* Rendered no author at all; the only person named was the doctor.
         Static: this card is itself a <button>. */
      byline(r, 'row', { static: true }) +
      '<p>' + esc(P(d.name)) + ' · ' + esc(P(r.period)) + ' · ' + esc(T('outcome.' + r.outcome)) + '</p>' +
    '</button>';
  }

  /* =====================================================================
     5 · Condition page
     ===================================================================== */

  function renderCondition() {
    var host = $('#view-condition');
    if (!host) { return; }
    setNoindex(false);
    var c = RK.conditionById(state.conditionId);
    if (!c) { return; }
    var list = RK.conditionAccounts(c.id);
    var docs = RK.doctorsForCondition(c.id);
    var facIds = {};
    docs.forEach(function (x) { RK.facilitiesForDoctor(x.doctor.id).forEach(function (f) { facIds[f.id] = true; }); });
    var facs = Object.keys(facIds).map(RK.facilityById);

    /* Where patients in Bangladesh went for this condition.
       Aggregated from the doctors who treated it: each unique (hospital,
       area, city) tuple gets a count. Hospital name and area matter most
       in Bangladesh; district is the third level. Sorted by count desc so
       the most-mentioned places surface first. */
    var placeMap = {};
    docs.forEach(function (x) {
      var d = x.doctor;
      var cityKey = P(d.city);
      var areaKey = P(d.area);
      var primary = (d.chambers && d.chambers[0]) ? P(d.chambers[0].name) : '';
      var key = primary + '|' + areaKey + '|' + cityKey;
      if (!placeMap[key]) {
        placeMap[key] = { hospital: primary, area: areaKey, city: cityKey, count: 0 };
      }
      placeMap[key].count += x.count;
    });
    var places = Object.keys(placeMap).map(function (k) { return placeMap[k]; })
      .sort(function (a, b) { return b.count - a.count; });

    /* Top specialties (the "usually treated by" tag). Counts how many
       accounts per specialty across doctors. */
    var specMap = {};
    docs.forEach(function (x) {
      var s = P(x.doctor.specialty);
      if (!specMap[s]) { specMap[s] = { name: s, count: 0 }; }
      specMap[s].count += x.count;
    });
    var specs = Object.keys(specMap).map(function (k) { return specMap[k]; })
      .sort(function (a, b) { return b.count - a.count; })
      .slice(0, 3);

    function freq(group, title) {
      var rows = RK.tagFrequency(c.id, group);
      if (!rows.length) { return ''; }
      var max = rows[0].count;
      return '<section class="panel">' +
        '<h2 style="font-size:15px">' + esc(title) + '</h2>' +
        '<ul class="freq-list">' + rows.map(function (x) {
          return '<li><span>' + esc(L(x.tag)) + '</span>' +
            '<span class="track"><i style="--w:' + (x.count / max) + '"></i></span>' +
            '<span class="n">' + bn(x.count) + '</span></li>';
        }).join('') + '</ul>' +
        '<p class="denominator">' + esc(T('condition.mentionNote')) + '</p>' +
      '</section>';
    }

    var placesPanel = places.length ? '<section class="panel places-panel">' +
      '<h2 style="font-size:15px">' + esc(T('condition.treatedAt')) + '</h2>' +
      '<p class="note" style="margin:-4px 0 14px">' + esc(T('condition.treatedAtNote')) + '</p>' +
      '<ul class="places">' + places.map(function (p) {
        return '<li>' +
          (p.hospital ? '<span class="pl-name">' + esc(p.hospital) + '</span>' : '<span class="pl-name pl-unk">' + esc(T('label.notProvided')) + '</span>') +
          '<span class="pl-loc">' +
            '<span>' + esc(p.area) + '</span>' +
            '<span class="pl-sep">·</span>' +
            '<span>' + esc(p.city) + '</span>' +
          '</span>' +
          '<span class="pl-n">' + bn(p.count) + '</span>' +
        '</li>';
      }).join('') + '</ul>' +
    '</section>' : '';

    var specsRow = specs.length ? '<p class="specs-tag">' +
      '<span class="kicker" style="margin:0">' + esc(T('condition.specialtyTag')) + '</span>' +
      specs.map(function (s) {
        return '<span class="spec-pill">' + esc(s.name) + ' · ' + bn(s.count) + '</span>';
      }).join(' ') +
    '</p>' : '';

    host.innerHTML =
      '<section class="a-head">' +
        '<span class="kicker">' + esc(T('nav.condition')) + '</span>' +
        '<h1 class="display">' + esc(P(c.name)) + '</h1>' +
        '<p class="note">' + esc(T('condition.alsoCalled')) + ': ' + c.aliases.map(esc).join(' · ') + '</p>' +
        '<p class="lede" style="margin-top:12px">' + bn(list.length) + ' ' + esc(T('sentiment.accounts')) + ' · ' +
          bn(docs.length) + ' ' + esc(T('condition.doctors').toLowerCase()) + '</p>' +
        specsRow +
      '</section>' +

      placesPanel +

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
              var d = x.doctor;
              var primary = (d.chambers && d.chambers[0]) ? P(d.chambers[0].name) : '';
              return '<button class="mini-row" type="button" data-doctor="' + d.id + '">' +
                '<span class="mini-av">' + RK.avatar(d.name.en, d.accent, 38) + '</span>' +
                '<span><b>' + esc(P(d.name)) + '</b>' +
                '<span>' + esc(P(d.specialty)) + ' · ' + bn(x.count) + ' ' + esc(T('sentiment.accounts')) + '</span>' +
                '<span class="mini-loc">' +
                  (primary ? esc(primary) + ' · ' : '') +
                  esc(P(d.area)) + ' · ' + esc(P(d.city)) +
                '</span>' +
              '</span></button>';
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

  // STORY-DIR-003: facility parent/branch renderer with non-scored criteria
  function renderFacility() {
    var host = $('#view-facility');
    if (!host) { return; }
    setNoindex(false);
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
              byline(r, 'row', { when: P(r.posted) }) +
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

  // STORY-REV-001: quick review composer with autosave + preview
  function renderCompose() {
    var host = $('#view-compose');
    if (!host) { return; }
    setNoindex(false);
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

      /* EXPERIENCE.md:115 - the demo must explain simulated sign-in at the
         point of contributing. This is also the only thing state.role gates,
         which is what makes the demo panel's claim true rather than
         decorative. */
      (state.role === 'reader'
        ? '<div class="callout warn signin-note"><b>' + esc(T('write.signinTitle')) + '</b>' +
          esc(T('write.signinBody')) + '</div>'
        : '') +

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

          // STORY-IDENT-001: per-review identity-mode radios (named / pseudonymous / anonymous)
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

  // STORY-EVID-001: quarantine-first evidence file pipeline rendering
  function evFileHtml(f) {
    var cls = f.state === 'ready' ? 'done' : (f.state === 'failed' ? 'bad' : '');
    var order = ['quarantine', 'checking', 'scanning', 'redact', 'processing', 'ready'];
    var pct = f.state === 'failed' ? 100 : Math.round((order.indexOf(f.state) + 1) / order.length * 100);
    return '<div class="ev-file ' + cls + '" data-file="' + f.id + '">' +
      '<span><b>' + esc(f.name) + '</b>' +
        '<span class="state">' + esc(T('ev.state.' + (f.state === 'failed' ? 'failed' : f.state))) + '</span>' +
        (f.state === 'failed' ? '<span class="state">' + esc(T('ev.failNote')) + '</span>' : '') +
        '<span class="ev-bar"><i style="--w:' + (pct / 100) + '"></i></span>' +
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
    /* The one screen where the writer chooses identity mode: show the real
       byline at real size, not a 12px gray line. */
    var previewAuthor = {
      identity: state.composeIdentity, relationship: 'self',
      author: state.composeIdentity === 'real'
        ? { en: 'Your name', bn: 'আপনার নাম' }
        : (state.composeIdentity === 'anon' ? { en: 'Anonymous', bn: 'নাম প্রকাশ না করে' } : { en: 'shirin_88', bn: 'shirin_88' })
    };
    host.innerHTML =
      byline(previewAuthor, 'row', { static: true }) +
      '<p class="denominator" style="margin:0 0 9px">' + esc(P(d.name)) + '</p>' +
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

  // STORY-EVID-002: redaction canvas for processed evidence preview
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

  // STORY-USER-001: public profile + activity privacy dashboard
  function renderMine() {
    var host = $('#view-mine');
    if (!host) { return; }
    setNoindex(true);
    var u = RK.user;
    /* STORY-USER-002. Saved and Notifications moved to their own routes:
       "My writing" cannot head a list of other people's writing, and Saved
       is exactly that. Only the two authored states stay here. */
    var tabs = [
      { k: 'published', n: u.published.length },
      { k: 'drafts', n: u.drafts.length }
    ];
    if (state.mineTab !== 'published' && state.mineTab !== 'drafts') { state.mineTab = 'published'; }

    var body = '';
    if (state.mineTab === 'published') {
      body = u.published.map(function (id) {
        var r = RK.reviewById(id);
        var d = RK.doctorById(r.doctorId);
        /* STORY-REV-003: deletion leaves a restorable tombstone, it does not
           silently drop the row. mine.deleteNote promises 30-day restore. */
        if (state.removedPublished.indexOf(id) !== -1) {
          return '<article class="mine-item">' +
            '<div class="row-flags">' + badge('warn', T('mine.deleted')) + '</div>' +
            '<h3>' + esc(P(r.title)) + '</h3>' +
            '<p class="note">' + esc(T('mine.deleteNote')) + '</p>' +
            '<div class="mine-actions">' +
              '<button class="btn small ghost" type="button" data-restore-pub="' + id + '">' + esc(T('mine.restore')) + '</button>' +
            '</div>' +
          '</article>';
        }
        return '<article class="mine-item">' +
          '<div class="row-flags">' + badge(r.sentiment, T('sentiment.' + r.sentiment)) +
            badge('plain', T('outcome.' + r.outcome)) +
            badge('plain', bn(RK.followUpsFor(r.id).length) + ' ' + T('label.followUp').toLowerCase()) + '</div>' +
          '<h3>' + esc(P(r.title)) + '</h3>' +
          /* The author could not see how their own experience was
             attributed (real name / username / anonymous). */
          byline(r, 'mine') +
          '<p class="note">' + doctorLink(d) + ' · ' + esc(P(r.period)) + ' · ' + esc(P(r.posted)) + '</p>' +
          '<div class="mine-actions">' +
            '<button class="btn small ghost" type="button" data-account="' + r.id + '">' + esc(T('review.readFull')) + '</button>' +
            '<button class="btn small ghost" type="button" data-goto="compose">' + esc(T('mine.edit')) + '</button>' +
            '<button class="btn small ghost" type="button" data-goto="compose">' + esc(T('mine.addFollowUp')) + '</button>' +
            '<button class="btn small ghost" type="button" data-del-pub="' + r.id + '">' + esc(T('mine.delete')) + '</button>' +
          '</div>' +
          '<p class="note">' + esc(T('mine.deleteNote')) + '</p>' +
        '</article>';
      }).join('');
    } else if (state.mineTab === 'drafts') {
      // STORY-REV-003: drafts tab with 30-day expiration note
      body = '<p class="note" style="margin-bottom:14px">' + esc(T('mine.draftNote')) + '</p>' +
        u.drafts.filter(function (dr) { return state.removedDrafts.indexOf(dr.id) === -1; }).map(function (dr) {
          return '<article class="mine-item">' +
            '<div class="row-flags">' +
              badge(dr.expiresInDays <= 7 ? 'warn' : 'plain', T('mine.draftExpires') + ' ' + bn(dr.expiresInDays) + ' ' + T('mine.days')) +
              (dr.blocked ? badge('warn', T('compose.addPending').slice(0, 40) + '…') : '') +
            '</div>' +
            '<h3>' + esc(P(dr.title)) + '</h3>' +
            '<p class="excerpt">' + esc(P(dr.excerpt)) + '</p>' +
            '<div class="mine-actions">' +
              '<button class="btn small" type="button" data-goto="compose">' + esc(T('mine.continue')) + '</button>' +
              '<button class="btn small ghost" type="button" data-del-draft="' + dr.id + '">' + esc(T('mine.delete')) + '</button>' +
            '</div>' +
          '</article>';
        }).join('');
    }
    /* Saved (#saved) and Notifications (#notifications) now render in
       renderSaved() / renderNotifications(). */

    host.innerHTML =
      '<section class="a-head">' +
        '<span class="kicker">' + esc(P(RK.user.display)) + ' · ' + esc(RK.user.username) + '</span>' +
        '<h1 class="display">' + esc(T('mine.title')) + '</h1>' +
        '<div class="btn-row"><button class="btn small ghost" type="button" data-person="' + esc(RK.user.username) + '">' + esc(T('person.viewPublic')) + '</button></div>' +
        '<p class="note">' + esc(P(RK.user.joined)) + '</p>' +
      '</section>' +
      workspaceNav('mine') +
      '<section class="panel">' +
        '<div class="mine-tabs mine-subtabs">' + tabs.map(function (t) {
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
        // STORY-MOD-003: appeal entry from mine tab (appeal sheet at app.js:1474-1485)
        '<button class="btn small" type="button" id="open-appeal" style="margin-top:12px">' + esc(T('appeal.button')) + '</button>' +
      '</section>' +
      // STORY-USER-002: preferences + feedback + data requests
      '<section class="sub"><h4 class="sub-head">' + esc(T('user2.preferences')) + '</h4>' +
        '<p class="note">' + esc(T('user2.preferencesNote')) + '</p>' +
        '<div class="opt-row">' +
          '<button class="opt" type="button" id="pref-lang" aria-pressed="' + (state.lang === 'bn') + '">' + esc(T('user2.lang.' + state.lang)) + '</button>' +
        '</div>' +
      '</section>' +
      '<section class="sub"><h4 class="sub-head">' + esc(T('user2.feedback')) + '</h4>' +
        '<p class="note">' + esc(T('user2.feedbackNote')) + '</p>' +
        '<div class="field"><label class="sr-only" for="user-feedback">' + esc(T('user2.feedback')) + '</label>' +
          '<textarea id="user-feedback" placeholder="' + esc(T('user2.feedbackPh')) + '" style="min-height:90px"></textarea></div>' +
        '<button class="btn small" type="button" id="user-feedback-send">' + esc(T('user2.feedbackSend')) + '</button>' +
        '<span class="saved-flag" id="user-feedback-flag">' + esc(T('compose.draftSaved')) + '</span>' +
      '</section>' +
      '<section class="sub"><h4 class="sub-head">' + esc(T('user2.data')) + '</h4>' +
        '<p class="note">' + esc(T('user2.dataNote')) + '</p>' +
        '<div class="mine-actions">' +
          '<button class="btn small" type="button" id="user-data-export">' + esc(T('user2.dataExport')) + '</button>' +
          '<button class="btn small ghost" type="button" id="user-data-delete">' + esc(T('user2.dataDelete')) + '</button>' +
        '</div>' +
        '<p class="callout" style="margin-top:14px">' + esc(T('user2.dataCallout')) + '</p>' +
      '</section>';
  }

  /* =====================================================================
     9 · Emergency — Bangladesh national emergency contacts
     ===================================================================== */

  /* STORY-USER-001 — public profile projection.
     Allowlist: accounts published under this display name, and comments
     written under it. Anonymous accounts are excluded by construction;
     drafts, bookmarks and notifications never appear. Page is noindex. */
  /* ---------------------------------------------------------------------
     Browsable indexes.

     The search results view already lists doctors and facilities once you
     have searched. These are the front doors for someone who does not yet
     know what to search for, and they are deliberately unranked: the order
     is alphabetical, never by volume or sentiment, so the list itself
     cannot be read as a league table.
     --------------------------------------------------------------------- */
  function indexHead(kicker, title, note) {
    return '<section class="a-head index-head">' +
      '<span class="kicker">' + esc(kicker) + '</span>' +
      '<h1 class="display">' + esc(title) + '</h1>' +
      '<p class="lead">' + esc(note) + '</p>' +
    '</section>';
  }
  function byName(a, b) { return P(a.name).localeCompare(P(b.name)); }

  function renderDoctorIndex() {
    var host = $('#view-doctors');
    if (!host) { return; }
    setNoindex(false);
    var list = RK.doctors.slice().sort(byName);
    host.innerHTML =
      indexHead(T('nav.discover'), T('nav.profile'), T('index.doctorsNote')) +
      '<p class="note count-line">' + bn(list.length) + ' · ' + esc(T('nav.profile')) + '</p>' +
      '<div class="index-list">' + list.map(doctorEntry).join('') + '</div>';
  }

  function renderFacilityIndex() {
    var host = $('#view-facilities');
    if (!host) { return; }
    setNoindex(false);
    var list = RK.facilities.slice().sort(byName);
    host.innerHTML =
      indexHead(T('nav.discover'), T('nav.facilities'), T('index.facilitiesNote')) +
      '<p class="note count-line">' + bn(list.length) + ' · ' + esc(T('nav.facilities')) + '</p>' +
      '<div class="index-list">' + list.map(facilityEntry).join('') + '</div>';
  }

  /* Unlike the Discover tile grid, this lists EVERY topic including the ones
     with nothing written about them yet - an empty topic is the strongest
     invitation to write, and hiding it hides the gap. */
  function renderTopicIndex() {
    var host = $('#view-topics');
    if (!host) { return; }
    setNoindex(false);
    var list = RK.conditions.slice().sort(byName);
    host.innerHTML =
      indexHead(T('nav.discover'), T('nav.condition'), T('index.topicsNote')) +
      '<p class="note count-line">' + bn(list.length) + ' · ' + esc(T('nav.condition')) + '</p>' +
      '<div class="index-grid">' + list.map(function (c) {
        var n = RK.conditionAccounts(c.id).length;
        return '<button class="browse-card" type="button" data-condition="' + c.id + '">' +
          '<b>' + esc(P(c.name)) + '</b>' +
          '<span>' + (n
            ? bn(n) + ' ' + esc(T('sentiment.accounts'))
            : esc(T('index.emptyTopic'))) + '</span>' +
        '</button>';
      }).join('') + '</div>';
  }

  function renderExperienceIndex() {
    var host = $('#view-experiences');
    if (!host) { return; }
    setNoindex(false);
    var list = RK.reviews.slice();
    host.innerHTML =
      indexHead(T('nav.discover'), T('nav.account'), T('index.experiencesNote')) +
      '<p class="note count-line">' + bn(list.length) + ' ' + esc(T('sentiment.accounts')) + '</p>' +
      '<div class="index-list">' + list.map(accountRow).join('') + '</div>';
  }

  /* Split out of the workspace: "My writing" cannot head a list of other
     people's writing, and Saved holds exactly that. */
  function renderSaved() {
    var host = $('#view-saved');
    if (!host) { return; }
    setNoindex(true);
    var ids = bookmarks();
    host.innerHTML =
      indexHead(T('nav.mine'), T('mine.bookmarks'), T('mine.bookmarkNote')) +
      workspaceNav('saved') +
      (ids.length
        ? '<div class="index-list">' + ids.map(function (id) { return accountRow(RK.reviewById(id)); }).join('') + '</div>'
        : '<p class="note">' + esc(T('mine.empty')) + '</p>');
  }

  function renderNotifications() {
    var host = $('#view-notifications');
    if (!host) { return; }
    setNoindex(true);
    var list = RK.user.notifications || [];
    host.innerHTML =
      indexHead(T('nav.mine'), T('mine.notifications'), T('mine.notifNote')) +
      workspaceNav('notifications') +
      (list.length
        ? '<section class="panel">' + list.map(function (n) {
            return '<div class="notif' + (n.unread ? ' unread' : '') + '">' +
              '<span class="dot" aria-hidden="true"></span>' +
              '<span>' + esc(L(n.text)) + '<span class="when">' + esc(L(n.when)) + '</span></span>' +
            '</div>';
          }).join('') + '</section>'
        : '<p class="note">' + esc(T('mine.empty')) + '</p>');
  }

  /* Shared sub-navigation for the three workspace pages. */
  function workspaceNav(current) {
    var items = [['mine', 'nav.mine'], ['saved', 'mine.bookmarks'], ['notifications', 'mine.notifications']];
    return '<nav class="mine-tabs" aria-label="' + esc(T('nav.mine')) + '">' +
      items.map(function (it) {
        return '<button type="button" data-goto="' + it[0] + '" aria-pressed="' +
          (it[0] === current) + '">' + esc(T(it[1])) + '</button>';
      }).join('') + '</nav>';
  }

  function renderPerson() {
    var host = $('#view-person');
    if (!host) { return; }
    setNoindex(true);
    var who = state.personId || '';
    var accounts = RK.reviews.filter(function (r) {
      return r.identity !== 'anon' && r.author.en === who;
    });
    var said = RK.comments.filter(function (c) {
      return c.author && c.author.en === who;
    });
    /* Use the author's bilingual form, not the raw handle from the URL, so a
       real name reads in Bengali on the Bengali page. */
    var sample = accounts[0] || said[0] || null;
    var shownName = sample ? P(sample.author) : who;
    host.innerHTML =
      '<section class="about-head">' +
        '<span class="kicker">' + esc(T('person.kicker')) + '</span>' +
        '<h1 class="display">' + esc(shownName) + '</h1>' +
        (sample ? '<p class="byline"><span class="byline-id" data-identity="' + esc(sample.identity) + '">' +
          esc(T('byline.identity.' + sample.identity)) + '</span></p>' : '') +
        '<p class="lead">' + esc(T('person.noindex')) + '</p>' +
      '</section>' +
      '<section class="panel" style="margin-bottom:20px">' +
        '<h2 class="sub-head">' + esc(T('person.allowlist')) + '</h2>' +
        '<p class="note">' + esc(T('person.allowlistNote')) + '</p>' +
      '</section>' +
      '<h2 class="section-head">' + esc(T('person.contributions')) + ' <span style="font-weight:400;font-size:.6em;color:var(--ink-faint)">' + bn(accounts.length) + '</span></h2>' +
      (accounts.length
        ? '<div>' + accounts.map(accountRow).join('') + '</div>'
        : '<p class="note">' + esc(T('person.empty')) + '</p>') +
      '<h2 class="section-head">' + esc(T('person.comments')) + ' <span style="font-weight:400;font-size:.6em;color:var(--ink-faint)">' + bn(said.length) + '</span></h2>' +
      (said.length
        ? '<div>' + said.map(function (c) { return commentHtml(c, null, true); }).join('') + '</div>'
        : '<p class="note">' + esc(T('person.empty')) + '</p>');
  }

  function renderEmergency() {
    var host = $('#view-emergency');
    if (!host) { return; }
    setNoindex(false);
    var em = RK.config && RK.config.emergency ? RK.config.emergency : {};
    var rows = [
      { k: T('emergview.ambulance'), v: em.ambulance || '999',  hint: '' },
      { k: T('emergview.healthLine'), v: em.healthLine || '16263', hint: '' },
      { k: T('emergview.crisis'), v: em.crisisLine || '09612-119911', hint: '' }
    ];
    host.innerHTML =
      '<section class="panel emerg-head">' +
        '<span class="kicker">' + esc(T('nav.emergency')) + '</span>' +
        '<h1>' + esc(T('emergency.title')) + '</h1>' +
        '<p>' + esc(T('emergview.intro')) + '</p>' +
      '</section>' +

      '<div class="emerg-grid">' +
        rows.map(function (r) {
          return '<a class="panel emerg-card" href="tel:' + esc(r.v) + '">' +
            '<span class="k">' + esc(r.k) + '</span>' +
            '<span class="num">' + esc(r.v) + '</span>' +
            '<span class="cta">' + esc(T('a11y.call')) + '</span>' +
          '</a>';
        }).join('') +
        /* verify.bmdc.org.bd is the registration-lookup portal. The general
           site (www.bmdc.org.bd) does not let you check a number, and the
           copy here promises exactly that. Source: 03-research-report.md. */
        '<a class="panel emerg-card bmdc" href="https://verify.bmdc.org.bd/" target="_blank" rel="noopener">' +
          '<span class="k">' + esc(T('emergview.bmdc')) + '</span>' +
          '<span class="num">BMDC</span>' +
          '<span class="cta">' + esc(T('emergview.bmdcBody')) + '</span>' +
        '</a>' +
      '</div>' +

      '<p class="note" style="margin-top:18px">' +
        esc(RK.config && RK.config.emergency && RK.config.emergency.lastVerified ?
          P(RK.config.emergency.lastVerified) :
          T('emergency.body')) +
      '</p>';
  }

  /* =====================================================================
     10 · About — methodology, moderation, privacy, limits, contact
     ===================================================================== */

  function renderAbout() {
    var host = $('#view-about');
    if (!host) { return; }
    setNoindex(false);
    var sections = [
      { t: T('aboutview.modTitle'),       b: T('aboutview.modBody') },
      { t: T('aboutview.reviewerTitle'),  b: T('aboutview.reviewerBody') },
      { t: T('aboutview.privacyTitle'),   b: T('aboutview.privacyBody') },
      { t: T('aboutview.limitsTitle'),    b: T('aboutview.limitsBody') },
      { t: T('aboutview.contact'),        b: T('aboutview.contactBody') }
    ];
    host.innerHTML =
      '<section class="panel about-head">' +
        '<span class="kicker">' + esc(T('nav.about')) + '</span>' +
        '<h1>' + esc(T('aboutview.title')) + '</h1>' +
        '<p class="lead">' + esc(T('aboutview.intro')) + '</p>' +
      '</section>' +

      '<div class="about-sections">' +
        sections.map(function (s) {
          return '<section class="panel about-section">' +
            '<h2>' + esc(s.t) + '</h2>' +
            '<p>' + esc(s.b) + '</p>' +
          '</section>';
        }).join('') +
      '</div>' +

      '<p class="note about-foot">' + esc(T('aboutview.lastReviewed')) + '</p>';
  }

  /* =====================================================================
     STORY-EVID-002: processed evidence viewer (zoom/pan/page/rotate/download)
     ===================================================================== */

  /* Local string table for the viewer. The shared file is read-only for
     this work, so these live in the prototype's app.js. They follow the
     same en/bn shape as the shared table. */
  var VIEWER_STRINGS = {
    title:         { en: 'Processed copy', bn: 'প্রক্রিয়াকৃত কপি' },
    notice:        { en: 'Documents attached — not medically validated', bn: 'কাগজপত্র যুক্ত — চিকিৎসাগতভাবে যাচাই করা হয়নি' },
    zoomOut:       { en: 'Zoom out', bn: 'ছোট করুন' },
    zoom100:       { en: '100%', bn: '১০০%' },
    zoomIn:        { en: 'Zoom in', bn: 'বড় করুন' },
    fit:           { en: 'Fit', bn: 'ফিট' },
    rotate:        { en: 'Rotate', bn: 'ঘোরান' },
    pagePrev:      { en: 'Previous page', bn: 'আগের পাতা' },
    pageNext:      { en: 'Next page', bn: 'পরের পাতা' },
    pageOf:        { en: 'Page', bn: 'পাতা' },
    of:            { en: 'of', bn: '/' },
    download:      { en: 'Download processed copy', bn: 'প্রক্রিয়াকৃত কপি ডাউনলোড করুন' },
    zoomLabel:     { en: 'Zoom level', bn: 'জুম স্তর' },
    rotateLabel:   { en: 'Rotation', bn: 'ঘূর্ণন' },
    /* Synthetic page body lines — anonymised prescription / lab report /
       clinical-note copy in the Quiet Clinic register. */
    docHeadA:      { en: 'PROCESSED COPY · NOT MEDICAL ADVICE', bn: 'প্রক্রিয়াকৃত কপি · চিকিৎসা পরামর্শ নয়' },
    docHeadB:      { en: 'SYNTHETIC · FOR PROTOTYPE ONLY', bn: 'সিনথেটিক · শুধু প্রোটোটাইপের জন্য' },
    seal:          { en: 'PROCESSED · QUARANTINE PASSED', bn: 'প্রক্রিয়াকৃত · কোয়ারেন্টাইন পাস' },
    /* Prescription lines */
    rxClinic:      { en: 'City Health Clinic — Consultation room 4', bn: 'সিটি হেলথ ক্লিনিক — পরামর্শ কক্ষ ৪' },
    rxDoctor:      { en: 'Doctor', bn: 'ডাক্তার' },
    rxPatient:     { en: 'Patient', bn: 'রোগী' },
    rxRedacted:    { en: '[ redacted by author ]', bn: '[ লেখক কর্তৃক ঢাকা ]' },
    rxDate:        { en: 'Date', bn: 'তারিখ' },
    rxDiagnosis:   { en: 'Diagnosis', bn: 'রোগ নির্ণয়' },
    rxMedicines:   { en: 'Medicines', bn: 'ওষুধ' },
    rxDose:        { en: 'Dose', bn: 'ডোজ' },
    rxDuration:    { en: 'Duration', bn: 'মেয়াদ' },
    rxAdvice:      { en: 'Advice', bn: 'পরামর্শ' },
    rxSig:         { en: 'Signature', bn: 'স্বাক্ষর' },
    /* Lab report lines */
    labName:       { en: 'City Diagnostic Centre — Biochemistry', bn: 'সিটি ডায়াগনস্টিক সেন্টার — বায়োকেমিস্ট্রি' },
    labTest:       { en: 'Test', bn: 'পরীক্ষা' },
    labResult:     { en: 'Result', bn: 'ফলাফল' },
    labRange:      { en: 'Reference range', bn: 'সাধারণ মাত্রা' },
    labUnit:       { en: 'Unit', bn: 'একক' },
    labMethod:     { en: 'Method', bn: 'পদ্ধতি' },
    /* Clinical note lines */
    noteClinic:    { en: 'Outpatient follow-up note', bn: 'বহির্বিভাগীয় ফলো-আপ নোট' },
    noteSubject:   { en: 'Subject', bn: 'বিষয়' },
    noteHistory:   { en: 'History', bn: 'ইতিহাস' },
    noteExam:      { en: 'Examination', bn: 'পরীক্ষা' },
    notePlan:      { en: 'Plan', bn: 'পরিকল্পনা' }
  };
  function VT(k) { var o = VIEWER_STRINGS[k]; return o ? (state.lang === 'bn' ? o.bn : o.en) : k; }

  /* The viewer's own state. Reset every time it opens. */
  var viewer = {
    open: false,
    fileId: null,
    pages: [],         /* array of {kind, title, rows} — synthetic page content */
    page: 0,           /* 0-based */
    zoom: 1,           /* 0.5..3 */
    rotation: 0,       /* 0|90|180|270 */
    pan: { x: 0, y: 0 },
    panning: false,
    panStart: null
  };

  /* Deterministic per-file page generator. The kind and copy vary so each
     document in the demo data shows a different synthetic page. */
  function buildViewerPages(file) {
    var seed = 0;
    for (var i = 0; i < file.id.length; i++) { seed = (seed * 31 + file.id.charCodeAt(i)) & 0x7fffffff; }
    var lang = state.lang;
    var pickKind = seed % 3; /* 0=prescription, 1=lab, 2=clinical note */
    var totalPages = file.pages ? Math.max(1, Math.min(4, file.pages)) : 1;
    var pages = [];
    for (var p = 0; p < totalPages; p++) {
      var kind = (pickKind + p) % 3;
      var page = { kind: kind, title: P(file.label), pageNum: p + 1, totalPages: totalPages };
      if (kind === 0) {
        page.head = VT('rxClinic');
        page.kindTitle = lang === 'bn' ? 'প্রেসক্রিপশন' : 'Prescription';
        page.kv = [
          [VT('rxDoctor'), lang === 'bn' ? 'ডা. এম. রহমান, এমবিবিএস, এফসিপিএস' : 'Dr. M. Rahman, MBBS, FCPS'],
          [VT('rxPatient'), VT('rxRedacted')],
          [VT('rxDate'), lang === 'bn' ? 'মার্চ ২০২৬' : 'March 2026'],
          [VT('rxDiagnosis'), lang === 'bn' ? 'টাইপ ২ ডায়াবেটিস — নিয়ন্ত্রণে' : 'Type 2 diabetes — under control']
        ];
        page.rows = [
          [lang === 'bn' ? 'মেটফরমিন ৫০০ মিগ্রা' : 'Metformin 500 mg', lang === 'bn' ? 'দিনে ২ বার, খাবারের পর' : 'Twice daily, after meals', '৩০ দিন'],
          [lang === 'bn' ? 'এমলোডিপিন ৫ মিগ্রা' : 'Amlodipine 5 mg', lang === 'bn' ? 'রাতে ১টি' : 'One tablet at night', '৩০ দিন'],
          [lang === 'bn' ? 'অ্যাটোরভাস্ট্যাটিন ১০ মিগ্রা' : 'Atorvastatin 10 mg', lang === 'bn' ? 'রাতে ১টি' : 'One tablet at night', '৩০ দিন']
        ];
        page.tail = lang === 'bn' ? 'ব্যায়াম ও খাদ্যাভ্যাস বজায় রাখুন। ৪ সপ্তাহ পর ফলো-আপ।' : 'Continue diet and exercise. Follow up in four weeks.';
        page.sigLabel = VT('rxSig');
        page.sigValue = lang === 'bn' ? 'ডা. এম. রহমান' : 'Dr. M. Rahman';
      } else if (kind === 1) {
        page.head = VT('labName');
        page.kindTitle = lang === 'bn' ? 'ল্যাব রিপোর্ট' : 'Lab report';
        page.kv = [
          [VT('labTest'), lang === 'bn' ? 'রক্তের সাধারণ পরীক্ষা ও লিপিড প্রোফাইল' : 'CBC and lipid profile'],
          [VT('rxPatient'), VT('rxRedacted')],
          [VT('rxDate'), lang === 'bn' ? 'মে ২০২৬' : 'May 2026'],
          [VT('labMethod'), lang === 'bn' ? 'অটোমেটেড অ্যানালাইজার' : 'Automated analyser']
        ];
        page.rows = [
          [lang === 'bn' ? 'হিমোগ্লোবিন' : 'Haemoglobin', lang === 'bn' ? '১৩.৪' : '13.4', lang === 'bn' ? 'গ্রা/ডেসিলি' : 'g/dL', lang === 'bn' ? '১৩.০ – ১৭.০' : '13.0 – 17.0'],
          [lang === 'bn' ? 'এইচবিএ১সি' : 'HbA1c', lang === 'bn' ? '৬.৮' : '6.8', '%', lang === 'bn' ? '৪.০ – ৫.৬' : '4.0 – 5.6'],
          [lang === 'bn' ? 'কোলেস্টেরল' : 'Total cholesterol', lang === 'bn' ? '১৭৬' : '176', lang === 'bn' ? 'মিগ্রা/ডেসিলি' : 'mg/dL', lang === 'bn' ? '< ২০০' : '< 200'],
          [lang === 'bn' ? 'এলডিএল' : 'LDL', lang === 'bn' ? '১০২' : '102', lang === 'bn' ? 'মিগ্রা/ডেসিলি' : 'mg/dL', lang === 'bn' ? '< ১০০' : '< 100']
        ];
        page.tail = lang === 'bn' ? 'ফলাফল স্বাভাবিক সীমার কাছাকাছি। চিকিৎসকের সাথে আলোচনা করুন।' : 'Results near reference range. Discuss with your clinician.';
        page.sigLabel = lang === 'bn' ? 'অনুমোদন' : 'Verified by';
        page.sigValue = lang === 'bn' ? 'প্রযুক্তি অফিসার' : 'Lab technician';
      } else {
        page.head = VT('noteClinic');
        page.kindTitle = lang === 'bn' ? 'ক্লিনিক্যাল নোট' : 'Clinical note';
        page.kv = [
          [VT('noteSubject'), lang === 'bn' ? 'ফলো-আপ: গ্লুকোজ নিয়ন্ত্রণ' : 'Follow-up: glucose control'],
          [VT('rxPatient'), VT('rxRedacted')],
          [VT('rxDate'), lang === 'bn' ? 'এপ্রিল ২০২৬' : 'April 2026']
        ];
        page.rows = [
          [VT('noteHistory'), lang === 'bn' ? 'গত তিন মাসে ওজন স্থির, ক্লান্তি কমেছে।' : 'Weight stable for three months, fatigue has reduced.'],
          [VT('noteExam'), lang === 'bn' ? 'রক্তচাপ স্বাভাবিক; পায়ে কোনো ফোলা নেই।' : 'Blood pressure normal; no peripheral oedema.'],
          [VT('notePlan'), lang === 'bn' ? 'চলমান ওষুধ বজায় রাখুন; ৩ মাস পর HbA1c পুনরায় পরীক্ষা।' : 'Continue current medication; repeat HbA1c in three months.']
        ];
        page.tail = '';
        page.sigLabel = VT('rxSig');
        page.sigValue = lang === 'bn' ? 'পরামর্শক চিকিৎসক' : 'Attending physician';
      }
      pages.push(page);
    }
    return pages;
  }

  /* Renders one synthetic page as HTML. Inline because SVG/canvas would
     require reflow on every zoom step — keeping it as DOM keeps pan/zoom
     on the parent transform only. */
  function viewerPageHtml(p) {
    var kv = p.kv.map(function (row) {
      return '<dt>' + esc(row[0]) + '</dt><dd>' + esc(row[1]) + '</dd>';
    }).join('');
    var body;
    if (p.kind === 0) {
      body = '<h3>' + esc(p.kindTitle) + '</h3>' +
        '<p class="sub">' + esc(p.title) + '</p>' +
        '<dl class="row">' + kv + '</dl>' +
        '<div class="table">' +
          '<span class="h">' + esc(VT('rxMedicines')) + '</span>' +
          '<span class="h">' + esc(VT('rxDose')) + '</span>' +
          '<span class="h">' + esc(VT('rxDuration')) + '</span>' +
          p.rows.map(function (r) {
            return '<span>' + esc(r[0]) + '</span><span>' + esc(r[1]) + '</span><span>' + esc(r[2]) + '</span>';
          }).join('') +
        '</div>' +
        '<p class="sub">' + esc(p.tail) + '</p>';
    } else if (p.kind === 1) {
      body = '<h3>' + esc(p.kindTitle) + '</h3>' +
        '<p class="sub">' + esc(p.title) + '</p>' +
        '<dl class="row">' + kv + '</dl>' +
        '<div class="table">' +
          '<span class="h">' + esc(VT('labTest')) + '</span>' +
          '<span class="h">' + esc(VT('labResult')) + '</span>' +
          '<span class="h">' + esc(VT('labRange')) + '</span>' +
          p.rows.map(function (r) {
            return '<span>' + esc(r[0]) + '</span><span>' + esc(r[1]) + ' ' + esc(r[2]) + '</span><span>' + esc(r[3]) + '</span>';
          }).join('') +
        '</div>' +
        '<p class="sub">' + esc(p.tail) + '</p>';
    } else {
      body = '<h3>' + esc(p.kindTitle) + '</h3>' +
        '<p class="sub">' + esc(p.title) + '</p>' +
        '<dl class="row">' + kv + '</dl>' +
        p.rows.map(function (r) {
          return '<dl class="row"><dt>' + esc(r[0]) + '</dt><dd>' + esc(r[1]) + '</dd></dl>';
        }).join('');
    }
    return '<section class="viewer-page" aria-label="' + esc(p.kindTitle) + ' ' + p.pageNum + '">' +
      '<div class="doc-head"><span>' + esc(VT('docHeadA')) + '</span><span>' + esc(p.head) + '</span></div>' +
      body +
      (p.sigLabel ? '<p class="sig"><span><b>' + esc(p.sigLabel) + ':</b> ' + esc(p.sigValue) + '</span><span>' + esc(VT('docHeadB')) + '</span></p>' : '') +
      '<div class="seal" aria-hidden="true">' + esc(VT('seal')) + '</div>' +
    '</section>';
  }

  function openEvidenceViewer(fileId) {
    var file = (RK.evidence || []).filter(function (e) { return e.id === fileId; })[0];
    if (!file || file.state === 'failed') { return; }
    viewer.open = true;
    viewer.fileId = fileId;
    viewer.pages = buildViewerPages(file);
    viewer.page = 0;
    viewer.zoom = 1;
    viewer.rotation = 0;
    viewer.pan = { x: 0, y: 0 };
    viewer.panning = false;

    /* Replace the sheet body but reuse the existing overlay chrome. */
    $('#sheet-title').textContent = VT('title');
    var body = renderViewerBody(file);
    $('#sheet-body').innerHTML = body;
    $('#overlay').hidden = false;
    bindViewer();
    var first = $('#viewer-zoom-out') || $('#viewer-stage');
    if (first) { first.focus({ preventScroll: true }); }
    /* Trap focus inside the viewer. */
    trapFocus($('#sheet-body'));
  }

  function closeEvidenceViewer() {
    viewer.open = false;
    viewer.panning = false;
    unbindViewer();
    releaseFocusTrap($('#sheet-body'));
    $('#overlay').hidden = true;
  }

  function renderViewerBody(file) {
    var pagesHtml = viewer.pages.map(function (p, i) {
      return '<div class="viewer-page-wrap" data-page-index="' + i + '"' + (i === 0 ? '' : ' hidden') + '>' +
        viewerPageHtml(p) +
      '</div>';
    }).join('');
    return '<div class="viewer-shell" id="viewer-shell" role="dialog" aria-modal="true" aria-labelledby="viewer-title">' +
      '<h3 id="viewer-title" class="sr-only">' + esc(VT('title')) + '</h3>' +
      '<div class="viewer-meta">' +
        '<span class="file">' + esc(P(file.label)) + '</span>' +
        '<span class="notice">' + esc(VT('notice')) + '</span>' +
      '</div>' +
      '<div class="viewer-stage" id="viewer-stage" tabindex="0" role="region" aria-label="' + esc(VT('zoomLabel')) + '">' +
        '<div class="viewer-pages" id="viewer-pages">' + pagesHtml + '</div>' +
      '</div>' +
      '<div class="viewer-controls" role="toolbar" aria-label="' + esc(VT('zoomLabel')) + '">' +
        '<button class="vctrl" type="button" id="viewer-zoom-out" aria-label="' + esc(VT('zoomOut')) + '" title="' + esc(VT('zoomOut')) + ' (−)">−</button>' +
        '<button class="vctrl" type="button" id="viewer-zoom-100" aria-label="' + esc(VT('zoom100')) + '" title="' + esc(VT('zoom100')) + '">100%</button>' +
        '<button class="vctrl" type="button" id="viewer-zoom-in" aria-label="' + esc(VT('zoomIn')) + '" title="' + esc(VT('zoomIn')) + ' (+)">+</button>' +
        '<button class="vctrl" type="button" id="viewer-fit" aria-label="' + esc(VT('fit')) + '" title="' + esc(VT('fit')) + '">⤢ ' + esc(VT('fit')) + '</button>' +
        '<span class="vsep" aria-hidden="true"></span>' +
        '<button class="vctrl" type="button" id="viewer-rotate" aria-label="' + esc(VT('rotate')) + '" title="' + esc(VT('rotate')) + ' (R)">⟳ ' + esc(VT('rotate')) + '</button>' +
        '<span class="vsep" aria-hidden="true"></span>' +
        '<button class="vctrl" type="button" id="viewer-prev" aria-label="' + esc(VT('pagePrev')) + '" title="' + esc(VT('pagePrev')) + ' (←)">‹</button>' +
        '<span class="vpager"><b id="viewer-page-now">1</b> ' + esc(VT('of')) + ' <b id="viewer-page-total">' + bn(viewer.pages.length) + '</b></span>' +
        '<button class="vctrl" type="button" id="viewer-next" aria-label="' + esc(VT('pageNext')) + '" title="' + esc(VT('pageNext')) + ' (→)">›</button>' +
        '<span class="spacer"></span>' +
        '<span class="vpager" aria-live="polite"><b id="viewer-zoom-pct">100%</b></span>' +
        '<button class="vdownload" type="button" id="viewer-download">' + esc(VT('download')) + '</button>' +
      '</div>' +
    '</div>';
  }

  function applyViewerTransform() {
    var pages = $('#viewer-pages');
    if (!pages) { return; }
    pages.style.transform = 'translate(' + viewer.pan.x + 'px,' + viewer.pan.y + 'px) ' +
      'rotate(' + viewer.rotation + 'deg) scale(' + viewer.zoom + ')';
    var pct = $('#viewer-zoom-pct');
    if (pct) { pct.textContent = Math.round(viewer.zoom * 100) + '%'; }
    /* Page visibility — only show current page. */
    $$('.viewer-page-wrap').forEach(function (w, i) {
      if (i === viewer.page) { w.removeAttribute('hidden'); }
      else { w.setAttribute('hidden', ''); }
    });
    var now = $('#viewer-page-now');
    var tot = $('#viewer-page-total');
    if (now) { now.textContent = bn(viewer.page + 1); }
    if (tot) { tot.textContent = bn(viewer.pages.length); }
  }

  function viewerZoom(delta) {
    var z = viewer.zoom + delta;
    if (z < 0.5) { z = 0.5; }
    if (z > 3) { z = 3; }
    viewer.zoom = Math.round(z * 100) / 100;
    applyViewerTransform();
  }
  function viewerFit() {
    var stage = $('#viewer-stage');
    if (!stage) { viewer.zoom = 1; viewer.rotation = 0; viewer.pan = { x: 0, y: 0 }; applyViewerTransform(); return; }
    var pageEl = stage.querySelector('.viewer-page-wrap:not([hidden]) .viewer-page') || stage.querySelector('.viewer-page');
    if (!pageEl) { viewer.zoom = 1; applyViewerTransform(); return; }
    var sw = stage.clientWidth - 64;
    var sh = stage.clientHeight - 64;
    var pw = pageEl.offsetWidth;
    var ph = pageEl.offsetHeight;
    var z = Math.min(sw / pw, sh / ph);
    if (z > 2) { z = 2; }
    if (z < 0.5) { z = 0.5; }
    viewer.zoom = Math.round(z * 100) / 100;
    viewer.rotation = 0;
    viewer.pan = { x: 0, y: 0 };
    applyViewerTransform();
  }
  function viewerRotate() {
    viewer.rotation = (viewer.rotation + 90) % 360;
    applyViewerTransform();
  }
  function viewerPage(delta) {
    var p = viewer.page + delta;
    if (p < 0) { p = 0; }
    if (p >= viewer.pages.length) { p = viewer.pages.length - 1; }
    viewer.page = p;
    applyViewerTransform();
  }

  /* Click handlers inside the viewer. We re-bind every open because the
     sheet body is replaced. */
  function bindViewer() {
    var stage = $('#viewer-stage');
    if (stage) {
      stage.addEventListener('pointerdown', viewerPanStart);
      stage.addEventListener('pointermove', viewerPanMove);
      stage.addEventListener('pointerup', viewerPanEnd);
      stage.addEventListener('pointercancel', viewerPanEnd);
      stage.addEventListener('pointerleave', viewerPanEnd);
      stage.addEventListener('wheel', viewerWheel, { passive: false });
    }
    var byId = function (id) { return $('#' + id); };
    if (byId('viewer-zoom-out'))  { byId('viewer-zoom-out').addEventListener('click', function () { viewerZoom(-0.1); }); }
    if (byId('viewer-zoom-in'))   { byId('viewer-zoom-in').addEventListener('click', function () { viewerZoom(0.1); }); }
    if (byId('viewer-zoom-100'))  { byId('viewer-zoom-100').addEventListener('click', function () { viewer.zoom = 1; viewer.pan = { x: 0, y: 0 }; applyViewerTransform(); }); }
    if (byId('viewer-fit'))       { byId('viewer-fit').addEventListener('click', viewerFit); }
    if (byId('viewer-rotate'))    { byId('viewer-rotate').addEventListener('click', viewerRotate); }
    if (byId('viewer-prev'))      { byId('viewer-prev').addEventListener('click', function () { viewerPage(-1); }); }
    if (byId('viewer-next'))      { byId('viewer-next').addEventListener('click', function () { viewerPage(1); }); }
    if (byId('viewer-download'))  { byId('viewer-download').addEventListener('click', viewerDownload); }
  }
  function unbindViewer() {
    var stage = $('#viewer-stage');
    if (!stage) { return; }
    stage.removeEventListener('pointerdown', viewerPanStart);
    stage.removeEventListener('pointermove', viewerPanMove);
    stage.removeEventListener('pointerup', viewerPanEnd);
    stage.removeEventListener('pointercancel', viewerPanEnd);
    stage.removeEventListener('pointerleave', viewerPanEnd);
    stage.removeEventListener('wheel', viewerWheel);
  }

  /* Pan: pointer events cover mouse + touch + pen. We capture the pointer
     so a drag that leaves the stage still pans. */
  function viewerPanStart(e) {
    /* Only left mouse button or touch/pen. */
    if (e.pointerType === 'mouse' && e.button !== 0) { return; }
    if (e.target.closest('.viewer-controls')) { return; }
    viewer.panning = true;
    viewer.panStart = { x: e.clientX - viewer.pan.x, y: e.clientY - viewer.pan.y, pid: e.pointerId };
    var stage = $('#viewer-stage');
    if (stage) {
      stage.classList.add('dragging');
      if (stage.setPointerCapture) { try { stage.setPointerCapture(e.pointerId); } catch (e) {} }
    }
  }
  function viewerPanMove(e) {
    if (!viewer.panning) { return; }
    viewer.pan.x = e.clientX - viewer.panStart.x;
    viewer.pan.y = e.clientY - viewer.panStart.y;
    applyViewerTransform();
  }
  function viewerPanEnd() {
    viewer.panning = false;
    var stage = $('#viewer-stage');
    if (stage) { stage.classList.remove('dragging'); }
  }
  function viewerWheel(e) {
    /* Wheel zoom only when ctrl/meta is held — otherwise the user is
       scrolling the page. */
    if (!(e.ctrlKey || e.metaKey)) { return; }
    e.preventDefault();
    viewerZoom(e.deltaY > 0 ? -0.1 : 0.1);
  }

  /* Synthetic download. Renders the current page to a canvas and emits a
     PNG via a data URL. The "processed copy" is the only public artefact;
     no real PDFs are constructed (the prototype is read-only and offline). */
  function viewerDownload() {
    var file = (RK.evidence || []).filter(function (e) { return e.id === viewer.fileId; })[0];
    if (!file) { return; }
    var w = 720, h = 1015; /* matches the A4-ish page at 1× */
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');
    /* Use CSS variable values via getComputedStyle so the export picks up
       the live Quiet Clinic palette (light or dark). */
    var cs = getComputedStyle(document.documentElement);
    var bg = cs.getPropertyValue('--bg').trim() || '#f3eee5';
    var ink = cs.getPropertyValue('--ink').trim() || '#2a1f12';
    var rule = cs.getPropertyValue('--rule-hard').trim() || 'rgba(0,0,0,.34)';
    var faint = cs.getPropertyValue('--ink-faint').trim() || '#665244';
    ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = rule; ctx.lineWidth = 1;
    ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = faint;
    ctx.font = '11px Segoe UI, system-ui, sans-serif';
    ctx.fillText(VT('docHeadA'), 36, 40);
    ctx.textAlign = 'right';
    ctx.fillText(VT('docHeadB'), w - 36, 40);
    ctx.textAlign = 'left';
    ctx.strokeStyle = rule; ctx.beginPath(); ctx.moveTo(36, 56); ctx.lineTo(w - 36, 56); ctx.stroke();
    ctx.fillStyle = ink;
    ctx.font = 'bold 18px Segoe UI, system-ui, sans-serif';
    var p = viewer.pages[viewer.page];
    ctx.fillText(p ? p.kindTitle : '', 36, 96);
    ctx.font = '13px Georgia, serif';
    if (p) {
      var lines = [];
      lines.push(p.title || '');
      (p.kv || []).forEach(function (row) { lines.push(row[0] + ': ' + row[1]); });
      (p.rows || []).forEach(function (row) { lines.push(row.join('  ·  ')); });
      if (p.tail) { lines.push(p.tail); }
      var y = 132;
      lines.forEach(function (line) {
        var trimmed = (line.length > 80 ? line.slice(0, 77) + '…' : line);
        ctx.fillText(trimmed, 36, y);
        y += 22;
      });
    }
    /* Seal */
    ctx.strokeStyle = rule; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(w - 110, h - 110, 60, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = faint;
    ctx.font = '10px Segoe UI, system-ui, sans-serif';
    ctx.textAlign = 'center';
    wrapText(ctx, VT('seal'), w - 110, h - 110, 96, 12);
    ctx.textAlign = 'left';

    var safe = (file.id || 'evidence') + '-processed.png';
    var a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = safe;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
  }

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    var words = text.split(' ');
    var line = '';
    var yy = y;
    for (var i = 0; i < words.length; i++) {
      var test = line + words[i] + ' ';
      if (ctx.measureText(test).width > maxWidth && i > 0) {
        ctx.fillText(line, x, yy); line = words[i] + ' '; yy += lineHeight;
      } else { line = test; }
    }
    ctx.fillText(line, x, yy);
  }

  /* Focus trap — keeps Tab cycling inside the viewer sheet. */
  function trapFocus(container) {
    if (!container) { return; }
    var handler = function (e) {
      if (e.key !== 'Tab') { return; }
      var focusables = $$('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])', container)
        .filter(function (el) { return el.offsetWidth > 0 || el.offsetHeight > 0; });
      if (!focusables.length) { return; }
      var first = focusables[0], last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    container._trapHandler = handler;
    container.addEventListener('keydown', handler);
  }
  function releaseFocusTrap(container) {
    if (!container || !container._trapHandler) { return; }
    container.removeEventListener('keydown', container._trapHandler);
    delete container._trapHandler;
  }


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
        '<button class="btn small ghost block" type="button" data-doctor="' + id + '" style="margin-top:12px">' + esc(T('nav.viewDoctor')) + '</button>' +
      '</div>';
    }).join('');
    openSheet(T('compare.title'),
      '<div class="callout warn" style="margin-bottom:16px"><b>' + esc(T('compare.notRanking')) + '</b></div>' +
      '<div class="compare-grid">' + cols + '</div>');
  }

  // STORY-MOD-001: report sheet with reasons + protected reporter identity
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
    renderEmergency(); renderAbout();
    /* Previously omitted, so switching language on one of these left the page
       in the old language. */
    renderPerson(); renderDoctorIndex(); renderFacilityIndex();
    renderTopicIndex(); renderExperienceIndex(); renderSaved(); renderNotifications();
    renderTray();
    setTitle(titleForView(document.body.getAttribute('data-view')));
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
      /* FR-REA-001: one current reaction. Selecting one clears the other;
         clicking the active one clears it entirely. */
      var rBase = rk.replace(/:(up|down)$/, '');
      var rNext = !state.reactions[rk];
      state.reactions[rBase + ':up'] = false;
      state.reactions[rBase + ':down'] = false;
      state.reactions[rk] = rNext;
      renderAccount(); return;
    }
    if ((el = e.target.closest('[data-person]'))) {
      go('person/' + encodeURIComponent(el.getAttribute('data-person'))); return;
    }
    if ((el = e.target.closest('[data-edit-comment]'))) {
      state.editingComment = el.getAttribute('data-edit-comment'); state.replyTo = null;
      renderAccount(); var eb = $('#edit-text'); if (eb) { eb.focus(); } return;
    }
    if (e.target.closest('[data-cancel-edit]')) { state.editingComment = null; renderAccount(); return; }
    if ((el = e.target.closest('[data-save-comment]'))) {
      var scId = el.getAttribute('data-save-comment');
      var eBox = $('#edit-text'), eText = eBox && eBox.value.trim();
      if (!eText) { if (eBox) { eBox.focus(); } return; }
      state.commentEdits[scId] = eText; state.editingComment = null; renderAccount(); return;
    }
    if ((el = e.target.closest('[data-del-comment]'))) {
      var dcId = el.getAttribute('data-del-comment');
      if (state.commentDeleted.indexOf(dcId) === -1) { state.commentDeleted.push(dcId); }
      state.editingComment = null; renderAccount(); return;
    }
    if ((el = e.target.closest('[data-reply]'))) {
      state.replyTo = el.getAttribute('data-reply'); renderAccount();
      var rb = $('#reply-text'); if (rb) { rb.focus(); rb.selectionStart = rb.value.length; }
      return;
    }
    if (e.target.closest('[data-reply-cancel]')) { state.replyTo = null; renderAccount(); return; }
    if ((el = e.target.closest('[data-post-reply]'))) {
      var prParent = el.getAttribute('data-post-reply');
      var rBox = $('#reply-text'), rText = rBox && rBox.value.trim();
      if (!rText) { if (rBox) { rBox.focus(); } return; }
      var rTarget = state.accountId;
      var mention = rText.match(/^@(\S+)/);
      state.comments[rTarget] = (state.comments[rTarget] || []).concat([{
        id: 'local-' + prParent + '-r' + (state.comments[rTarget] || []).length,
        parentId: prParent,
        author: { en: 'You', bn: 'আপনি' },
        identity: 'pseudo',
        when: { en: 'Just now', bn: 'এইমাত্র' },
        body: { en: rText, bn: rText },
        mentions: mention ? [mention[1]] : [],
        likes: 0
      }]);
      state.replyTo = null; renderAccount(); return;
    }
    if ((el = e.target.closest('[data-bookmark]'))) {
      var bId = el.getAttribute('data-bookmark'), bList = bookmarks(), bAt = bList.indexOf(bId);
      if (bAt === -1) { bList.push(bId); } else { bList.splice(bAt, 1); }
      renderAccount(); return;
    }
    if ((el = e.target.closest('[data-post-comment]'))) {
      var pcId = el.getAttribute('data-post-comment');
      var box = $('#new-comment'), text = box && box.value.trim();
      if (!text) { if (box) { box.focus(); } return; }
      state.comments[pcId] = (state.comments[pcId] || []).concat([{
        id: 'local-' + pcId + '-' + (state.comments[pcId] || []).length,
        author: { en: 'You', bn: 'আপনি' },
        identity: 'pseudo',
        when: { en: 'Just now', bn: 'এইমাত্র' },
        body: { en: text, bn: text },
        likes: 0
      }]);
      renderAccount(); return;
    }
    if ((el = e.target.closest('[data-clike]'))) {
      var clId = el.getAttribute('data-clike');
      state.commentLikes[clId] = !state.commentLikes[clId];
      renderAccount(); return;
    }
    if ((el = e.target.closest('[data-del-pub]'))) {
      state.removedPublished.push(el.getAttribute('data-del-pub')); renderMine(); return;
    }
    if ((el = e.target.closest('[data-restore-pub]'))) {
      var rId = el.getAttribute('data-restore-pub'), rAt = state.removedPublished.indexOf(rId);
      if (rAt !== -1) { state.removedPublished.splice(rAt, 1); }
      renderMine(); return;
    }
    if ((el = e.target.closest('[data-del-draft]'))) {
      state.removedDrafts.push(el.getAttribute('data-del-draft')); renderMine(); return;
    }
    if ((el = e.target.closest('[data-report]'))) { openReport(el.getAttribute('data-report')); return; }
    if (e.target.closest('#rep-send')) { openSheet(T('report.title'), '<p>' + esc(T('report.sent')) + '</p>'); return; }
    if (e.target.closest('#open-appeal')) { openAppeal(); return; }
    if (e.target.closest('#ap-send')) { openSheet(T('appeal.title'), '<p>' + esc(T('appeal.sent')) + '</p>'); return; }
    // STORY-USER-002: feedback + data-request click handlers
    if (e.target.closest('#user-feedback-send')) {
      var ff = $('#user-feedback-flag');
      if (ff) { ff.classList.add('on'); setTimeout(function () { ff.classList.remove('on'); }, 1800); }
      var ta = $('#user-feedback'); if (ta) { ta.value = ''; }
      return;
    }
    if (e.target.closest('#user-data-export') || e.target.closest('#user-data-delete')) {
      var dca = e.target.closest('#user-data-export') ? 'export' : 'delete';
      openSheet(T('user2.data'), '<p class="callout">' + esc(T('user2.dataCallout')) + '</p>' +
        '<p class="note">' + esc(dca === 'export' ? T('user2.dataExportNote') : T('user2.dataDeleteNote')) + '</p>');
      return;
    }
    if (e.target.closest('#pref-lang')) { setLang(state.lang === 'en' ? 'bn' : 'en'); renderMine(); return; }
    if ((el = e.target.closest('[data-view-evidence]'))) { openEvidenceViewer(el.getAttribute('data-view-evidence')); return; }
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
    if ((el = e.target.closest('[data-scheme-pick]'))) { setScheme(el.getAttribute('data-scheme-pick')); return; }
    if (e.target.closest('#theme')) { setTheme(currentIsDark() ? 'light' : 'dark'); return; }
    if (e.target.closest('#motion')) { setMotion(state.motion !== 'on'); return; }
    // STORY-PROT-001: demo controls panel (role + reset)
    if (e.target.closest('#demo')) { var p = $('#demo-panel'); if (p) { p.hidden = !p.hidden; } return; }
    if (e.target.closest('#demo-close')) { var pc = $('#demo-panel'); if (pc) { pc.hidden = true; } return; }
    if ((el = e.target.closest('[data-role]'))) {
      state.role = el.getAttribute('data-role');
      renderCompose();
      try { localStorage.setItem('rk04.role', state.role); } catch (e) {}
      $$('#demo-panel [data-role]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-role') === state.role)); });
      announce('Role: ' + state.role);
      return;
    }
    if (e.target.closest('#demo-reset')) {
      try { localStorage.clear(); } catch (e) {}
      location.reload();
      return;
    }
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
    if (e.key === 'Escape' && !$('#overlay').hidden) {
      if (viewer.open) { closeEvidenceViewer(); }
      else { closeSheet(); }
      return;
    }
    /* Viewer keyboard shortcuts — only when the viewer is the active sheet. */
    if (viewer.open) {
      if (e.key === '+' || e.key === '=') { viewerZoom(0.1); e.preventDefault(); return; }
      if (e.key === '-' || e.key === '_') { viewerZoom(-0.1); e.preventDefault(); return; }
      if (e.key === 'ArrowLeft')  { viewerPage(-1); e.preventDefault(); return; }
      if (e.key === 'ArrowRight') { viewerPage(1);  e.preventDefault(); return; }
      if (e.key === 'r' || e.key === 'R') { viewerRotate(); e.preventDefault(); return; }
    }
  });

  window.addEventListener('hashchange', route);

  (function init() {
    var l, t, m, r;
    try {
      l = localStorage.getItem('rk04.lang');
      t = localStorage.getItem('rk04.theme');
      m = localStorage.getItem('rk04.motion');
      r = localStorage.getItem('rk04.role');
    } catch (e) { /* blocked storage — defaults are fine */ }
    if (r === 'reader' || r === 'contributor' || r === 'moderator') { state.role = r; }
    setTheme(t || null);
    setLang(l === 'bn' ? 'bn' : 'en');
    setMotion(m !== 'off' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    /* Sync role chip aria-pressed */
    $$('#demo-panel [data-role]').forEach(function (b) { b.setAttribute('aria-pressed', String(b.getAttribute('data-role') === state.role)); });
    route();
  })();
})();
