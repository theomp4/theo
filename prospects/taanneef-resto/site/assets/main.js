(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  root.classList.add('js');

  /* ---------- menu mobile ---------- */
  const burger = $('#burger');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    $('#menu').setAttribute('aria-hidden', !open);
    if (window.lenis) open ? lenis.stop() : lenis.start();
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ---------- ouvert / fermé (heure de Paris) ---------- */
  const st = $('#openState');
  if (st) {
    const p = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const g = t => p.find(x => x.type === t)?.value || '';
    const d = g('weekday').slice(0, 3), m = (+g('hour')) * 60 + (+g('minute'));
    let slots = [[690, 870], [1110, 1320]];
    if (d.startsWith('ven') || d.startsWith('sam')) slots = [[690, 870], [1110, 1440]];
    if (d.startsWith('dim')) slots = [[600, 900], [1080, 1260]];
    const open = slots.some(([a, b]) => m >= a && m < b);
    st.textContent = open ? 'Ouvert en ce moment' : 'Fermé en ce moment';
    st.classList.toggle('is-open', open);
  }
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- filtres de la carte ---------- */
  const dishes = $$('.dish');
  $$('.filters button').forEach(b => b.addEventListener('click', () => {
    $$('.filters button').forEach(x => x.classList.toggle('is-on', x === b));
    const f = b.dataset.filter;
    const show = dishes.filter(d => f === 'all' || d.dataset.cat === f);
    const go = () => {
      dishes.forEach(d => d.classList.toggle('is-out', !show.includes(d)));
      if (hasGsap && !reduce) gsap.fromTo(show, { y: 40, opacity: 0, scale: .96 }, { y: 0, opacity: 1, scale: 1, duration: .7, stagger: .04, ease: 'expo.out', clearProps: 'transform' });
      if (window.ScrollTrigger) ScrollTrigger.refresh();
    };
    if (hasGsap && !reduce) gsap.to(dishes.filter(d => !d.classList.contains('is-out')), { y: -20, opacity: 0, duration: .25, stagger: .015, ease: 'power2.in', onComplete: go });
    else go();
  }));

  /* ---------- curseur & boutons magnétiques ---------- */
  if (fine && !reduce) {
    const c = $('#cursor'), lab = $('.cursor__label', c);
    let x = innerWidth / 2, y2 = innerHeight / 2, cx = x, cy = y2;
    addEventListener('mousemove', e => { x = e.clientX; y2 = e.clientY; c.style.opacity = 1; });
    document.addEventListener('mouseleave', () => c.style.opacity = 0);
    const loop = () => { cx += (x - cx) * .2; cy += (y2 - cy) * .2; c.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); };
    loop();
    $$('a, button, input, select, textarea').forEach(el => {
      el.addEventListener('mouseenter', () => c.classList.add('is-link'));
      el.addEventListener('mouseleave', () => c.classList.remove('is-link'));
    });
    $$('[data-cursor]').forEach(el => {
      el.addEventListener('mouseenter', () => { lab.textContent = el.dataset.cursor; c.classList.add('is-label'); });
      el.addEventListener('mouseleave', () => c.classList.remove('is-label'));
    });
    $$('[data-magnetic]').forEach(b => {
      b.addEventListener('mousemove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`;
      });
      b.addEventListener('mouseleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- braises (section grillades) ---------- */
  const cv = $('#embers');
  if (cv && !reduce) {
    const ctx = cv.getContext('2d');
    let W, H, parts = [], running = false, dpr = Math.min(devicePixelRatio || 1, 2);
    const size = () => { W = cv.offsetWidth; H = cv.offsetHeight; cv.width = W * dpr; cv.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const spawn = () => ({ x: Math.random() * W, y: H + Math.random() * 40, r: Math.random() * 2.2 + .6, vy: -(Math.random() * .9 + .4), vx: (Math.random() - .5) * .4, life: 0, max: Math.random() * 380 + 220, hue: 20 + Math.random() * 25, ph: Math.random() * 6 });
    const tick = () => {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      if (parts.length < Math.min(90, W / 12)) parts.push(spawn());
      parts.forEach(p => {
        p.life++; p.ph += .03; p.x += p.vx + Math.sin(p.ph) * .35; p.y += p.vy;
        const a = Math.max(0, 1 - p.life / p.max);
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue},95%,${55 + 15 * a}%,${a * .9})`;
        ctx.shadowColor = `hsla(${p.hue},100%,55%,${a})`; ctx.shadowBlur = 10;
        ctx.fill();
      });
      parts = parts.filter(p => p.life < p.max && p.y > -10);
      requestAnimationFrame(tick);
    };
    size(); addEventListener('resize', size);
    new IntersectionObserver(([e]) => { running = e.isIntersecting; if (running) requestAnimationFrame(tick); }).observe(cv);
  }

  /* ---------- sans GSAP ou mouvement réduit ---------- */
  const endLoading = () => { const l = $('#loader'); if (l) l.remove(); };
  if (!hasGsap || reduce) { endLoading(); return; }
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- défilement doux ---------- */
  if (typeof window.Lenis !== 'undefined') {
    window.lenis = new Lenis({ lerp: .1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const t = a.getAttribute('href'); if (t.length < 2) return;
      const el = $(t); if (!el) return;
      e.preventDefault(); lenis.scrollTo(el, { offset: t === '#top' ? 0 : -50, duration: 1.4 });
    }));
  }

  /* ---------- header ---------- */
  const head = $('#head'); let lastY = 0;
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => {
    const yy = s.scroll();
    head.classList.toggle('is-scrolled', yy > 40);
    head.classList.toggle('is-hidden', yy > 500 && yy > lastY && !document.body.classList.contains('menu-open'));
    lastY = yy;
  }});

  /* ---------- découpages ---------- */
  const splitChars = (el, wrap) => {
    const t = el.textContent; el.textContent = '';
    [...t].forEach(ch => {
      const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch;
      if (wrap) { const w = document.createElement('span'); w.className = 'chw'; w.appendChild(s); el.appendChild(w); } else el.appendChild(s);
    });
  };
  $$('[data-split]').forEach(el => splitChars(el, true));
  splitChars($('[data-loader-word]'), false);
  splitChars($('.foot__word'), false);
  const splitWords = (el, cls, mask) => {
    const frag = document.createDocumentFragment();
    el.childNodes.forEach(n => {
      const isEm = n.nodeType === 1;
      (n.textContent.match(/\S+\s*/g) || []).forEach(word => {
        const s = document.createElement(isEm ? 'em' : 'span'); s.textContent = word.trimEnd();
        if (mask) { const m = document.createElement('span'); m.className = 'line-mask'; m.appendChild(s); frag.appendChild(m); }
        else { s.className = cls; frag.appendChild(s); }
        frag.appendChild(document.createTextNode(' '));
      });
    });
    el.textContent = ''; el.appendChild(frag);
  };
  $$('[data-lines]').forEach(el => splitWords(el, '', true));
  $$('[data-words]').forEach(el => splitWords(el, 'w', false));

  /* ---------- intro ---------- */
  const heroBits = $$('[data-hero]').filter(e => e.dataset.hero !== 'dish');
  gsap.set('.loader__word .ch', { yPercent: 120, rotate: 8, opacity: 0 });
  gsap.set('.loader__leaf', { scale: 0, rotate: -40 });
  gsap.set('.hero__name .ch', { yPercent: 120 });
  gsap.set(heroBits, { y: 30, opacity: 0 });
  gsap.set('.hero__media img', { scale: 1.3 });
  gsap.set('.hero__dish', { scale: 0, rotate: -90 });
  gsap.set('.lf', { yPercent: 60, opacity: 0 });

  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .to('.loader__leaf', { scale: 1, rotate: -12, duration: .9, ease: 'back.out(2)' })
    .to('.loader__word .ch', { yPercent: 0, rotate: 0, opacity: 1, duration: .9, stagger: .05 }, '-=.6')
    .to('.loader', { clipPath: 'circle(0% at 50% 50%)', duration: 1.2, ease: 'expo.inOut', onComplete: endLoading }, '+=.35')
    .to('.hero__media img', { scale: 1, duration: 2.4 }, '-=.9')
    .to('.hero__name .ch', { yPercent: 0, duration: 1.2, stagger: .05 }, '-=2.2')
    .to(heroBits, { y: 0, opacity: 1, duration: 1, stagger: .08 }, '-=1.6')
    .to('.lf', { yPercent: 0, opacity: .85, duration: 1.4, stagger: .12 }, '-=1.4')
    .to('.hero__dish', { scale: 1, rotate: 0, duration: 1.4, ease: 'back.out(1.4)' }, '-=1.3');
  gsap.set('.loader', { clipPath: 'circle(150% at 50% 50%)' });

  gsap.to('.hero__media img', { yPercent: 12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__in', { y: -100, opacity: .1, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__dish', { y: -160, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* ---------- bandeaux ---------- */
  $$('[data-marquee]').forEach(track => {
    const dir = +track.dataset.marquee;
    track.innerHTML += track.innerHTML + track.innerHTML;
    let x = 0, boost = 0, hover = false;
    ScrollTrigger.create({ onUpdate: s => { boost = Math.min(Math.abs(s.getVelocity()) / 250, 8); } });
    track.addEventListener('mouseenter', () => hover = true);
    track.addEventListener('mouseleave', () => hover = false);
    gsap.ticker.add((t, dt) => {
      boost *= .94;
      x -= (hover ? .25 : 1) * (0.05 + boost * .05) * dt * dir;
      const W = track.scrollWidth / 3;
      if (x <= -W) x += W; if (x > 0) x -= W;
      track.style.transform = `translate3d(${x}px,0,0)`;
    });
  });

  /* ---------- titres, apparitions, images ---------- */
  $$('[data-lines]').forEach(el => gsap.from(el.querySelectorAll('.line-mask > *'), { yPercent: 115, rotate: 4, duration: 1.2, ease: 'expo.out', stagger: .06, scrollTrigger: { trigger: el, start: 'top 85%' } }));
  $$('[data-reveal]').forEach(el => gsap.from(el, { y: 44, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));
  $$('[data-clip]').forEach(img => {
    const fig = img.parentElement;
    gsap.fromTo(fig, { clipPath: 'inset(100% 0 0 0 round 24px)' }, { clipPath: 'inset(0% 0 0 0 round 24px)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: fig, start: 'top 88%' } });
    gsap.fromTo(img, { scale: 1.3 }, { scale: 1, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: fig, start: 'top 88%' } });
  });
  $$('[data-speed]').forEach(el => {
    const sp = parseFloat(el.dataset.speed);
    gsap.to(el, { y: () => sp * innerHeight, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
  });

  /* ---------- teranga mot à mot ---------- */
  gsap.fromTo('.teranga__text .w', { opacity: .14 }, { opacity: 1, stagger: .05, ease: 'none', scrollTrigger: { trigger: '.teranga__text', start: 'top 80%', end: 'bottom 45%', scrub: true } });

  /* ---------- grillades : photo qui s'ouvre ---------- */
  gsap.fromTo('.grill__hero', { clipPath: 'inset(0 18% 0 18% round 28px)' }, { clipPath: 'inset(0 0% 0 0% round 28px)', ease: 'none', scrollTrigger: { trigger: '.grill__hero', start: 'top 90%', end: 'center 50%', scrub: true } });
  gsap.fromTo('.grill__hero img', { scale: 1.35 }, { scale: 1, ease: 'none', scrollTrigger: { trigger: '.grill__hero', start: 'top bottom', end: 'bottom top', scrub: true } });
  gsap.from('.grill__price', { scale: 0, rotate: -12, duration: 1, ease: 'back.out(2)', scrollTrigger: { trigger: '.grill__hero', start: 'center 70%' } });

  /* ---------- carte : apparition des plats ---------- */
  ScrollTrigger.batch('.dish', { start: 'top 92%', once: true,
    onEnter: b => gsap.fromTo(b, { y: 60, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: .08, ease: 'expo.out', clearProps: 'transform' }) });
  gsap.set('.dish', { opacity: 0 });

  /* ---------- le lieu : la photo grandit jusqu'à plein écran ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 761px)', () => {
    gsap.timeline({ scrollTrigger: { trigger: '.lieu__stage', start: 'top top', end: '+=120%', pin: true, scrub: 1, anticipatePin: 1 } })
      .fromTo('#lieuFrame', { clipPath: 'inset(22% 30% 22% 30% round 400px)' }, { clipPath: 'inset(0% 0% 0% 0% round 0px)', ease: 'none' })
      .fromTo('#lieuFrame img', { scale: 1.4 }, { scale: 1, ease: 'none' }, 0)
      .from('.lieu__over > *', { y: 60, opacity: 0, stagger: .1, ease: 'power2.out' }, .45);
  });
  mm.add('(max-width: 760px)', () => {
    gsap.from('.lieu__over > *', { y: 40, opacity: 0, stagger: .1, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.lieu__stage', start: 'top 60%' } });
  });

  /* ---------- cartes empilées : celles du dessous reculent ---------- */
  const cards = $$('.scard');
  cards.forEach((card, i) => {
    if (i === cards.length - 1) return;
    gsap.to(card, { scale: .92 + i * .015, filter: 'brightness(.82)', ease: 'none',
      scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 30%', scrub: true } });
  });

  /* ---------- compteurs ---------- */
  $$('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count), int = el.hasAttribute('data-int'), o = { v: 0 };
    gsap.to(o, { v: end, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' },
      onUpdate: () => { el.textContent = int ? Math.round(o.v) : o.v.toFixed(1).replace('.', ','); } });
  });

  /* ---------- pied de page ---------- */
  gsap.from('.foot__word .ch', { yPercent: 100, opacity: 0, rotate: 10, duration: 1.2, stagger: .05, ease: 'expo.out', scrollTrigger: { trigger: '.foot__word', start: 'top 95%' } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
