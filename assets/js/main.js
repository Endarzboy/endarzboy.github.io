/* Small, dependency-free enhancements. The site works without JS; this adds
   the theme toggle, mobile menu, publication filters, BibTeX copy,
   upcoming/past event sorting and the live GitHub repository list. */
(function () {
  'use strict';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* ---------- theme toggle ---------- */
  var themeBtn = $('.theme-toggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
    });
  }

  /* ---------- mobile nav ---------- */
  var navBtn = $('.nav-toggle');
  if (navBtn) {
    navBtn.addEventListener('click', function () {
      var open = document.body.classList.toggle('nav-open');
      navBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  /* ---------- BibTeX toggle + copy ---------- */
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest ? ev.target.closest('[data-toggle-bib], [data-copy-bib]') : null;
    if (!t) return;
    var pub = t.closest('.pub');
    var box = pub && $('.pub-bib', pub);
    if (!box) return;
    if (t.hasAttribute('data-toggle-bib')) {
      var show = box.hasAttribute('hidden');
      if (show) box.removeAttribute('hidden'); else box.setAttribute('hidden', '');
      t.setAttribute('aria-expanded', show ? 'true' : 'false');
    } else {
      var text = $('code', box).textContent;
      var label = $('span', t);
      var done = function () {
        t.classList.add('done'); if (label) label.textContent = 'Copied';
        setTimeout(function () { t.classList.remove('done'); if (label) label.textContent = 'Copy'; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
      } else { fallbackCopy(text); done(); }
    }
  });
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); } catch (e) {}
    document.body.removeChild(ta);
  }

  /* ---------- publication filters (type + selected) ---------- */
  var controls = $('[data-pub-controls]');
  if (controls) {
    var state = { type: 'all', selected: false };
    var pubs = $$('[data-pub-list] .pub');
    var emptyEl = $('[data-pub-empty]');
    var apply = function () {
      var shown = 0;
      pubs.forEach(function (el) {
        var ok = (state.type === 'all' || el.dataset.type === state.type) &&
                 (!state.selected || el.dataset.selected === 'true');
        if (ok) { el.removeAttribute('hidden'); shown++; } else { el.setAttribute('hidden', ''); }
      });
      if (emptyEl) { if (shown) emptyEl.setAttribute('hidden', ''); else emptyEl.removeAttribute('hidden'); }
    };
    controls.addEventListener('click', function (ev) {
      var b = ev.target.closest('button'); if (!b) return;
      if (b.hasAttribute('data-filter-type')) {
        state.type = b.dataset.filterType;
        $$('[data-filter-type]', controls).forEach(function (x) { x.classList.toggle('active', x === b); });
      } else if (b.hasAttribute('data-filter-selected')) {
        state.selected = !state.selected; b.setAttribute('aria-pressed', state.selected ? 'true' : 'false');
      } else return;
      apply();
    });
    // Hide type buttons that have no publications (e.g. no preprints yet)
    $$('[data-filter-type]', controls).forEach(function (b) {
      var t = b.dataset.filterType;
      if (t !== 'all' && !pubs.some(function (p) { return p.dataset.type === t; })) b.setAttribute('hidden', '');
    });
  }

  /* ---------- figure lightbox ---------- */
  var box = null;
  var closeBox = function () { if (box) { box.classList.remove('open'); document.body.style.overflow = ''; } };
  document.addEventListener('click', function (ev) {
    var t = ev.target.closest ? ev.target.closest('[data-zoom]') : null;
    if (t) {
      if (!box) {
        box = document.createElement('div');
        box.className = 'lightbox'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true');
        box.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close">&times;</button><img alt="">';
        box.addEventListener('click', function (e) { if (e.target === box || e.target.closest('.lightbox-close')) closeBox(); });
        document.body.appendChild(box);
      }
      var img = $('img', box);
      img.src = t.dataset.zoom; img.alt = ($('img', t) || {}).alt || '';
      box.classList.add('open'); document.body.style.overflow = 'hidden';
      $('.lightbox-close', box).focus();
    }
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeBox(); });

  /* ---------- upcoming vs past events (decided in the visitor's browser) ---------- */
  var upList = $('[data-events-upcoming]');
  if (upList) {
    var today = new Date(); today.setHours(0, 0, 0, 0);
    var pastList = $('[data-events-past]');
    var parse = function (s) { var p = (s || '').split('-'); return new Date(+p[0], (+p[1] || 1) - 1, +p[2] || 1); };
    var past = [];
    $$('.event', upList).forEach(function (ev) {
      if (parse(ev.dataset.end) < today) { past.push(ev); ev.parentNode.removeChild(ev); }
    });
    if (pastList && past.length) {
      past.reverse().forEach(function (ev) { pastList.appendChild(ev); });
      var ps = $('[data-past-section]'); if (ps) ps.removeAttribute('hidden');
    }
    var hasUp = $$('.event', upList).length > 0;
    var upSection = $('[data-upcoming-section]');           // home page
    if (upSection && hasUp) upSection.removeAttribute('hidden');
    var none = $('[data-events-none]');                     // news page
    if (none && !hasUp) none.removeAttribute('hidden');
  }

  /* ---------- GitHub: star counts + repository list (Projects page) ---------- */
  var gh = $('[data-gh-section]');
  if (gh && window.fetch) {
    var user = gh.dataset.ghUser;
    var key = 'gh-repos-' + user, cached = null;
    try { cached = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (e) {}
    var render = function (repos) {
      var featured = $$('[data-repo]').map(function (c) { return c.dataset.repo.toLowerCase(); });
      var excluded = (gh.dataset.ghExclude || '').toLowerCase().split(',').filter(Boolean);
      // star counts on featured cards
      $$('[data-repo]').forEach(function (card) {
        var full = card.dataset.repo;
        var s = $('[data-stats]', card);
        if (!s) return;
        var show = function (n) { $('[data-stars]', s).textContent = n; s.removeAttribute('hidden'); };
        var r = repos.filter(function (x) { return x.full_name.toLowerCase() === full.toLowerCase(); })[0];
        if (r) { show(r.stargazers_count); return; }
        // Repos owned by others (e.g. an organization like CVML-KU): look them up individually.
        var ck = 'gh-repo-' + full, c = null;
        try { c = JSON.parse(sessionStorage.getItem(ck) || 'null'); } catch (e) {}
        if (c) { show(c); return; }
        fetch('https://api.github.com/repos/' + full)
          .then(function (res) { return res.ok ? res.json() : null; })
          .then(function (d) {
            if (!d || typeof d.stargazers_count !== 'number') return;
            try { sessionStorage.setItem(ck, JSON.stringify(d.stargazers_count)); } catch (e) {}
            show(d.stargazers_count);
          })
          .catch(function () {});
      });
      var list = $('[data-gh-list]', gh);
      var rest = repos.filter(function (r) {
        return !r.fork && !r.archived && excluded.indexOf(r.name.toLowerCase()) === -1 && featured.indexOf(r.full_name.toLowerCase()) === -1 &&
               r.name.toLowerCase() !== (user + '.github.io').toLowerCase() && r.name.toLowerCase() !== user.toLowerCase();
      }).sort(function (a, b) { return (b.stargazers_count - a.stargazers_count) || (new Date(b.pushed_at) - new Date(a.pushed_at)); });
      if (!rest.length) return;
      rest.forEach(function (r) {
        var li = document.createElement('li');
        var a = document.createElement('a'); a.className = 'repo-name'; a.href = r.html_url; a.textContent = r.name;
        var meta = document.createElement('span'); meta.className = 'repo-meta';
        if (r.language) { var l = document.createElement('span'); l.innerHTML = '<i class="lang-dot"></i>'; l.appendChild(document.createTextNode(r.language)); meta.appendChild(l); }
        var st = document.createElement('span'); st.textContent = '★ ' + r.stargazers_count; meta.appendChild(st);
        var up = document.createElement('span'); up.textContent = 'updated ' + new Date(r.pushed_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' }); meta.appendChild(up);
        li.appendChild(a); li.appendChild(meta);
        if (r.description) { var d = document.createElement('p'); d.className = 'repo-desc'; d.textContent = r.description; li.appendChild(d); }
        list.appendChild(li);
      });
      gh.removeAttribute('hidden');
    };
    if (cached) render(cached);
    else fetch('https://api.github.com/users/' + encodeURIComponent(user) + '/repos?per_page=100&sort=pushed')
      .then(function (r) { return r.ok ? r.json() : []; })
      .then(function (repos) {
        if (!Array.isArray(repos)) return;
        try { sessionStorage.setItem(key, JSON.stringify(repos)); } catch (e) {}
        render(repos);
      })
      .catch(function () {});
  }
})();
