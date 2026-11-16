(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const ok = !reduce && window.gsap && window.ScrollTrigger;
  const yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();

  const file = $('.devis__file input');
  if (file) file.addEventListener('change', () => { $('.devis__file em').textContent = file.files[0] ? file.files[0].name : 'Choisir une photo'; });

  if (!ok) { document.documentElement.classList.remove('js'); return; }
  gsap.registerPlugin(ScrollTrigger);

  /* défilement doux */
  if (window.Lenis) {
    const lenis = new Lenis({ lerp: .085, smoothWheel: true });
    window.lenis = lenis;
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => { const el = $(a.getAttribute('href')); if (el) { e.preventDefault(); lenis.scrollTo(el, { duration: 2 }); } }));
  }

  /* rail de progression + nom du chapitre */
  gsap.to('#railFill', { scaleY: 1, ease: 'none', scrollTrigger: { start: 0, end: 'max', scrub: .3 } });
  const chap = $('#chap');
  [['#s1', 'Les Alluets-le-Roi'], ['#s2', 'Après un accident'], ['#s3', 'La cabine'], ['#s4', "L'atelier"], ['#s5', 'Ce qu\'on en dit'], ['#contact', 'Contact']].forEach(([s, t]) =>
    ScrollTrigger.create({ trigger: s, start: 'top 50%', end: 'bottom 50%', onToggle: e => { if (e.isActive) chap.textContent = t; } }));

  const scene = (sel, len, build) => {
    const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: sel, start: 'top top', end: '+=' + len + '%', pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true } });
    build(tl); return tl;
  };

  /* ---------- logo : construction au chargement ---------- */
  const C = $('#lC'), L = C.getTotalLength();
  gsap.set(C, { strokeDasharray: L, strokeDashoffset: L });
  gsap.set(['#lB', '#lW', '#lR'], { x: -120, opacity: 0 });
  gsap.set(['.s1__name', '.s1__scroll'], { opacity: 0, y: 14 });
  gsap.timeline({ delay: .3, defaults: { ease: 'expo.out' } })
    .to(C, { strokeDashoffset: 0, duration: 1.2, ease: 'power2.inOut' })
    .to(['#lB', '#lW', '#lR'], { x: 0, opacity: 1, duration: .8, stagger: .09 }, '-=.35')
    .to(['.s1__name', '.s1__scroll'], { opacity: 1, y: 0, duration: 1, stagger: .15 }, '-=.5');

  /* ---------- scène 1 : on traverse le C ---------- */
  const lines = $$('.s1__lines p');
  scene('#s1', 520, tl => {
    tl.to('.s1__scroll', { opacity: 0, duration: .2 }, 0)
      .to('.s1__name', { opacity: 0, y: -20, duration: .3 }, 0)
      .to('#lB', { x: 420, scaleX: 3, opacity: 0, duration: .8 }, .05)
      .to('#lW', { x: 520, scaleX: 3, opacity: 0, duration: .8 }, .1)
      .to('#lR', { x: 620, scaleX: 3, opacity: 0, duration: .8 }, .15)
      .to('.s1__logo svg', { scale: 26, transformOrigin: '25.5% 51%', duration: 1.3, ease: 'power2.in' }, .1)
      .to('.s1__logo svg', { opacity: 0, duration: .25 }, 1.15)
      .to('.s1__photo', { clipPath: 'inset(0% 0% 0% 0%)', duration: 1.1, ease: 'power2.in' }, .35)
      .fromTo('.s1__photo img', { scale: 1.45 }, { scale: 1.05, duration: 1.6 }, .35)
      .to('.s1__shade', { opacity: 1, duration: .5 }, 1.2)
      .fromTo('.s1__title span', { opacity: 0, yPercent: 60 }, { opacity: 1, yPercent: 0, stagger: .15, duration: .5, ease: 'power3.out' }, 1.45)
      .to('.s1__title span', { opacity: 0, yPercent: -50, stagger: .1, duration: .45 }, 2.4)
      .to('.s1__photo img', { scale: 1.25, duration: 3 }, 2.4);
    lines.forEach((p, i) => {
      const t = 2.8 + i * .62, odd = i % 2;
      tl.fromTo(p, { opacity: 0, x: odd ? 120 : -120, skewX: odd ? 12 : -12 }, { opacity: 1, x: 0, skewX: 0, duration: .28, ease: 'power3.out' }, t);
      if (i < lines.length - 1) tl.to(p, { opacity: 0, x: odd ? -80 : 80, duration: .22 }, t + .4);
    });
    const end = 2.8 + lines.length * .62 + .2;
    tl.to('.s1 .wipe i', { xPercent: 0, duration: .55, stagger: .08, ease: 'power2.inOut' }, end)
      .to({}, { duration: .3 });
  });
  gsap.set('.s1 .wipe i', { xPercent: -260, skewX: -22 });

  /* ---------- scène 2 : compteur ---------- */
  const steps = $$('.s2__steps article'), ticks = $$('.s2__ticks i');
  gsap.set('.s2 .wipe i', { xPercent: 0, skewX: -22 });
  scene('#s2', 480, tl => {
    tl.to('.s2 .wipe i', { xPercent: 260, duration: .6, stagger: .08, ease: 'power2.inOut' }, 0)
      .fromTo('.s2__photo img', { scale: 1.3 }, { scale: 1, duration: 4.2 }, 0)
      .fromTo('.s2__over', { opacity: 0 }, { opacity: 1, duration: .3 }, .5)
      .fromTo('.odo', { opacity: 0, x: -60 }, { opacity: 1, x: 0, duration: .4 }, .55);
    steps.forEach((a, i) => {
      const t = .7 + i * .9;
      if (i) tl.to('#odo', { yPercent: -25 * i, duration: .35, ease: 'power3.inOut' }, t - .1);
      tl.fromTo(a, { opacity: 0, y: 70 }, { opacity: 1, y: 0, duration: .3, ease: 'power3.out' }, t)
        .fromTo(ticks[i], { '--f': 0 }, { '--f': 1, duration: .8 }, t);
      if (i < steps.length - 1) tl.to(a, { opacity: 0, y: -60, duration: .25 }, t + .62);
    });
    tl.to({}, { duration: .4 });
  });

  /* ---------- scène 3 : la cabine ---------- */
  const words = $$('.s3__words p');
  scene('#s3', 420, tl => {
    tl.to('.s3__photo', { clipPath: 'inset(0% 0 0% 0)', duration: 1, ease: 'power2.inOut' }, 0)
      .fromTo('.s3__photo img', { scale: 1 }, { scale: 1.6, yPercent: 6, duration: 4.4 }, 0)
      .fromTo('.s3__note', { opacity: 0 }, { opacity: 1, duration: .3 }, .8);
    words.forEach((w, i) => {
      const t = 1 + i * .8;
      tl.fromTo(w, { opacity: 0, scale: .6, filter: 'blur(14px)' }, { opacity: 1, scale: 1, filter: 'blur(0px)', duration: .3, ease: 'power3.out' }, t);
      if (i < words.length - 1) tl.to(w, { opacity: 0, scale: 1.5, filter: 'blur(10px)', duration: .3 }, t + .5);
    });
    tl.to('.s3__gloss', { xPercent: 240, duration: .9 }, 3.4)
      .to(words[words.length - 1], { opacity: 0, duration: .3 }, 4.2);
  });

  /* ---------- scène 4 : pellicule ---------- */
  const strip = $('#strip');
  const dist = () => strip.scrollWidth - innerWidth;
  scene('#s4', 360, tl => {
    tl.fromTo(strip, { x: 0 }, { x: () => -dist(), duration: 4 }, 0)
      .fromTo('.s4__ghost', { xPercent: 10 }, { xPercent: -45, duration: 4 }, 0);
    $$('.fr img').forEach((img, i) => tl.fromTo(img, { xPercent: 10 }, { xPercent: -10, duration: 4 }, 0));
  });
  // inclinaison selon la vitesse
  const skew = gsap.quickTo('#strip', 'skewX', { duration: .4, ease: 'power3' });
  ScrollTrigger.create({ trigger: '#s4', start: 'top top', end: '+=360%', onUpdate: s => skew(gsap.utils.clamp(-8, 8, s.getVelocity() / -260)) });

  /* ---------- scène 5 : générique ---------- */
  scene('#s5', 380, tl => {
    tl.fromTo('.s5__score', { opacity: 0, x: -80 }, { opacity: 1, x: 0, duration: .4, ease: 'power3.out' }, 0)
      .fromTo('#credits', { y: 0 }, { y: () => -($('#credits').offsetHeight - innerHeight), duration: 4 }, 0)
      .to('.s5__score', { opacity: 0, x: -60, duration: .4 }, 3.7);
  });

  /* ---------- fin : le logo se reforme ---------- */
  const E = $('#eC'), EL = E.getTotalLength();
  gsap.timeline({ scrollTrigger: { trigger: '.end', start: 'top 80%', end: 'top 15%', scrub: 1 } })
    .fromTo(E, { strokeDasharray: EL, strokeDashoffset: EL }, { strokeDashoffset: 0, ease: 'none' }, 0)
    .fromTo('#eB', { x: -600, y: -200, rotate: -40, opacity: 0 }, { x: 0, y: 0, rotate: 0, opacity: 1, ease: 'power3.out' }, .1)
    .fromTo('#eW', { x: 400, y: 260, rotate: 60, opacity: 0 }, { x: 0, y: 0, rotate: 0, opacity: 1, ease: 'power3.out' }, .2)
    .fromTo('#eR', { x: 700, y: -300, rotate: 90, opacity: 0 }, { x: 0, y: 0, rotate: 0, opacity: 1, ease: 'power3.out' }, .3);
  gsap.from('.end__grid > *, .devis', { y: 50, opacity: 0, duration: 1, stagger: .12, ease: 'expo.out', scrollTrigger: { trigger: '.end__grid', start: 'top 90%' } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
