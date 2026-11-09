(() => {
  const $ = (s, r = document) => r.querySelector(s);

  /* Nav solide au défilement */
  const nav = $('#nav');
  const onScroll = () => nav.classList.toggle('is-solid', window.scrollY > 40);
  onScroll();
  window.addEventListener('scroll', onScroll, { passive: true });

  /* Menu mobile */
  const burger = $('#burger'), menu = $('#menu');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    menu.setAttribute('aria-hidden', !open);
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* Pré-remplir la prestation depuis les boutons */
  const sel = $('#prestation');
  document.querySelectorAll('[data-prestation]').forEach(a =>
    a.addEventListener('click', () => { sel.value = a.dataset.prestation; }));

  /* Ouvert / fermé (heure de Paris) */
  const st = $('#openState');
  if (st) {
    const parts = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const g = t => parts.find(p => p.type === t)?.value;
    const day = g('weekday'), m = (+g('hour')) * 60 + (+g('minute'));
    const open = !day.startsWith('dim') && m >= 540 && m < 1110;
    st.textContent = open ? 'Ouvert en ce moment' : 'Fermé en ce moment';
    st.classList.toggle('is-open', open);
  }

  /* FAP : génération des canaux en damier */
  const NS = 'http://www.w3.org/2000/svg';
  const build = (g, dirty) => {
    if (!g) return;
    const size = 15, gap = 3.2, start = 200 - 12 * size;
    let seed = 11;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 24; i++) for (let j = 0; j < 24; j++) {
      const x = start + i * size, y = start + j * size;
      const plugged = (i + j) % 2 === 0;
      const r = document.createElementNS(NS, 'rect');
      r.setAttribute('x', x + gap / 2); r.setAttribute('y', y + gap / 2);
      r.setAttribute('width', size - gap); r.setAttribute('height', size - gap);
      r.setAttribute('rx', 1.2);
      let fill;
      if (!dirty) fill = plugged ? '#c7bba5' : '#2a241f';
      else {
        const k = rnd();
        fill = plugged ? (k > .7 ? '#3d3631' : '#1d1a17') : (k > .85 ? '#4a4038' : '#0a0908');
      }
      r.setAttribute('fill', fill);
      g.appendChild(r);
    }
  };
  build($('#cellsClean'), false);
  build($('#cellsDirty'), true);

  /* Curseur avant / après */
  const cmp = $('#compare');
  if (cmp) {
    const range = cmp.querySelector('.compare__range');
    const set = v => cmp.style.setProperty('--pos', v + '%');
    range.addEventListener('input', () => set(range.value));
    // petite démonstration au premier affichage
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!reduce && 'IntersectionObserver' in window) {
      const io = new IntersectionObserver(([e]) => {
        if (!e.isIntersecting) return;
        io.disconnect();
        const t0 = performance.now(), dur = 2200;
        const step = t => {
          const p = Math.min(1, (t - t0) / dur);
          const v = 50 + Math.sin(p * Math.PI * 2) * 32 * (1 - p);
          set(v); range.value = v;
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }, { threshold: .5 });
      io.observe(cmp);
    }
  }

  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();
})();
