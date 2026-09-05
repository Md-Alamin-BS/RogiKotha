/* Concept 05 — Operator Console */
(function () {
  'use strict';

  var state = {
    lang: 'en', theme: null, motion: 'on',
    query: 'diabetes',
    filters: { sort: 'relevance' },
    doctorId: 'd1', conditionId: null,
    selectedId: 'd1',
    composeMode: 'detailed',
    composeSentiment: null, composeOutcome: null,
    composeIdentity: 'pseudo', composeClaims: [], composeTags: [],
    published: false,
    paletteIndex: 0, paletteItems: []
  };

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var T = function (k) { return RK.t(k, state.lang); };
  var P = function (f) { return RK.pick(f, state.lang); };

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  }

  /* =====================================================================
     Shell
     ===================================================================== */

  function setLang(lang) {
    state.lang = lang;
    RK.applyLang(document, lang);
    $('#lang').setAttribute('aria-pressed', String(lang === 'bn'));
    $('#lang').querySelector('span').textContent = lang === 'bn' ? 'A' : 'অ';
    try { localStorage.setItem('rk05.lang', lang); } catch (e) {}
    renderAll();
  }

  function setTheme(theme) {
    state.theme = theme;
    if (theme) { document.documentElement.setAttribute('data-theme', theme); }
    else { document.documentElement.removeAttribute('data-theme'); }
    try { localStorage.setItem('rk05.theme', theme || ''); } catch (e) {}
  }

  function currentIsDark() {
    if (state.theme) { return state.theme === 'dark'; }
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  function setMotion(on) {
    state.motion = on ? 'on' : 'off';
    document.body.setAttribute('data-motion', state.motion);
    $('#motion').setAttribute('aria-pressed', String(!on));
    try { localStorage.setItem('rk05.motion', state.motion); } catch (e) {}
  }

  var VIEWS = ['discover', 'results', 'profile', 'compose'];

  function route() {
    var v = (location.hash || '#discover').replace('#', '').split('/')[0];
    if (VIEWS.indexOf(v) === -1) { v = 'discover'; }
    document.body.setAttribute('data-view', v);
    VIEWS.forEach(function (n) { var el = $('#view-' + n); if (el) { el.hidden = (n !== v); } });
    $$('.tabs a').forEach(function (a) {
      if (a.getAttribute('data-nav') === v) { a.setAttribute('aria-current', 'page'); }
      else { a.removeAttribute('aria-current'); }
    });
    window.scrollTo(0, 0);
  }

  /* =====================================================================
     Distribution: compact bar for scanning, exact register in the inspector
     ===================================================================== */

  function bar(dist) {
    if (dist.empty) { return '<p class="denominator">' + esc(T('label.notProvided')) + '</p>'; }
    var segs = RK.SENTIMENTS.map(function (k) {
      var pct = dist.pct(k);
      return pct ? '<span class="s-' + k + '" style="--w:' + pct + '%"></span>' : '';
    }).join('');
    var plain = RK.SENTIMENTS.map(function (k) {
      return dist.counts[k] + ' ' + T('sentiment.' + k).toLowerCase();
    }).join(', ') + ' — ' + T('sentiment.of') + ' ' + dist.total + ' ' + T('sentiment.accounts');
    var key = RK.SENTIMENTS.map(function (k) {
      return '<span><i style="background:var(--' + k + ')"></i><b>' + dist.counts[k] + '</b></span>';
    }).join('');
    return '<div class="bar-block">' +
      '<div class="bar" role="img" aria-label="' + esc(plain) + '">' + segs + '</div>' +
      '<div class="bar-key">' + key + '<span>/ ' + dist.total + '</span></div>' +
      (dist.limited ? '<span class="limited">' + esc(T('label.limitedData')) + '</span>' : '') +
    '</div>';
  }

  function register(dist, kind) {
    if (dist.empty) { return '<p class="denominator">' + esc(T('label.notProvided')) + '</p>'; }
    var keys = kind === 'outcome' ? RK.OUTCOMES : RK.SENTIMENTS;
    var prefix = kind === 'outcome' ? 'outcome.' : 'sentiment.';
    return '<table class="reg"><thead><tr>' +
      '<th>' + esc(kind === 'outcome' ? T('filter.outcome') : T('filter.sentiment')) + '</th>' +
      '<th>' + esc(state.lang === 'bn' ? 'সংখ্যা' : 'Count') + '</th></tr></thead><tbody>' +
      keys.map(function (k) {
        return '<tr><td>' + esc(T(prefix + k)) + '</td><td>' + dist.counts[k] + ' / ' + dist.total + '</td></tr>';
      }).join('') + '</tbody></table>' +
      '<p class="denominator">' + esc(kind === 'outcome' ? T('outcome.selfReported') : T('sentiment.title')) + '</p>' +
      (dist.limited ? '<span class="limited">' + esc(T('label.limitedData')) + ' — ' + esc(T('label.limitedDataWhy')) + '</span>' : '');
  }

  function badge(cls, text) { return '<span class="badge ' + cls + '">' + esc(text) + '</span>'; }

  /* =====================================================================
     Discover
     ===================================================================== */

  function renderDiscover() {
    var chips = $('#suggest-chips');
    if (chips) {
      chips.innerHTML = RK.conditions.slice(0, 5).map(function (c) {
        return '<button class="chip" type="button" data-q="' + esc(P(c.name)) + '">' + esc(P(c.name)) + '</button>';
      }).join('');
    }
    var stream = $('#recent-stream');
    if (stream) {
      stream.innerHTML = RK.reviews.slice(0, 6).map(function (r) {
        var d = RK.doctorById(r.doctorId);
        return '<article class="recent-item">' +
          '<h4>' + esc(P(r.title)) + '</h4>' +
          '<p class="meta"><span>' + esc(P(d.name)) + '</span><span>' + esc(P(r.period)) + '</span>' +
          '<span>' + esc(T('outcome.' + r.outcome)) + '</span></p>' +
        '</article>';
      }).join('');
    }
  }

  /* =====================================================================
     Results + inspector
     ===================================================================== */

  var FILTER_DEFS = [
    { key: 'specialty', label: 'filter.specialty', options: function () {
        return RK.doctors.map(function (d) { return { v: d.specialty.en, l: P(d.specialty) }; }); } },
    { key: 'city', label: 'filter.location', options: function () {
        return RK.doctors.map(function (d) { return { v: d.city.en, l: P(d.city) }; }); } },
    { key: 'sentiment', label: 'filter.sentiment', options: function () {
        return RK.SENTIMENTS.map(function (s) { return { v: s, l: T('sentiment.' + s) }; }); } },
    { key: 'outcome', label: 'filter.outcome', options: function () {
        return RK.OUTCOMES.map(function (o) { return { v: o, l: T('outcome.' + o) }; }); } },
    { key: 'gender', label: 'filter.gender', options: function () {
        return [{ v: 'female', l: state.lang === 'bn' ? 'নারী' : 'Female' },
                { v: 'male', l: state.lang === 'bn' ? 'পুরুষ' : 'Male' }]; } }
  ];

  function renderFilters() {
    var host = $('#filter-fields');
    if (!host) { return; }
    host.innerHTML = FILTER_DEFS.map(function (f) {
      var seen = {};
      var opts = f.options().filter(function (o) { if (seen[o.v]) { return false; } seen[o.v] = 1; return true; });
      return '<div class="fset"><span>' + esc(T(f.label)) + '</span>' +
        '<select data-filter="' + f.key + '"><option value="">' + esc(T('filter.any')) + '</option>' +
        opts.map(function (o) {
          return '<option value="' + esc(o.v) + '"' + (state.filters[f.key] === o.v ? ' selected' : '') + '>' + esc(o.l) + '</option>';
        }).join('') + '</select></div>';
    }).join('');
  }

  function renderResults() {
    var res = RK.search(state.query, state.filters);

    var head = $('.query-line');
    if (head) {
      head.innerHTML = state.query
        ? esc(T('search.didYouMean')) + ' <em>' + esc(state.query) + '</em>'
        : esc(T('nav.results'));
    }

    var note = $('#resolved-note');
    if (note) {
      if (res.resolved.condition && res.resolved.matched &&
          String(res.resolved.matched).toLowerCase() !== String(state.query).toLowerCase()) {
        note.innerHTML = esc(P(res.resolved.condition.name)) + ' — ' + esc(T('search.alsoSearched')) +
          ' “' + esc(res.resolved.matched) + '”. <button type="button" id="keep-exact">' + esc(T('search.keepOriginal')) + '</button>';
      } else if (res.resolved.condition) { note.textContent = P(res.resolved.condition.name); }
      else { note.textContent = ''; }
    }

    var count = $('#result-count');
    if (count) { count.textContent = res.doctors.length + ' ' + T('results.count'); }

    var list = $('#result-list');
    if (list) {
      if (!res.doctors.length) {
        list.innerHTML = '<div class="empty-state"><h3>' + esc(T('results.none')) + '</h3><p>' + esc(T('results.noneBody')) + '</p></div>';
      } else {
        if (res.doctors.map(function (d) { return d.id; }).indexOf(state.selectedId) === -1) {
          state.selectedId = res.doctors[0].id;
        }
        list.innerHTML = res.doctors.map(function (d) {
          return '<button class="row" type="button" data-select="' + d.id + '" aria-selected="' + (state.selectedId === d.id) + '">' +
            '<span class="row-av">' + RK.avatar(d.name.en, d.accent, 44) + '</span>' +
            '<span>' +
              '<h3>' + esc(P(d.name)) + '</h3>' +
              '<p class="sub">' + esc(P(d.specialty)) + ' / ' + esc(P(d.area)) + ', ' + esc(P(d.city)) + '</p>' +
              '<span class="flags">' +
                badge('warn', T('label.notVerified')) +
                (RK.evidenceCount(d.id) ? badge('plain', RK.evidenceCount(d.id) + ' doc')
                                        : badge('plain', T('label.noDocuments'))) +
              '</span>' +
            '</span>' +
            '<span>' + bar(RK.sentimentOf(RK.reviewsFor(d.id))) + '</span>' +
          '</button>';
        }).join('');
      }
    }
    renderInspector();
  }

  function renderInspector() {
    var host = $('#inspector');
    if (!host) { return; }
    var d = RK.doctorById(state.selectedId);
    if (!d) { host.innerHTML = '<p class="inspect-empty">' + esc(T('results.none')) + '</p>'; return; }

    var all = RK.reviewsFor(d.id);
    var conds = RK.conditionsFor(d.id);

    host.innerHTML =
      '<div class="inspect-head">' +
        '<span class="inspect-av">' + RK.avatar(d.name.en, d.accent, 52) + '</span>' +
        '<span><h3>' + esc(P(d.name)) + '</h3><p class="sub">' + esc(P(d.specialty)) + '</p></span>' +
      '</div>' +

      '<div class="inspect-section">' + register(RK.sentimentOf(all)) + '</div>' +
      '<div class="inspect-section">' + register(RK.outcomeOf(all), 'outcome') + '</div>' +

      '<div class="inspect-section">' +
        '<span class="pane-label">' + esc(T('profile.conditions')) + '</span>' +
        '<table class="reg"><tbody>' + conds.map(function (c) {
          return '<tr><td>' + esc(P(c.condition.name)) + '</td><td>' + c.count + '</td></tr>';
        }).join('') + '</tbody></table>' +
      '</div>' +

      '<div class="inspect-section">' +
        '<span class="pane-label">' + esc(T('prov.title')) + '</span>' +
        '<table class="reg"><tbody>' +
          '<tr><td>' + esc(T('profile.bmdc')) + '</td><td>' + esc(d.bmdc) + '</td></tr>' +
          '<tr><td>' + esc(T('profile.fee')) + '</td><td>' + esc(P(d.fee)) + '</td></tr>' +
          '<tr><td>' + esc(T('profile.languages')) + '</td><td>' + esc(P(d.languages)) + '</td></tr>' +
        '</tbody></table>' +
        '<p class="denominator">' + esc(T('label.notVerifiedWhy')) + '</p>' +
      '</div>' +

      '<button class="btn block" type="button" data-doctor="' + d.id + '">' + esc(T('review.readFull')) + '</button>';
  }

  /* =====================================================================
     Profile
     ===================================================================== */

  var TIMELINE_KEYS = { symptoms: 'compose.symptoms', diagnosis: 'compose.diagnosis', treatment: 'compose.treatment', after: 'compose.after' };

  function renderProfile() {
    var host = $('#profile-root');
    if (!host) { return; }
    var d = RK.doctorById(state.doctorId);
    if (!d) { return; }

    var all = RK.reviewsFor(d.id);
    var shown = RK.reviewsFor(d.id, state.conditionId);
    var conds = RK.conditionsFor(d.id);

    var facts = [
      { k: T('profile.bmdc'), v: d.bmdc, p: d.provenance.bmdc },
      { k: T('profile.specialty'), v: P(d.specialty), p: d.provenance.specialty },
      { k: T('profile.qualifications'), v: P(d.qualifications), p: d.provenance.qualifications },
      { k: T('profile.languages'), v: P(d.languages), p: 'community' },
      { k: T('profile.fee'), v: P(d.fee), p: d.provenance.fee }
    ];

    host.innerHTML =
      '<div class="p-grid">' +
        '<section class="pane">' +
          '<span class="pane-label">03 / ' + esc(T('nav.profile')) + '</span>' +
          '<div class="p-head">' +
            '<span class="p-av">' + RK.avatar(d.name.en, d.accent, 88) + '</span>' +
            '<div>' +
              '<h1>' + esc(P(d.name)) + '</h1>' +
              '<p class="p-spec">' + esc(P(d.specialty)) + ' / ' + esc(P(d.area)) + ', ' + esc(P(d.city)) + '</p>' +
              '<div class="p-flags">' +
                '<span class="badge warn" title="' + esc(T('label.notVerifiedWhy')) + '">' + esc(T('label.notVerified')) + '</span>' +
                badge('plain', all.length + ' ' + T('profile.accounts').toLowerCase()) +
              '</div>' +
            '</div>' +
          '</div>' +

          '<div class="cond-switch">' +
            '<button type="button" data-cond="" aria-pressed="' + (!state.conditionId) + '">' + esc(T('profile.allConditions')) + ' (' + all.length + ')</button>' +
            conds.map(function (c) {
              return '<button type="button" data-cond="' + c.condition.id + '" aria-pressed="' + (state.conditionId === c.condition.id) + '">' +
                esc(P(c.condition.name)) + ' (' + c.count + ')</button>';
            }).join('') +
          '</div>' +

          shown.map(entryHtml).join('') +
        '</section>' +

        '<aside class="pane pane-inspect">' +
          '<span class="pane-label">' + esc(T('sentiment.title')) + '</span>' +
          '<div class="inspect-section">' + register(RK.sentimentOf(shown)) + '</div>' +
          '<div class="inspect-section">' + register(RK.outcomeOf(shown), 'outcome') + '</div>' +
          '<div class="inspect-section">' +
            '<span class="pane-label">' + esc(T('prov.title')) + '</span>' +
            '<table class="reg"><tbody>' + facts.map(function (f) {
              return '<tr><td>' + esc(f.k) + '</td><td>' + esc(f.v) + '<br><span class="badge plain">' + esc(T('prov.' + f.p)) + '</span></td></tr>';
            }).join('') + '</tbody></table>' +
          '</div>' +
          '<div class="inspect-section">' +
            '<span class="pane-label">' + esc(T('profile.chambers')) + '</span>' +
            '<table class="reg"><tbody>' + d.chambers.map(function (ch) {
              return '<tr><td>' + esc(P(ch.name)) + '</td><td>' + esc(P(ch.hours)) + '</td></tr>';
            }).join('') + '</tbody></table>' +
            '<p class="denominator">' + esc(T('profile.facilitySep')) + '</p>' +
          '</div>' +
          '<button class="btn block" type="button" data-goto="compose">' + esc(T('profile.write')) + '</button>' +
        '</aside>' +
      '</div>';
  }

  function entryHtml(r) {
    var claims = (r.claims || []).map(function (c) {
      return '<span class="reviewer-label"><b>' + esc(T('claim.' + c)) + '</b><i>' + esc(T('label.reviewerLabel')) + '</i></span>';
    }).join(' ');

    var timeline = r.timeline
      ? '<ul class="timeline">' + r.timeline.map(function (t) {
          return '<li><span class="k">' + esc(T(TIMELINE_KEYS[t.k] || 'review.readFull')) + '</span>' +
            '<p>' + esc(state.lang === 'bn' ? t.bn : t.en) + '</p></li>';
        }).join('') + '</ul>' : '';

    var followUp = r.followUp
      ? '<div class="followup"><span class="k">' + esc(T('label.followUp')) + ' · ' + esc(P(r.followUp.date)) + '</span>' +
        esc(state.lang === 'bn' ? r.followUp.bn : r.followUp.en) + '</div>' : '';

    var evidence = r.evidence
      ? '<div class="evidence"><b>' + esc(T('evidence.status')) + '</b><span>' + esc(T('evidence.notice')) + '</span>' +
        '<span class="files">' + Array.apply(null, Array(r.evidence)).map(function (_, i) {
          return '<span class="file">' + esc(T('evidence.group.reviewed')) + ' ' + (i + 1) + '</span>';
        }).join('') + '</span></div>' : '';

    return '<article class="entry">' +
      '<header><h3>' + esc(P(r.title)) + '</h3>' +
        badge(r.sentiment, T('sentiment.' + r.sentiment)) +
        badge('plain', T('outcome.' + r.outcome)) + '</header>' +
      '<p class="who">' +
        '<span>' + esc(T('rel.' + r.relationship)) + '</span>' +
        '<span>' + esc(P(r.author)) + '</span>' +
        '<span>' + esc(P(r.period)) + '</span>' +
        '<span>' + esc(P(r.posted)) + '</span>' +
      '</p>' +
      (claims ? '<p style="margin:0 0 10px">' + claims + '</p>' : '') +
      '<p class="story">' + esc(P(r.body)) + '</p>' +
      timeline + followUp + evidence +
      '<div class="tags">' + r.tags.map(function (t) {
        return '<span class="tag">' + esc(state.lang === 'bn' ? t.bn : t.en) + '</span>';
      }).join('') + '</div>' +
      '<div class="reactions">' +
        '<button class="react" type="button" data-react="up">' + esc(T('review.helpful')) + ' ' + r.likes + '</button>' +
        '<button class="react" type="button" data-react="down">' + esc(T('review.notHelpful')) + ' ' + r.dislikes + '</button>' +
        '<button class="react" type="button">' + esc(T('review.comments')) + ' ' + r.comments + '</button>' +
        '<button class="react" type="button">' + esc(T('review.report')) + '</button>' +
      '</div>' +
      '<p class="denominator" style="margin-top:9px">' + esc(T('review.reactionNote')) + '</p>' +
    '</article>';
  }

  /* =====================================================================
     Compose
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

  function renderCompose() {
    var host = $('#compose-root');
    if (!host) { return; }
    var detailed = state.composeMode === 'detailed';

    var storyFields = detailed
      ? ['compose.symptoms', 'compose.diagnosis', 'compose.treatment', 'compose.after'].map(function (k) {
          return '<div class="field"><label for="f-' + k + '">' + esc(T(k)) + '</label><textarea id="f-' + k + '"></textarea></div>';
        }).join('')
      : '<div class="field"><label for="f-story">' + esc(T('compose.story')) + '<span class="req">' + esc(T('compose.required')) + '</span></label>' +
        '<p class="sub">' + esc(T('compose.storyHint')) + '</p><textarea id="f-story" style="min-height:160px"></textarea></div>';

    host.innerHTML =
      '<div class="c-grid">' +
        '<section class="pane">' +
          '<span class="pane-label">04 / ' + esc(T('nav.compose')) + '</span>' +
          '<h1 style="font-size:clamp(22px,3vw,32px)">' + esc(T('compose.title')) + '</h1>' +
          '<p class="lede">' + esc(T('compose.intro')) + '</p>' +

          '<div class="c-modes">' +
            '<button class="c-mode" type="button" data-mode="quick" aria-pressed="' + (!detailed) + '">' +
              '<b>' + esc(T('compose.mode.quick')) + '</b><span>' + esc(T('compose.mode.quickHint')) + '</span></button>' +
            '<button class="c-mode" type="button" data-mode="detailed" aria-pressed="' + detailed + '">' +
              '<b>' + esc(T('compose.mode.detailed')) + '</b><span>' + esc(T('compose.mode.detailedHint')) + '</span></button>' +
          '</div>' +

          '<div class="field"><label for="f-doctor">' + esc(T('compose.doctor')) + '<span class="req">' + esc(T('compose.required')) + '</span></label>' +
            '<select id="f-doctor">' + RK.doctors.map(function (d) {
              return '<option' + (d.id === state.doctorId ? ' selected' : '') + '>' + esc(P(d.name)) + ' — ' + esc(P(d.specialty)) + '</option>';
            }).join('') + '</select>' +
            '<p class="sub" style="margin-top:8px">' + esc(T('compose.doctorMissing')) + ' — ' + esc(T('compose.doctorMissingNote')) + '</p></div>' +

          '<div class="field"><span class="lbl">' + esc(T('compose.relationship')) + '<span class="req">' + esc(T('compose.required')) + '</span></span>' +
            '<div class="opt-row">' + ['self', 'parent', 'family', 'witness'].map(function (r) {
              return '<button class="opt" type="button" data-rel="' + r + '" aria-pressed="' + (r === 'self') + '">' + esc(T('rel.' + r)) + '</button>';
            }).join('') + '</div></div>' +

          '<div class="field"><label for="f-period">' + esc(T('compose.period')) + '</label>' +
            '<p class="sub">' + esc(T('compose.periodNote')) + '</p>' +
            '<input id="f-period" type="text" value="' + (state.lang === 'bn' ? 'মার্চ ২০২৬' : 'March 2026') + '"></div>' +

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
              return '<button class="opt" type="button" data-out="' + o + '" aria-pressed="' + (state.composeOutcome === o) + '">' +
                esc(T('outcome.' + o)) + '</button>';
            }).join('') + '</div></div>' +

          '<div class="field"><span class="lbl">' + esc(T('compose.claims')) + ' — ' + esc(T('compose.optional')) + '</span>' +
            '<p class="sub">' + esc(T('compose.claimsNote')) + '</p>' +
            '<div class="opt-row">' + ['wrongDx', 'wrongRx', 'secondOpinion'].map(function (c) {
              return '<button class="opt" type="button" data-claim="' + c + '" aria-pressed="' + (state.composeClaims.indexOf(c) !== -1) + '">' +
                esc(T('claim.' + c)) + '</button>';
            }).join('') + '</div></div>' +

          '<div class="field"><span class="lbl">' + esc(T('compose.identity')) + '</span>' +
            '<div class="opt-row">' + [['real', 'compose.identity.real'], ['pseudo', 'compose.identity.pseudo'], ['anon', 'compose.identity.anon']].map(function (p) {
              return '<button class="opt" type="button" data-ident="' + p[0] + '" aria-pressed="' + (state.composeIdentity === p[0]) + '">' +
                esc(T(p[1])) + '</button>';
            }).join('') + '</div>' +
            (state.composeIdentity === 'anon' ? '<span class="limited">' + esc(T('compose.identity.anonNote')) + '</span>' : '') +
          '</div>' +

          '<div class="field"><span class="lbl">' + esc(T('compose.evidence')) + ' — ' + esc(T('compose.optional')) + '</span>' +
            '<p class="sub">' + esc(T('compose.evidenceOptional')) + '</p>' +
            '<div class="redact"><b>' + esc(T('compose.redact')) + '</b><span>' + esc(T('compose.redactBody')) + '</span>' +
              '<div class="redact-canvas" id="redact" role="application" aria-label="' + esc(T('compose.redactTool')) + '"></div>' +
              '<p class="redact-hint">' + esc(T('compose.redactTool')) + '</p></div></div>' +

          '<div class="field" style="margin-bottom:0">' +
            '<span class="lbl">' + esc(T('compose.confirmTitle')) + '</span>' +
            '<div class="checks">' + ['compose.confirm1', 'compose.confirm2', 'compose.confirm3', 'compose.age'].map(function (k, i) {
              return '<label class="check"><input type="checkbox" data-confirm="' + i + '"><span>' + esc(T(k)) + '</span></label>';
            }).join('') + '</div>' +
            '<button class="btn" type="button" id="publish">' + esc(T('compose.publish')) + '</button>' +
            '<p class="denominator" style="margin-top:12px">' + esc(T('compose.publishedNote')) + '</p>' +
            (state.published ? '<div class="published-note">' + esc(T('compose.publishedNote')) + '</div>' : '') +
          '</div>' +
        '</section>' +

        '<aside class="pane pane-inspect">' +
          '<span class="pane-label">' + esc(T('compose.preview')) + '</span>' +
          '<div class="preview-card" id="preview"></div>' +
          '<div class="inspect-section" style="margin-top:16px">' +
            '<p class="denominator">' + esc(T('disclaimer.long')) + '</p>' +
          '</div>' +
        '</aside>' +
      '</div>';

    renderPreview();
    buildRedactDoc();
  }

  function renderPreview() {
    var host = $('#preview');
    if (!host) { return; }
    var d = RK.doctorById(state.doctorId);
    var who = state.composeIdentity === 'anon' ? T('compose.identity.anon')
      : (state.composeIdentity === 'real' ? (state.lang === 'bn' ? 'আপনার নাম' : 'Your name') : 'your_username');

    host.innerHTML =
      '<table class="reg"><tbody>' +
        '<tr><td>' + esc(state.lang === 'bn' ? 'পরিচয়' : 'Identity') + '</td><td>' + esc(who) + '</td></tr>' +
        '<tr><td>' + esc(T('nav.profile')) + '</td><td>' + esc(P(d.name)) + '</td></tr>' +
        '<tr><td>' + esc(T('filter.sentiment')) + '</td><td>' +
          (state.composeSentiment ? esc(T('sentiment.' + state.composeSentiment)) : esc(T('label.notProvided'))) + '</td></tr>' +
        '<tr><td>' + esc(T('filter.outcome')) + '</td><td>' +
          (state.composeOutcome ? esc(T('outcome.' + state.composeOutcome)) : esc(T('label.notProvided'))) + '</td></tr>' +
        '<tr><td>' + esc(T('filter.evidence')) + '</td><td>' + esc(T('label.noDocuments')) + '</td></tr>' +
      '</tbody></table>' +
      (state.composeClaims.length ? '<p style="margin-top:10px">' + state.composeClaims.map(function (c) {
        return '<span class="reviewer-label">' + esc(T('claim.' + c)) + '</span>';
      }).join(' ') + '</p>' : '') +
      (state.composeTags.length ? '<div class="tags">' + state.composeTags.map(function (t) {
        return '<span class="tag">' + esc(t === 'notsure' ? T('compose.notSure') : t.split(':')[1]) + '</span>';
      }).join('') + '</div>' : '');
  }

  function buildRedactDoc() {
    var host = $('#redact');
    if (!host) { return; }
    var lines = '', seed = 53;
    for (var i = 0; i < 14; i++) {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      lines += '<span class="doc-line" style="left:8%;top:' + (7 + i * 6.2) + '%;width:' + (24 + (seed % 60)) + '%"></span>';
    }
    host.innerHTML = lines;

    var drawing = false, start = null, box = null;
    host.addEventListener('pointerdown', function (e) {
      drawing = true;
      var r = host.getBoundingClientRect();
      start = { x: e.clientX - r.left, y: e.clientY - r.top };
      box = document.createElement('span');
      box.className = 'mask';
      host.appendChild(box);
      host.setPointerCapture(e.pointerId);
    });
    host.addEventListener('pointermove', function (e) {
      if (!drawing || !box) { return; }
      var r = host.getBoundingClientRect();
      var x = e.clientX - r.left, y = e.clientY - r.top;
      box.style.left = Math.min(x, start.x) + 'px';
      box.style.top = Math.min(y, start.y) + 'px';
      box.style.width = Math.abs(x - start.x) + 'px';
      box.style.height = Math.abs(y - start.y) + 'px';
    });
    host.addEventListener('pointerup', function () { drawing = false; box = null; });
  }

  /* =====================================================================
     Command palette
     Keyboard is a shortcut, never the only route: every entry below also
     exists as a visible control somewhere on the page.
     ===================================================================== */

  function paletteCommands() {
    var cmds = VIEWS.map(function (v) {
      return { label: T('nav.' + v), hint: 'go', run: function () { go(v); } };
    });
    cmds.push({ label: T('a11y.theme'), hint: 'toggle', run: function () { setTheme(currentIsDark() ? 'light' : 'dark'); } });
    cmds.push({ label: T('a11y.lang'), hint: 'toggle', run: function () { setLang(state.lang === 'en' ? 'bn' : 'en'); } });
    cmds.push({ label: T('a11y.motion'), hint: 'toggle', run: function () { setMotion(state.motion !== 'on'); } });
    RK.doctors.forEach(function (d) {
      cmds.push({
        label: P(d.name) + ' — ' + P(d.specialty), hint: 'open',
        run: function () { state.doctorId = d.id; state.conditionId = null; renderProfile(); go('profile'); }
      });
    });
    return cmds;
  }

  function openPalette() {
    var pal = $('#palette');
    pal.hidden = false;
    var input = $('#palette-input');
    input.value = '';
    state.paletteIndex = 0;
    filterPalette('');
    input.focus();
  }

  function closePalette() {
    $('#palette').hidden = true;
    var opener = $('#cmd-open');
    if (opener) { opener.focus(); }
  }

  function filterPalette(q) {
    var low = q.toLowerCase();
    state.paletteItems = paletteCommands().filter(function (c) {
      return !low || c.label.toLowerCase().indexOf(low) !== -1;
    });
    if (state.paletteIndex >= state.paletteItems.length) { state.paletteIndex = 0; }
    $('#palette-list').innerHTML = state.paletteItems.map(function (c, i) {
      return '<li role="option" aria-selected="' + (i === state.paletteIndex) + '">' +
        '<button type="button" data-cmd="' + i + '">' + esc(c.label) +
        '<span class="k">' + esc(c.hint) + '</span></button></li>';
    }).join('');
  }

  document.addEventListener('keydown', function (e) {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if ($('#palette').hidden) { openPalette(); } else { closePalette(); }
      return;
    }
    if ($('#palette').hidden) { return; }
    if (e.key === 'Escape') { closePalette(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      var n = state.paletteItems.length;
      if (!n) { return; }
      state.paletteIndex = (state.paletteIndex + (e.key === 'ArrowDown' ? 1 : -1) + n) % n;
      filterPalette($('#palette-input').value);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      var item = state.paletteItems[state.paletteIndex];
      if (item) { closePalette(); item.run(); }
    }
  });

  /* =====================================================================
     Events
     ===================================================================== */

  function renderAll() { renderDiscover(); renderFilters(); renderResults(); renderProfile(); renderCompose(); }
  function go(v) { if (location.hash === '#' + v) { route(); } else { location.hash = '#' + v; } }

  document.addEventListener('input', function (e) {
    if (e.target.id === 'palette-input') { state.paletteIndex = 0; filterPalette(e.target.value); }
  });

  document.addEventListener('click', function (e) {
    var el;

    if ((el = e.target.closest('[data-cmd]'))) {
      var item = state.paletteItems[Number(el.getAttribute('data-cmd'))];
      closePalette();
      if (item) { item.run(); }
      return;
    }
    if (e.target.closest('#cmd-open')) { openPalette(); return; }
    if (e.target.id === 'palette') { closePalette(); return; }

    if ((el = e.target.closest('[data-q]'))) {
      state.query = el.getAttribute('data-q');
      var i = $('#q'); if (i) { i.value = state.query; }
      renderResults(); go('results'); return;
    }
    if ((el = e.target.closest('[data-select]'))) {
      state.selectedId = el.getAttribute('data-select');
      renderResults(); return;
    }
    if ((el = e.target.closest('[data-doctor]'))) {
      state.doctorId = el.getAttribute('data-doctor'); state.conditionId = null;
      renderProfile(); go('profile'); return;
    }
    if ((el = e.target.closest('[data-goto]'))) { go(el.getAttribute('data-goto')); return; }
    if ((el = e.target.closest('[data-cond]'))) { state.conditionId = el.getAttribute('data-cond') || null; renderProfile(); return; }
    if (e.target.closest('#keep-exact')) { renderResults(); return; }
    if (e.target.closest('#clear-filters')) { state.filters = { sort: state.filters.sort }; renderFilters(); renderResults(); return; }
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
      var c = el.getAttribute('data-claim'), ci = state.composeClaims.indexOf(c);
      if (ci === -1) { state.composeClaims.push(c); } else { state.composeClaims.splice(ci, 1); }
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
    if ((el = e.target.closest('[data-react]'))) {
      el.setAttribute('aria-pressed', String(el.getAttribute('aria-pressed') !== 'true')); return;
    }
    if (e.target.closest('#publish')) { state.published = true; renderCompose(); return; }
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
    if (el.id === 'f-doctor') { state.doctorId = RK.doctors[el.selectedIndex].id; renderPreview(); }
  });

  document.addEventListener('submit', function (e) {
    if (e.target.id === 'search-form') {
      e.preventDefault();
      state.query = $('#q').value.trim();
      renderResults(); go('results');
    }
  });

  window.addEventListener('hashchange', route);

  (function init() {
    var l, t, m;
    try { l = localStorage.getItem('rk05.lang'); t = localStorage.getItem('rk05.theme'); m = localStorage.getItem('rk05.motion'); } catch (e) {}
    setTheme(t || null);
    setLang(l === 'bn' ? 'bn' : 'en');
    setMotion(m !== 'off' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    var i = $('#q'); if (i) { i.value = state.query; }
    route();
  })();
})();
