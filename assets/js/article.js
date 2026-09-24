/* 文章页增强：目录、代码复制、深色模式、阅读进度、回到顶部。
   全部是渐进增强——脚本不跑时文章照常可读，目录为空、按钮不出现。 */
(function () {
  'use strict';

  var doc = document;
  var root = doc.documentElement;
  var article = doc.querySelector('main.article');

  /* ---------- 深色模式 ---------- */
  var THEME_KEY = 'article-theme';
  var toggle = doc.getElementById('theme-toggle');

  function savedTheme() {
    try {
      var v = localStorage.getItem(THEME_KEY);
      return v === 'dark' || v === 'light' ? v : null;
    } catch (e) {
      return null;
    }
  }
  function systemDark() {
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function effectiveTheme() {
    return savedTheme() || (systemDark() ? 'dark' : 'light');
  }
  function paintTheme() {
    var saved = savedTheme();
    /* 手动选过就写死主题；没选过则交给 CSS 的 prefers-color-scheme 决定。 */
    if (saved) root.setAttribute('data-theme', saved);
    else root.removeAttribute('data-theme');

    if (toggle) {
      var dark = effectiveTheme() === 'dark';
      toggle.textContent = dark ? '浅色' : '深色';
      toggle.setAttribute('aria-pressed', dark ? 'true' : 'false');
    }
  }
  if (toggle) {
    toggle.addEventListener('click', function () {
      var next = effectiveTheme() === 'dark' ? 'light' : 'dark';
      try { localStorage.setItem(THEME_KEY, next); } catch (e) { /* 无痕模式等，忽略 */ }
      paintTheme();
    });
  }
  paintTheme();
  if (window.matchMedia) {
    var mq = window.matchMedia('(prefers-color-scheme: dark)');
    var onSystemChange = function () { if (!savedTheme()) paintTheme(); };
    if (mq.addEventListener) mq.addEventListener('change', onSystemChange);
    else if (mq.addListener) mq.addListener(onSystemChange);
  }

  if (!article) return;

  /* ---------- 目录 ---------- */
  var toc = doc.getElementById('toc');

  function headingText(el) {
    return (el.textContent || '').replace(/\s+/g, ' ').trim();
  }
  function uniqueId(text, used) {
    var base = String(text).toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w\u4e00-\u9fa5-]/g, '') || 'section';
    var id = base;
    var n = 2;
    while (used[id] || doc.getElementById(id)) { id = base + '-' + n; n++; }
    used[id] = true;
    return id;
  }

  var headings = article.querySelectorAll('h2, h3');

  /* 标题太少就不做目录，免得占地方。 */
  if (toc && headings.length >= 3) {
    var used = {};
    var list = doc.createElement('ul');
    var links = [];

    for (var i = 0; i < headings.length; i++) {
      var h = headings[i];
      /* kramdown 已经给标题生成了 id，优先沿用，保证锚点稳定。 */
      if (h.id) used[h.id] = true;
      else h.id = uniqueId(headingText(h), used);

      var li = doc.createElement('li');
      li.className = 'toc-' + h.tagName.toLowerCase();

      var a = doc.createElement('a');
      a.href = '#' + h.id;
      a.textContent = headingText(h);

      li.appendChild(a);
      list.appendChild(li);
      links.push({ link: a, heading: h });
    }

    var caption = doc.createElement('p');
    caption.className = 'toc-title';
    caption.textContent = '本页目录';
    toc.appendChild(caption);
    toc.appendChild(list);

    /* 高亮当前所在小节；不支持时只是没有高亮。 */
    if ('IntersectionObserver' in window) {
      var mark = function (target) {
        for (var k = 0; k < links.length; k++) {
          if (links[k].heading === target) links[k].link.classList.add('on');
          else links[k].link.classList.remove('on');
        }
      };
      var io = new IntersectionObserver(function (entries) {
        for (var e = 0; e < entries.length; e++) {
          if (entries[e].isIntersecting) mark(entries[e].target);
        }
      }, { rootMargin: '-80px 0px -70% 0px' });
      for (var j = 0; j < links.length; j++) io.observe(links[j].heading);
    }
  }

  /* ---------- 代码块复制 ---------- */
  function legacyCopy(text) {
    var ta = doc.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    doc.body.appendChild(ta);
    ta.select();
    var done = false;
    try { done = doc.execCommand('copy'); } catch (e) { done = false; }
    doc.body.removeChild(ta);
    return done;
  }
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(
        function () { return true; },
        function () { return legacyCopy(text); }
      );
    }
    return Promise.resolve(legacyCopy(text));
  }

  var blocks = article.querySelectorAll('pre');
  for (var p = 0; p < blocks.length; p++) {
    (function (pre) {
      var code = pre.querySelector('code');
      if (!code) return;
      var btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'copy-btn';
      btn.textContent = '复制';
      btn.addEventListener('click', function () {
        copyText(code.textContent).then(function (done) {
          btn.textContent = done ? '已复制' : '复制失败';
          if (done) btn.classList.add('done');
          window.setTimeout(function () {
            btn.textContent = '复制';
            btn.classList.remove('done');
          }, 1500);
        });
      });
      pre.appendChild(btn);
    })(blocks[p]);
  }

  /* ---------- 阅读进度 + 回到顶部 ---------- */
  var bar = doc.getElementById('read-progress');
  var toTop = doc.getElementById('to-top');

  function onScroll() {
    var el = doc.documentElement;
    var y = window.pageYOffset || el.scrollTop || 0;
    var max = el.scrollHeight - el.clientHeight;
    if (bar) bar.style.width = (max > 0 ? Math.min(100, (y / max) * 100) : 0) + '%';
    if (toTop) toTop.hidden = y < 400;
  }
  var queued = false;
  window.addEventListener('scroll', function () {
    if (queued) return;
    queued = true;
    if (window.requestAnimationFrame) window.requestAnimationFrame(function () { queued = false; onScroll(); });
    else { queued = false; onScroll(); }
  }, { passive: true });
  window.addEventListener('resize', onScroll);
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      try { window.scrollTo({ top: 0, behavior: 'smooth' }); }
      catch (e) { window.scrollTo(0, 0); }
    });
  }
})();
