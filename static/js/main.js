/* davinomjr.com — no dependencies */
(() => {
  'use strict';

  const $  = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------- scroll reveal */

  const revealables = $$('.reveal');
  if (reduced || !('IntersectionObserver' in window)) {
    revealables.forEach(el => el.classList.add('is-in'));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    revealables.forEach(el => io.observe(el));
  }

  /* --------------------------------------------- nav shadow + scrollspy */

  const nav = $('#site-nav');
  const onScroll = () => nav && nav.classList.toggle('is-stuck', window.scrollY > 16);
  onScroll();
  addEventListener('scroll', onScroll, { passive: true });

  const sections = $$('main section[id]');
  if (sections.length && 'IntersectionObserver' in window) {
    const setActive = (id) => {
      $$('[data-navlink]').forEach(a => a.classList.toggle('is-active', a.dataset.navlink === id));
      $$('[data-raillink]').forEach(a => a.classList.toggle('is-active', a.dataset.raillink === id));
    };
    const visible = new Map();
    const spy = new IntersectionObserver((entries) => {
      entries.forEach(e => visible.set(e.target.id, e.isIntersecting ? e.intersectionRatio : 0));
      let best = null, ratio = 0;
      visible.forEach((r, id) => { if (r > ratio) { ratio = r; best = id; } });
      if (best) setActive(best);
    }, { threshold: [0, 0.15, 0.4, 0.75], rootMargin: '-15% 0px -45% 0px' });
    sections.forEach(s => spy.observe(s));
  }

  /* --------------------------------------------------------- mobile nav */

  const toggle = $('#nav-toggle');
  const links  = $('#nav-links');
  const isMobile = () => matchMedia('(max-width: 800px)').matches;

  const setMenu = (open) => {
    if (!links || !toggle) return;
    links.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
  };
  const syncMenu = () => setMenu(!isMobile());

  if (toggle && links) {
    syncMenu();
    addEventListener('resize', syncMenu);
    toggle.addEventListener('click', () => setMenu(links.hidden));
    links.addEventListener('click', (e) => {
      if (e.target.closest('a') && isMobile()) setMenu(false);
    });
  }

  /* ----------------------------------------------------- role typewriter */

  const roleEl = $('[data-roles]');
  if (roleEl && !reduced) {
    let roles = [];
    try { roles = JSON.parse(roleEl.dataset.roles); } catch { /* keep static text */ }

    if (roles.length > 1) {
      // The first phrase is already rendered server-side, so we open in the
      // deleting phase. Bounds use >=/<= so a stray step can never overshoot
      // the terminating condition and strand the loop.
      let idx = 0, pos = roles[0].length, deleting = true;

      const tick = () => {
        const word = roles[idx];
        pos = Math.max(0, Math.min(pos + (deleting ? -1 : 1), word.length));
        roleEl.textContent = word.slice(0, pos);

        let delay = deleting ? 38 : 75;
        if (!deleting && pos >= word.length) { delay = 2200; deleting = true; }
        else if (deleting && pos <= 0) { deleting = false; idx = (idx + 1) % roles.length; delay = 380; }

        setTimeout(tick, delay);
      };
      setTimeout(tick, 2200);
    }
  }

  /* ------------------------------------------------------- skill filter */

  const filters = $$('.filter');
  if (filters.length) {
    filters.forEach(btn => btn.addEventListener('click', () => {
      const want = btn.dataset.filter;
      filters.forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
      $$('.skill-group').forEach(g => { g.hidden = want !== 'all' && g.dataset.group !== want; });
    }));
  }

  /* ------------------------------------------------------- copy buttons */

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.cssText = 'position:fixed;top:-9999px';
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try { ok = document.execCommand('copy'); } catch { ok = false; }
      ta.remove();
      return ok;
    }
  };

  const flash = (btn, msg) => {
    const target = btn.querySelector('span') || btn;
    const original = target.textContent;
    target.textContent = msg;
    btn.classList.add('is-copied');
    setTimeout(() => { target.textContent = original; btn.classList.remove('is-copied'); }, 1600);
  };

  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-copy]');
    if (!btn) return;
    const ok = await copyText(btn.dataset.copy);
    flash(btn, ok ? 'Copied!' : 'Press ⌘C');
  });

  /* ----------------------------------------------------- command palette */

  const modal = $('#cmdk');
  const input = $('#cmdk-input');
  const list  = $('#cmdk-list');
  const dataEl = $('#cmdk-data');

  if (modal && input && list && dataEl) {
    let items = [];
    try { items = JSON.parse(dataEl.textContent); } catch { items = []; }

    const iconTpl = $('#cmdk-icons');
    const iconFor = (name) => {
      const found = iconTpl && iconTpl.content.querySelector(`[data-icon="${name}"] svg`);
      return found ? found.cloneNode(true) : null;
    };

    let results = items;
    let sel = 0;
    let lastFocus = null;

    const render = () => {
      list.textContent = '';
      if (!results.length) {
        const empty = document.createElement('div');
        empty.className = 'cmdk-empty';
        empty.textContent = 'No matches.';
        list.appendChild(empty);
        return;
      }
      results.forEach((it, i) => {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cmdk-item' + (i === sel ? ' is-sel' : '');
        b.setAttribute('role', 'option');
        b.setAttribute('aria-selected', String(i === sel));

        const svg = iconFor(it.icon);
        if (svg) b.appendChild(svg);

        const label = document.createElement('span');
        label.textContent = it.label;
        b.appendChild(label);

        const kind = document.createElement('span');
        kind.className = 'kind';
        kind.textContent = it.kind;
        b.appendChild(kind);

        b.addEventListener('click', () => run(it));
        b.addEventListener('mousemove', () => {
          if (sel === i) return;
          sel = i;
          render();
        });
        list.appendChild(b);
      });
    };

    const run = async (it) => {
      close();
      if (it.copy) {
        await copyText(it.copy);
        return;
      }
      if (it.href.startsWith('#')) {
        const target = document.querySelector(it.href);
        if (target) target.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
      } else if (it.href.startsWith('mailto:')) {
        location.href = it.href;
      } else {
        window.open(it.href, '_blank', 'noopener');
      }
    };

    const filter = () => {
      const q = input.value.trim().toLowerCase();
      results = q
        ? items.filter(it => (it.label + ' ' + it.kind).toLowerCase().includes(q))
        : items;
      sel = 0;
      render();
    };

    const open = () => {
      lastFocus = document.activeElement;
      modal.hidden = false;
      input.value = '';
      filter();
      input.focus();
    };

    const close = () => {
      modal.hidden = true;
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    };

    $$('[data-cmdk-open]').forEach(b => b.addEventListener('click', open));
    input.addEventListener('input', filter);

    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });

    addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();

      if (key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        modal.hidden ? open() : close();
        return;
      }

      // "/" opens the palette unless the user is typing somewhere
      if (key === '/' && modal.hidden) {
        const t = e.target;
        const typing = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
        if (!typing) { e.preventDefault(); open(); }
        return;
      }

      if (modal.hidden) return;

      if (key === 'escape') { e.preventDefault(); close(); }
      else if (key === 'arrowdown') { e.preventDefault(); sel = (sel + 1) % Math.max(results.length, 1); render(); scrollSel(); }
      else if (key === 'arrowup')   { e.preventDefault(); sel = (sel - 1 + results.length) % Math.max(results.length, 1); render(); scrollSel(); }
      else if (key === 'enter')     { e.preventDefault(); if (results[sel]) run(results[sel]); }
      else if (key === 'tab')       { e.preventDefault(); input.focus(); }
    });

    const scrollSel = () => {
      const el = list.children[sel];
      if (el && el.scrollIntoView) el.scrollIntoView({ block: 'nearest' });
    };
  }
})();
