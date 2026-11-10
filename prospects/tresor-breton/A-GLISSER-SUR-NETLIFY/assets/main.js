(() => {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  const fine = matchMedia('(hover:hover) and (pointer:fine)').matches;
  const DPR = Math.min(devicePixelRatio || 1, 2);
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
  const y = $('#year'); if (y) y.textContent = new Date().getFullYear();

  /* ---------- poussière d'or (traînée + explosions) ---------- */
  const dust = $('#dust'), dctx = dust.getContext('2d');
  let DW, DH, motes = [];
  const dsize = () => { DW = innerWidth; DH = innerHeight; dust.width = DW * DPR; dust.height = DH * DPR; dctx.setTransform(DPR, 0, 0, DPR, 0, 0); };
  dsize(); addEventListener('resize', dsize);
  const mote = (x, y, power) => {
    const a = Math.random() * Math.PI * 2, v = Math.random() * power;
    motes.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - power * .25, r: Math.random() * 2.4 + .6, life: 0, max: 50 + Math.random() * 70, hue: 38 + Math.random() * 14, tw: Math.random() * 6 });
  };
  const burst = (x, y, n = 120, power = 9) => { if (reduce) return; for (let i = 0; i < n; i++) mote(x, y, power); };
  window.goldBurst = burst;
  let dustOn = false;
  const dtick = () => {
    dctx.clearRect(0, 0, DW, DH);
    if (!motes.length) { dustOn = false; return; }
    dctx.globalCompositeOperation = 'lighter';
    motes.forEach(m => {
      m.life++; m.vy += .09; m.vx *= .975; m.vy *= .975; m.x += m.vx; m.y += m.vy; m.tw += .3;
      const a = Math.max(0, 1 - m.life / m.max) * (.6 + .4 * Math.sin(m.tw));
      dctx.beginPath(); dctx.arc(m.x, m.y, m.r, 0, 6.283);
      dctx.fillStyle = `hsla(${m.hue},95%,${62 + 20 * a}%,${a})`;
      dctx.shadowColor = `hsla(${m.hue},100%,60%,${a})`; dctx.shadowBlur = 12; dctx.fill();
    });
    motes = motes.filter(m => m.life < m.max);
    requestAnimationFrame(dtick);
  };
  const kick = () => { if (!dustOn) { dustOn = true; requestAnimationFrame(dtick); } };
  if (!reduce) {
    if (fine) addEventListener('mousemove', e => { for (let i = 0; i < 2; i++) mote(e.clientX, e.clientY, 1.6); kick(); });
    addEventListener('pointerdown', e => { burst(e.clientX, e.clientY, 46, 6); kick(); });
  }

  /* ---------- étoiles ---------- */
  const sc = $('#stars');
  if (sc) {
    const c = sc.getContext('2d'); let W, H, st = [], shoot = null, on = true;
    const size = () => { W = sc.offsetWidth; H = sc.offsetHeight; sc.width = W * DPR; sc.height = H * DPR; c.setTransform(DPR, 0, 0, DPR, 0, 0);
      st = Array.from({ length: Math.round(W * H / 5200) }, () => ({ x: Math.random() * W, y: Math.random() * H * .8, r: Math.random() * 1.3 + .2, p: Math.random() * 6, s: Math.random() * .03 + .008 })); };
    size(); addEventListener('resize', size);
    const draw = () => {
      if (!on) return;
      c.clearRect(0, 0, W, H);
      st.forEach(s => { s.p += s.s; c.globalAlpha = .35 + .65 * Math.abs(Math.sin(s.p)); c.fillStyle = '#FFF6DA'; c.beginPath(); c.arc(s.x, s.y, s.r, 0, 6.283); c.fill(); });
      if (!shoot && Math.random() < .004) shoot = { x: Math.random() * W * .7, y: Math.random() * H * .3, l: 0 };
      if (shoot) { shoot.l += 1; shoot.x += 9; shoot.y += 3.4; c.globalAlpha = Math.max(0, 1 - shoot.l / 40);
        const g = c.createLinearGradient(shoot.x, shoot.y, shoot.x - 120, shoot.y - 45); g.addColorStop(0, '#FFF1B8'); g.addColorStop(1, 'transparent');
        c.strokeStyle = g; c.lineWidth = 2; c.beginPath(); c.moveTo(shoot.x, shoot.y); c.lineTo(shoot.x - 120, shoot.y - 45); c.stroke(); if (shoot.l > 40) shoot = null; }
      c.globalAlpha = 1;
      if (!reduce) requestAnimationFrame(draw);
    };
    new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) requestAnimationFrame(draw); }).observe(sc);
  }

  /* ---------- bulles de cidre ---------- */
  const bc = $('#bubbles');
  if (bc && !reduce) {
    const c = bc.getContext('2d'); let W, H, bs = [], on = false;
    const size = () => { W = bc.offsetWidth; H = bc.offsetHeight; bc.width = W * DPR; bc.height = H * DPR; c.setTransform(DPR, 0, 0, DPR, 0, 0); };
    size(); addEventListener('resize', size);
    const tick = () => {
      if (!on) return;
      c.clearRect(0, 0, W, H);
      if (bs.length < W / 9) bs.push({ x: Math.random() * W, y: H + 20, r: Math.random() * 9 + 2, v: Math.random() * 1.6 + .5, p: Math.random() * 6 });
      bs.forEach(b => { b.y -= b.v; b.p += .04; b.x += Math.sin(b.p) * .6;
        c.beginPath(); c.arc(b.x, b.y, b.r, 0, 6.283); c.strokeStyle = 'rgba(255,250,225,.75)'; c.lineWidth = 1.4; c.stroke();
        c.beginPath(); c.arc(b.x - b.r * .3, b.y - b.r * .3, b.r * .25, 0, 6.283); c.fillStyle = 'rgba(255,255,255,.8)'; c.fill(); });
      bs = bs.filter(b => b.y > -20);
      requestAnimationFrame(tick);
    };
    new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) requestAnimationFrame(tick); }).observe(bc);
  }

  /* ---------- curseur, boutons magnétiques, aperçu des plats ---------- */
  if (fine && !reduce) {
    const c = $('#cursor'), lab = $('.cursor__label', c), peek = $('#peek'), pimg = $('img', peek);
    let x = innerWidth / 2, y2 = innerHeight / 2, cx = x, cy = y2, px = x, py = y2;
    addEventListener('mousemove', e => { x = e.clientX; y2 = e.clientY; c.style.opacity = 1; });
    document.addEventListener('mouseleave', () => c.style.opacity = 0);
    const loop = () => { cx += (x - cx) * .22; cy += (y2 - cy) * .22; px += (x - px) * .1; py += (y2 - py) * .1;
      c.style.transform = `translate3d(${cx}px,${cy}px,0)`;
      peek.style.transform = `translate3d(${px + 170}px,${py}px,0) translate(-50%,-50%) rotate(${(x - px) * .08}deg)`;
      requestAnimationFrame(loop); };
    loop();
    $$('a, button, input, select, textarea').forEach(el => { el.addEventListener('mouseenter', () => c.classList.add('is-link')); el.addEventListener('mouseleave', () => c.classList.remove('is-link')); });
    $$('[data-cursor]').forEach(el => { el.addEventListener('mouseenter', () => { lab.textContent = el.dataset.cursor; c.classList.add('is-label'); }); el.addEventListener('mouseleave', () => c.classList.remove('is-label')); });
    $$('[data-magnetic]').forEach(b => {
      b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`; });
      b.addEventListener('mouseleave', () => { b.style.transform = ''; });
    });
    $$('.items li').forEach(li => {
      li.addEventListener('mouseenter', () => { pimg.src = li.dataset.img; peek.classList.add('is-on'); });
      li.addEventListener('mouseleave', () => peek.classList.remove('is-on'));
    });
  }

  /* ---------- sans GSAP ou mouvement réduit ---------- */
  const endIntro = () => { const l = $('#intro'); if (l) l.remove(); };
  if (!hasGsap || reduce) { endIntro(); return; }
  gsap.registerPlugin(ScrollTrigger);

  /* ---------- défilement doux ---------- */
  if (typeof window.Lenis !== 'undefined') {
    window.lenis = new Lenis({ lerp: .1, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(t => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lenis.stop();
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const t = a.getAttribute('href'); if (t.length < 2) return;
      const el = $(t); if (!el) return;
      e.preventDefault(); lenis.scrollTo(el, { offset: t === '#top' ? 0 : -40, duration: 1.5 });
    }));
  }

  /* ---------- header + boussole ---------- */
  const head = $('#head'); let lastY = 0;
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => {
    const yy = s.scroll();
    head.classList.toggle('is-scrolled', yy > 40);
    head.classList.toggle('is-hidden', yy > 500 && yy > lastY && !document.body.classList.contains('menu-open'));
    lastY = yy;
    gsap.set('#needle', { rotation: s.progress * 720 + s.getVelocity() / 60 });
  }});

  /* ---------- découpages ---------- */
  const splitChars = (el, wrap) => {
    const t = el.textContent; el.textContent = '';
    [...t].forEach(ch => { const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch;
      if (wrap) { const w = document.createElement('span'); w.className = 'chw'; w.appendChild(s); el.appendChild(w); } else el.appendChild(s); });
  };
  $$('[data-split]').forEach(el => splitChars(el, true));
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

  /* ---------- INTRO : la pièce tourne, explose, le rideau s'ouvre ---------- */
  const heroBits = $$('[data-hero]').filter(e => e.dataset.hero !== 'plate');
  gsap.set('.hero__w .ch', { yPercent: 120, rotateX: -80 });
  gsap.set(heroBits, { y: 30, opacity: 0 });
  gsap.set('.hero__plate', { scale: 0, rotate: -200 });
  gsap.set('.hero__light', { yPercent: 40, opacity: 0 });
  gsap.set('.hero__moon', { scale: 0 });
  gsap.set('.sea:not(.sea--foot)', { yPercent: 100 });
  gsap.set('#coin', { scale: .2, rotationY: 0, y: 260, opacity: 0 });
  gsap.set('.intro__txt', { opacity: 0, y: 20 });
  gsap.set('#intro', { clipPath: 'circle(150% at 50% 50%)' });

  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .to('#coin', { y: 0, opacity: 1, scale: 1, rotationY: 1080, duration: 2, ease: 'power3.out' })
    .to('.intro__txt', { opacity: 1, y: 0, duration: .8 }, '-=1.3')
    .to('#coin', { scale: 1.12, duration: .25, ease: 'power2.in' })
    .add(() => { const r = $('#coin').getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 260, 15); kick(); })
    .to('#coin', { scale: 14, opacity: 0, duration: .9, ease: 'power3.in' })
    .to('.intro__txt', { opacity: 0, duration: .3 }, '<')
    .to('#intro', { clipPath: 'circle(0% at 50% 50%)', duration: 1.1, ease: 'expo.inOut', onComplete: () => { endIntro(); if (window.lenis) lenis.start(); } }, '-=.55')
    .to('.hero__moon', { scale: 1, duration: 1.4, ease: 'back.out(1.6)' }, '-=.6')
    .to('.sea:not(.sea--foot)', { yPercent: 0, duration: 1.6 }, '<')
    .to('.hero__light', { yPercent: 0, opacity: 1, duration: 1.6 }, '<.1')
    .to('.hero__w .ch', { yPercent: 0, rotateX: 0, duration: 1.3, stagger: .06 }, '<.1')
    .to(heroBits, { y: 0, opacity: 1, duration: 1, stagger: .09 }, '-=1')
    .to('.hero__plate', { scale: 1, rotate: 0, duration: 1.5, ease: 'back.out(1.5)' }, '-=1.2');

  /* parallaxe du hero */
  const hs = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
  gsap.to('.hero__in', { y: 160, opacity: 0, ease: 'none', scrollTrigger: hs });
  gsap.to('.hero__moon', { y: 260, ease: 'none', scrollTrigger: hs });
  gsap.to('.hero__stars', { y: 120, ease: 'none', scrollTrigger: hs });
  gsap.to('.hero__plate', { y: -220, rotate: 60, ease: 'none', scrollTrigger: hs });

  /* ---------- bandeaux ---------- */
  $$('[data-marquee]').forEach(track => {
    const dir = +track.dataset.marquee;
    track.innerHTML += track.innerHTML + track.innerHTML;
    let x = 0, boost = 0;
    ScrollTrigger.create({ onUpdate: s => { boost = Math.min(Math.abs(s.getVelocity()) / 220, 9); } });
    gsap.ticker.add((t, dt) => { boost *= .94; x -= (0.06 + boost * .05) * dt * dir; const W = track.scrollWidth / 3; if (x <= -W) x += W; if (x > 0) x -= W; track.style.transform = `translate3d(${x}px,0,0)`; });
  });

  /* ---------- titres, apparitions, images, parallaxe ---------- */
  $$('[data-lines]').forEach(el => gsap.from(el.querySelectorAll('.line-mask > *'), { yPercent: 120, rotate: 5, duration: 1.2, ease: 'expo.out', stagger: .07, scrollTrigger: { trigger: el, start: 'top 86%' } }));
  $$('[data-reveal]').forEach(el => gsap.from(el, { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));
  $$('[data-clip]').forEach(img => {
    const fig = img.parentElement;
    gsap.from(fig, { scale: .6, rotate: -8, opacity: 0, duration: 1.5, ease: 'expo.out', scrollTrigger: { trigger: fig, start: 'top 90%' } });
    gsap.fromTo(img, { scale: 1.4 }, { scale: 1, duration: 2, ease: 'expo.out', scrollTrigger: { trigger: fig, start: 'top 90%' } });
  });
  $$('[data-speed]').forEach(el => { const sp = parseFloat(el.dataset.speed);
    gsap.to(el, { y: () => sp * innerHeight, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true, invalidateOnRefresh: true } }); });
  gsap.fromTo('.histoire__text .w', { opacity: .12 }, { opacity: 1, stagger: .05, ease: 'none', scrollTrigger: { trigger: '.histoire__text', start: 'top 80%', end: 'bottom 45%', scrub: true } });

  /* ---------- LA COMPLÈTE : montage au scroll ---------- */
  const fb = { transformBox: 'fill-box', transformOrigin: '50% 50%' };
  gsap.set(['#batter', '#flaps'], { scale: 0, rotate: -120, svgOrigin: '300 300' });
  gsap.set('#flapT', { svgOrigin: '300 180' }); gsap.set('#flapB', { svgOrigin: '300 420' }); gsap.set('#flapR', { svgOrigin: '420 300' }); gsap.set('#flapL', { svgOrigin: '180 300' });
  gsap.set('#ham path', { ...fb, scale: 0, rotate: -40 });
  gsap.set('#cheese rect', { opacity: 0, y: -160 });
  gsap.set('#egg', { y: -460, scale: .3, opacity: 0 });
  gsap.set('#chives rect', { opacity: 0, y: -80 });
  gsap.set('#buildName', { opacity: 0, y: 30, scale: .8 });
  const steps = $$('#steps li');
  const setStep = i => steps.forEach((li, k) => li.classList.toggle('is-on', k === i));
  let sealed = false;
  const build = gsap.timeline({ defaults: { ease: 'power2.out' },
    scrollTrigger: { trigger: '.build', start: 'top top', end: '+=420%', pin: '.build__pin', scrub: .8, anticipatePin: 1,
      onUpdate: s => {
        gsap.set('#buildBar', { scaleX: s.progress });
        const t = build.time();
        setStep(t < 1 ? 0 : t < 2 ? 1 : t < 3.2 ? 2 : t < 4.2 ? 3 : 4);
        if (t > 5.55 && !sealed) { sealed = true; const r = $('#galette').getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 200, 13); kick(); }
        if (t < 4.6) sealed = false;
      } } });
  build
    .to('#butter', { opacity: .28, duration: .45 }, 0).to('#butter', { opacity: 0, duration: .45 }, .5)
    .to('#billig', { scale: 1.03, transformOrigin: '300px 300px', duration: .5, yoyo: true, repeat: 1 }, 0)
    .to(['#batter', '#flaps'], { scale: 1, rotate: 0, duration: 1, ease: 'power3.out' }, 1)
    .to('#ham path', { scale: 1, rotate: 0, duration: .5, stagger: .14, ease: 'back.out(1.8)' }, 2)
    .to('#cheese rect', { opacity: 1, y: 0, duration: .4, stagger: .04, ease: 'bounce.out' }, 2.5)
    .to('#egg', { y: 0, scale: 1, opacity: 1, duration: .7, ease: 'bounce.out' }, 3.3)
    .to('#yolk', { scale: 1.12, ...fb, duration: .2, yoyo: true, repeat: 1 }, 4)
    .to('#chives rect', { opacity: 1, y: 0, duration: .3, stagger: .04 }, 4)
    .to(['#flapT', '#flapB'], { scaleY: -.78, fill: '#7E5126', duration: .6, ease: 'power2.inOut' }, 4.4)
    .to(['#flapR', '#flapL'], { scaleX: -.78, fill: '#855629', duration: .6, ease: 'power2.inOut' }, 4.9)
    .to('#cTBr', { attr: { x: 180, width: 240 }, duration: .45, ease: 'power2.inOut' }, 4.9)
    .to('#galette', { rotate: 8, scale: 1.04, transformOrigin: '50% 50%', duration: .5 }, 5.5)
    .to('#buildName', { opacity: 1, y: 0, scale: 1, duration: .5, ease: 'back.out(2)' }, 5.5)
    .to({}, { duration: .5 });

  /* ---------- carte ---------- */
  $$('.items').forEach(ul => gsap.from(ul.children, { x: -60, opacity: 0, duration: 1, stagger: .09, ease: 'expo.out', scrollTrigger: { trigger: ul, start: 'top 85%' } }));

  /* ---------- cidre : la bolée se remplit ---------- */
  gsap.fromTo('#liquid', { attr: { y: 290 } }, { attr: { y: 104 }, ease: 'none', scrollTrigger: { trigger: '.cidre', start: 'top 75%', end: 'center 45%', scrub: true } });
  gsap.fromTo('#foam', { attr: { y: 284 } }, { attr: { y: 94 }, ease: 'none', scrollTrigger: { trigger: '.cidre', start: 'top 75%', end: 'center 45%', scrub: true } });

  /* ---------- compteurs ---------- */
  $$('[data-count]').forEach(el => { const end = parseFloat(el.dataset.count), o = { v: 0 };
    gsap.to(o, { v: end, duration: 2.2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' }, onUpdate: () => { el.textContent = o.v.toFixed(1).replace('.', ','); } }); });

  /* ---------- carte au trésor : le chemin se trace ---------- */
  const pm = $('#pathMask');
  if (pm) {
    const L = pm.getTotalLength(); let found = false;
    gsap.set(pm, { strokeDasharray: L, strokeDashoffset: L });
    gsap.set('#mX', { scale: 0, rotate: -90 });
    gsap.set('#mMid', { opacity: 0 });
    gsap.timeline({ scrollTrigger: { trigger: '.parch', start: 'top 75%', end: 'bottom 55%', scrub: 1,
        onUpdate: s => { if (s.progress > .97 && !found) { found = true; const r = $('#mX').getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2, 220, 13); kick(); } if (s.progress < .7) found = false; } } })
      .to(pm, { strokeDashoffset: 0, ease: 'none', duration: 1 })
      .to('#mMid', { opacity: 1, duration: .1 }, .45)
      .to('#mX', { scale: 1, rotate: 0, duration: .18, ease: 'back.out(3)' }, .86);
  }

  /* ---------- pied de page ---------- */
  splitChars($('.foot__word'), false);
  gsap.from('.foot__word .ch', { yPercent: 110, opacity: 0, rotate: 12, duration: 1.2, stagger: .06, ease: 'expo.out', scrollTrigger: { trigger: '.foot__word', start: 'top 92%' } });

  addEventListener('load', () => ScrollTrigger.refresh());
})();
