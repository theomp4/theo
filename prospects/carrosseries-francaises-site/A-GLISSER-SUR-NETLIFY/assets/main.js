(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const ok = document.documentElement.classList.contains('js') && window.gsap && window.ScrollTrigger;

  /* menu mobile */
  const burger = $('#burger');
  burger.addEventListener('click', () => { const o = document.body.classList.toggle('menu-open'); burger.setAttribute('aria-expanded', o); });
  $$('#nav a').forEach(a => a.addEventListener('click', () => document.body.classList.remove('menu-open')));

  /* année, ouvert/fermé, photo */
  $('#year').textContent = new Date().getFullYear();
  const p = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const g = t => p.find(x => x.type === t)?.value || '';
  const d = g('weekday').slice(0, 3), m = (+g('hour')) * 60 + (+g('minute'));
  const slots = { lun: [[510, 720], [840, 1080]], mar: [[510, 750], [840, 1080]], mer: [[510, 750], [840, 1080]], jeu: [[510, 750], [840, 1080]], ven: [[510, 750], [810, 1050]] }[d] || [];
  const open = slots.some(([a, b]) => m >= a && m < b);
  const op = $('#open'); op.textContent = open ? "L'atelier est ouvert" : "L'atelier est fermé en ce moment"; op.classList.toggle('is-on', open);
  const f = $('.file input'); f.addEventListener('change', () => { $('.file em').textContent = f.files[0] ? f.files[0].name : 'Choisir une photo'; });

  /* soulignement du menu */
  const ink = $('.nav__ink'), links = $$('#nav a');
  const moveInk = a => { if (!a) { ink.style.width = 0; return; } ink.style.width = a.offsetWidth + 'px'; ink.style.transform = `translateX(${a.offsetLeft}px)`; };

  if (!ok) { $$('.steps li').forEach(li => li.classList.add('is-on')); return; }
  gsap.registerPlugin(ScrollTrigger);

  /* en-tête et progression */
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => { $('#head').classList.toggle('is-scrolled', s.scroll() > 10); gsap.set('#prog', { scaleX: s.progress }); } });
  links.forEach(a => {
    const sec = $(a.getAttribute('href'));
    ScrollTrigger.create({ trigger: sec, start: 'top 45%', end: 'bottom 45%', onToggle: e => { a.classList.toggle('is-on', e.isActive); if (e.isActive) moveInk(a); } });
  });
  ScrollTrigger.create({ trigger: '#services', start: 'top 45%', onLeaveBack: () => moveInk(null) });

  /* apparitions */
  ScrollTrigger.batch('[data-reveal]', { start: 'top 88%', once: true,
    onEnter: b => gsap.to(b, { opacity: 1, y: 0, duration: .8, stagger: .08, ease: 'power3.out' }) });

  /* icônes des services : le trait se dessine */
  $$('.svc svg').forEach(svg => {
    const parts = $$('path,circle', svg);
    parts.forEach(el => { const L = el.getTotalLength(); gsap.set(el, { strokeDasharray: L, strokeDashoffset: L }); });
    gsap.to(parts, { strokeDashoffset: 0, duration: 1.2, stagger: .12, ease: 'power2.out', scrollTrigger: { trigger: svg, start: 'top 88%' } });
  });

  /* accueil : titre, puis la voiture se dessine */
  gsap.from('.ln > span', { yPercent: 105, duration: .9, stagger: .1, ease: 'power3.out', delay: .1 });
  gsap.from(['.hero__lead', '.hero__cta', '.hero__facts'], { opacity: 0, y: 16, duration: .8, stagger: .08, delay: .45, ease: 'power3.out' });
  const lines = $$('.car__line, .wheel circle, .wheel path');
  lines.forEach(el => { const L = el.getTotalLength(); gsap.set(el, { strokeDasharray: L, strokeDashoffset: L }); });
  gsap.set('#dent path', { opacity: 0 });
  gsap.timeline({ delay: .3 })
    .to(lines, { strokeDashoffset: 0, duration: 1.6, stagger: .05, ease: 'power2.inOut' })
    .from('.car__shadow', { opacity: 0, duration: .6 }, '-=.6')
    .to('#dent path', { opacity: 1, duration: .15, stagger: .1 }, '-=.3')
    .fromTo('#car', { x: 0 }, { x: 6, duration: .06, repeat: 5, yoyo: true }, '<');

  /* au scroll : la bosse disparaît, la peinture passe, ça brille */
  const wide = matchMedia('(min-width: 981px)').matches;
  const repairST = wide
    ? { trigger: '.hero', start: 'top 72px', end: '+=70%', pin: true, scrub: .8 }
    : { trigger: '#car', start: 'top 65%', end: 'bottom 15%', scrub: .8 };
  repairST.onUpdate = s => { $('#st1').classList.toggle('is-on', s.progress < .95); $('#st2').classList.toggle('is-on', s.progress >= .95); };
  gsap.timeline({ scrollTrigger: repairST })
    .to('#stBar', { scaleX: 1, ease: 'none', duration: 1 }, 0)
    .to('#dent path', { opacity: 0, scale: .2, transformOrigin: '50% 50%', duration: .25, stagger: .05 }, 0)
    .to('#paint', { attr: { width: 900 }, duration: .6, ease: 'none' }, .2)
    .to('#shine', { attr: { x: 1200 }, duration: .25, ease: 'none' }, .78)
    .to('#spark', { opacity: 1, duration: .05 }, .9)
    .fromTo('#spark', { scale: .4, transformOrigin: '640px 270px' }, { scale: 1.2, duration: .1 }, .9);
  gsap.to('.hero__hint', { opacity: 0, scrollTrigger: { trigger: '.hero', start: 'top top', end: '+=120', scrub: true } });

  /* sinistre : la route se remplit, les étapes s'allument */
  const steps = $$('.steps li');
  ScrollTrigger.matchMedia({
    '(min-width: 981px)': () => {
      gsap.timeline({ scrollTrigger: { trigger: '#road', start: 'top 70%', end: 'bottom 45%', scrub: .6,
          onUpdate: s => steps.forEach((li, i) => li.classList.toggle('is-on', s.progress >= i / steps.length + .02 || (i === 0 && s.progress > 0))) } })
        .to('#roadFill', { scaleX: 1, ease: 'none' }, 0)
        .to('#roadCar', { left: '100%', xPercent: -90, ease: 'none' }, 0);
    }
  });

  /* atelier : compteurs et dépanneuse */
  $$('[data-count]').forEach(el => {
    const end = +el.dataset.count, dec = +(el.dataset.dec || 0), o = { v: end > 1000 ? end - 25 : 0 };
    gsap.to(o, { v: end, duration: 1.6, ease: 'power2.out', scrollTrigger: { trigger: el, start: 'top 90%' }, onUpdate: () => { el.textContent = dec ? o.v.toFixed(dec).replace('.', ',') : Math.round(o.v); } });
  });
  gsap.fromTo('#tow', { x: () => -320 }, { x: () => innerWidth + 40, ease: 'none', scrollTrigger: { trigger: '.tow', start: 'top bottom', end: 'bottom top', scrub: .5, invalidateOnRefresh: true } });
  gsap.to('#tow circle', { rotation: 360 * 6, transformOrigin: '50% 50%', ease: 'none', scrollTrigger: { trigger: '.tow', start: 'top bottom', end: 'bottom top', scrub: .5 } });

  /* logo du pied de page */
  gsap.from(['.foot__logo .cf-b', '.foot__logo .cf-w', '.foot__logo .cf-r'], { x: 60, opacity: 0, stagger: .08, duration: .7, ease: 'power3.out', scrollTrigger: { trigger: '.foot', start: 'top 95%' } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
