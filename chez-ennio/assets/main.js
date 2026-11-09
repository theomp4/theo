(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  root.classList.add('js');

  /* ---------- utilitaires sans animation ---------- */
  // Menu mobile
  const burger = $('#burger');
  const setMenu = open => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    $('#menu').setAttribute('aria-hidden', !open);
    if (window.lenis) open ? lenis.stop() : lenis.start();
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('#menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  // Ouvert / fermé (heure de Paris)
  const st = $('#openState');
  if (st) {
    const p = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const g = t => p.find(x => x.type === t)?.value || '';
    const d = g('weekday').slice(0, 3), m = (+g('hour')) * 60 + (+g('minute'));
    const late = d.startsWith('ven') || d.startsWith('sam') ? 1380 : 1350;
    const day = !d.startsWith('dim') && !d.startsWith('lun');
    const open = day && ((m >= 720 && m < 870) || (m >= 1140 && m < late));
    st.textContent = open ? 'Ouvert en ce moment' : 'Fermé en ce moment';
    st.classList.toggle('is-open', open);
  }
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  // Onglets de la carte
  const tabs = $$('.tabs [role="tab"]'), ink = $('.tabs__ink');
  const moveInk = btn => { if (!ink || !btn) return; ink.style.width = btn.offsetWidth + 'px'; ink.style.transform = `translateX(${btn.offsetLeft}px)`; };
  tabs.forEach(btn => btn.addEventListener('click', () => {
    const id = btn.dataset.tab;
    tabs.forEach(b => b.setAttribute('aria-selected', b === btn));
    moveInk(btn);
    $$('.panel').forEach(p => {
      const on = p.dataset.panel === id;
      p.hidden = !on; p.classList.toggle('is-active', on);
      if (on && hasGsap && !reduce) gsap.fromTo(p.querySelectorAll('li, .panel__ill'), { y: 26, opacity: 0 }, { y: 0, opacity: 1, duration: .7, stagger: .05, ease: 'power3.out' });
    });
    $$('.carte__visual img').forEach(i => i.classList.toggle('is-active', i.dataset.for === id));
    if (window.ScrollTrigger) ScrollTrigger.refresh();
  }));
  const placeInk = () => moveInk($('.tabs [aria-selected="true"]'));
  addEventListener('resize', placeInk); document.fonts?.ready.then(placeInk); placeInk();

  // Curseur personnalisé
  if (fine && !reduce) {
    const c = $('#cursor'), lab = $('.cursor__label', c);
    let x = innerWidth / 2, y2 = innerHeight / 2, cx = x, cy = y2;
    addEventListener('mousemove', e => { x = e.clientX; y2 = e.clientY; c.style.opacity = 1; });
    document.addEventListener('mouseleave', () => c.style.opacity = 0);
    const loop = () => { cx += (x - cx) * .2; cy += (y2 - cy) * .2; c.style.transform = `translate3d(${cx}px,${cy}px,0)`; requestAnimationFrame(loop); };
    loop();
    $$('a, button, [role="tab"], input, select, textarea').forEach(el => {
      el.addEventListener('mouseenter', () => c.classList.add('is-link'));
      el.addEventListener('mouseleave', () => c.classList.remove('is-link'));
    });
    $$('[data-cursor]').forEach(el => {
      el.addEventListener('mouseenter', () => { lab.textContent = el.dataset.cursor; c.classList.add('is-label'); });
      el.addEventListener('mouseleave', () => c.classList.remove('is-label'));
    });
    // Boutons magnétiques
    $$('[data-magnetic]').forEach(b => {
      b.addEventListener('mousemove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`;
      });
      b.addEventListener('mouseleave', () => { b.style.transform = ''; });
    });
  }

  /* ---------- sans GSAP ou mouvement réduit : tout reste visible ---------- */
  const endLoading = () => { document.body.classList.remove('is-loading'); const l = $('#loader'); if (l) l.remove(); };
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
      e.preventDefault(); lenis.scrollTo(el, { offset: t === '#top' ? 0 : -60, duration: 1.4 });
    }));
  }

  /* ---------- header qui se cache ---------- */
  const head = $('#head');
  let lastY = 0;
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => {
    const yy = s.scroll();
    head.classList.toggle('is-scrolled', yy > 40);
    head.classList.toggle('is-hidden', yy > 400 && yy > lastY && !document.body.classList.contains('menu-open'));
    lastY = yy;
  }});

  /* ---------- découpages de texte ---------- */
  $$('[data-split]').forEach(el => {
    const t = el.textContent; el.textContent = '';
    [...t].forEach(ch => { const w = document.createElement('span'); w.className = 'chw'; const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; w.appendChild(s); el.appendChild(w); });
  });
  $$('[data-lines]').forEach(el => {
    // découpe par mots en conservant <em>
    const frag = document.createDocumentFragment();
    el.childNodes.forEach(n => {
      const isEm = n.nodeType === 1;
      (n.textContent.match(/\S+\s*/g) || []).forEach(word => {
        const m = document.createElement('span'); m.className = 'line-mask'; m.style.display = 'inline-block';
        const s = document.createElement(isEm ? 'em' : 'span'); s.textContent = word.trimEnd();
        m.appendChild(s); frag.appendChild(m); frag.appendChild(document.createTextNode(' '));
      });
    });
    el.textContent = ''; el.appendChild(frag);
  });
  $$('[data-words]').forEach(el => {
    const frag = document.createDocumentFragment();
    el.childNodes.forEach(n => {
      const isEm = n.nodeType === 1;
      (n.textContent.match(/\S+\s*/g) || []).forEach(word => {
        const s = document.createElement(isEm ? 'em' : 'span'); s.className = 'w'; s.textContent = word.trimEnd();
        frag.appendChild(s); frag.appendChild(document.createTextNode(' '));
      });
    });
    el.textContent = ''; el.appendChild(frag);
  });

  /* ---------- intro ---------- */
  const heroFade = $$('[data-hero="fade"]');
  gsap.set('.hero__title .ch', { yPercent: 115 });
  gsap.set(heroFade, { y: 30, opacity: 0 });
  gsap.set('.hero__img', { clipPath: 'inset(100% 0 0 0)' });
  gsap.set('.hero__img img', { scale: 1.35 });
  gsap.set('.loader__word span, .loader__word em', { yPercent: 110, opacity: 0 });

  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
  tl.to('.loader__word span, .loader__word em', { yPercent: 0, opacity: 1, duration: 1, stagger: .12 })
    .to('.loader__bar i', { scaleX: 1, duration: .9, ease: 'power2.inOut' }, '-=.6')
    .to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut', onComplete: endLoading }, '+=.1')
    .to('.hero__title .ch', { yPercent: 0, duration: 1.3, stagger: .045 }, '-=.55')
    .to('.hero__img', { clipPath: 'inset(0% 0 0 0)', duration: 1.5, ease: 'expo.inOut' }, '-=1.4')
    .to('.hero__img img', { scale: 1, duration: 2, ease: 'expo.out' }, '-=1.1')
    .to(heroFade, { y: 0, opacity: 1, duration: 1, stagger: .08 }, '-=1.6');
  gsap.set('.loader', { clipPath: 'inset(0 0 0% 0)' });

  // Parallaxe du hero
  gsap.to('.hero__img img', { yPercent: -12, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });
  gsap.to('.hero__text', { y: -80, opacity: .2, ease: 'none', scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* ---------- bandeaux défilants (vitesse liée au scroll) ---------- */
  $$('[data-marquee]').forEach(track => {
    const dir = +track.dataset.marquee;
    track.innerHTML += track.innerHTML + track.innerHTML;
    let x = 0, boost = 0;
    const w = () => track.scrollWidth / 3;
    ScrollTrigger.create({ onUpdate: s => { boost = Math.min(Math.abs(s.getVelocity()) / 250, 8); } });
    let hover = false;
    track.addEventListener('mouseenter', () => hover = true);
    track.addEventListener('mouseleave', () => hover = false);
    gsap.ticker.add((t, dt) => {
      boost *= .94;
      const speed = (hover ? .25 : 1) * (0.05 + boost * .05) * dt;
      x -= speed * dir;
      const W = w();
      if (x <= -W) x += W; if (x > 0) x -= W;
      track.style.transform = `translate3d(${x}px,0,0)`;
    });
  });

  /* ---------- titres ligne par ligne ---------- */
  $$('[data-lines]').forEach(el => {
    gsap.from(el.querySelectorAll('.line-mask > *'), { yPercent: 110, duration: 1.2, ease: 'expo.out', stagger: .06,
      scrollTrigger: { trigger: el, start: 'top 85%' } });
  });

  /* ---------- apparitions ---------- */
  $$('[data-reveal]').forEach(el => {
    gsap.from(el, { y: 40, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 88%' } });
  });

  /* ---------- images en rideau ---------- */
  $$('[data-clip]').forEach(img => {
    const fig = img.parentElement;
    gsap.fromTo(fig, { clipPath: 'inset(100% 0 0 0)' }, { clipPath: 'inset(0% 0 0 0)', duration: 1.4, ease: 'expo.inOut', scrollTrigger: { trigger: fig, start: 'top 88%' } });
    gsap.fromTo(img, { scale: 1.3 }, { scale: 1, duration: 1.8, ease: 'expo.out', scrollTrigger: { trigger: fig, start: 'top 88%' } });
  });

  /* ---------- parallaxe ---------- */
  $$('[data-speed]').forEach(el => {
    const sp = parseFloat(el.dataset.speed);
    gsap.to(el, { y: () => sp * innerHeight, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } });
  });

  /* ---------- manifeste mot à mot ---------- */
  const words = $$('.manifesto__text .w');
  gsap.fromTo(words, { opacity: .14 }, { opacity: 1, stagger: .05, ease: 'none',
    scrollTrigger: { trigger: '.manifesto__text', start: 'top 80%', end: 'bottom 45%', scrub: true } });

  /* ---------- pinsa : défilement horizontal épinglé ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 761px)', () => {
    const track = $('#pinsaTrack');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth + 60);
    const skew = gsap.quickTo(track, 'skewX', { duration: .5, ease: 'power3' });
    gsap.to(track, { x: () => -dist(), ease: 'none',
      scrollTrigger: { trigger: '.pinsa', start: 'top top', end: () => '+=' + dist(), pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1,
        onUpdate: s => skew(gsap.utils.clamp(-6, 6, s.getVelocity() / -300)) } });
    gsap.to('#pinsaBar', { scaleX: 1, ease: 'none', scrollTrigger: { trigger: '.pinsa', start: 'top top', end: () => '+=' + dist(), scrub: true, invalidateOnRefresh: true } });
    return () => gsap.set(track, { clearProps: 'all' });
  });

  /* ---------- galerie : titre qui glisse ---------- */
  gsap.fromTo('[data-gx]', { xPercent: 10 }, { xPercent: -25, ease: 'none', scrollTrigger: { trigger: '.gallery', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* ---------- terrasse : zoom à l'entrée ---------- */
  gsap.fromTo('.terrasse__img', { clipPath: 'inset(12% 12% 12% 12% round 4px)' }, { clipPath: 'inset(0% 0% 0% 0% round 4px)', ease: 'none',
    scrollTrigger: { trigger: '.terrasse__img', start: 'top 95%', end: 'center 55%', scrub: true } });
  gsap.fromTo('.terrasse__img img', { scale: 1.3 }, { scale: 1, ease: 'none',
    scrollTrigger: { trigger: '.terrasse__img', start: 'top bottom', end: 'bottom top', scrub: true } });

  /* ---------- compteurs ---------- */
  $$('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count), int = el.hasAttribute('data-int');
    const o = { v: 0 };
    gsap.to(o, { v: end, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 85%' },
      onUpdate: () => { el.textContent = int ? Math.round(o.v) : o.v.toFixed(1).replace('.', ','); } });
  });

  /* ---------- carte : apparition des plats ---------- */
  gsap.from('.panel.is-active li', { y: 30, opacity: 0, duration: .9, stagger: .06, ease: 'expo.out', scrollTrigger: { trigger: '.carte__body', start: 'top 80%' } });

  /* ---------- pied de page : grand nom ---------- */
  gsap.from('.foot__word span, .foot__word em', { yPercent: 100, opacity: 0, duration: 1.4, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.foot__word', start: 'top 95%' } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
