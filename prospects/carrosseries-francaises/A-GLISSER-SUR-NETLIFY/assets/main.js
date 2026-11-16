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
  const yr = $('#year'); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- ouvert / fermé ---------- */
  const st = $('#openState');
  if (st) {
    const p = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
    const g = t => p.find(x => x.type === t)?.value || '';
    const d = g('weekday').slice(0, 3), m = (+g('hour')) * 60 + (+g('minute'));
    const slots = { lun: [[510, 720], [840, 1080]], mar: [[510, 750], [840, 1080]], mer: [[510, 750], [840, 1080]], jeu: [[510, 750], [840, 1080]], ven: [[510, 750], [810, 1050]] }[d] || [];
    const open = slots.some(([a, b]) => m >= a && m < b);
    st.textContent = open ? "L'atelier est ouvert" : "L'atelier est fermé en ce moment";
    st.classList.toggle('is-open', open);
  }

  /* ---------- pièce jointe ---------- */
  const drop = $('.drop');
  if (drop) drop.querySelector('input').addEventListener('change', e => {
    const f = e.target.files[0];
    drop.classList.toggle('has-file', !!f);
    if (f) { drop.querySelector('b').textContent = f.name; drop.querySelector('.drop__ico').textContent = '✓'; }
  });

  /* ---------- pause des animations hors écran ---------- */
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-off', !e.isIntersecting)), { rootMargin: '80px' });
    $$('.hero, .tri-band, .sin, .avis, .foot').forEach(el => io.observe(el));
  }

  /* ---------- curseur tricolore, aimant, inclinaison ---------- */
  if (fine && !reduce) {
    const c = $('#cursor'), lab = $('.cursor__label', c);
    let x = innerWidth / 2, y = innerHeight / 2, cx = x, cy = y;
    addEventListener('mousemove', e => { x = e.clientX; y = e.clientY; c.style.opacity = 1; });
    document.addEventListener('mouseleave', () => c.style.opacity = 0);
    const loop = () => { const vx = x - cx; cx += vx * .22; cy += (y - cy) * .22;
      c.style.transform = `translate3d(${cx}px,${cy}px,0) skewX(${Math.max(-25, Math.min(25, -vx * .6))}deg)`; requestAnimationFrame(loop); };
    loop();
    $$('a, button, input, select, textarea').forEach(el => { el.addEventListener('mouseenter', () => c.classList.add('is-link')); el.addEventListener('mouseleave', () => c.classList.remove('is-link')); });
    $$('[data-cursor]').forEach(el => { el.addEventListener('mouseenter', () => { lab.textContent = el.dataset.cursor; c.classList.add('is-label'); }); el.addEventListener('mouseleave', () => c.classList.remove('is-label')); });
    $$('[data-magnetic]').forEach(b => {
      b.addEventListener('mousemove', e => { const r = b.getBoundingClientRect(); b.style.transform = `translate(${(e.clientX - r.left - r.width / 2) * .25}px,${(e.clientY - r.top - r.height / 2) * .35}px)`; });
      b.addEventListener('mouseleave', () => { b.style.transform = ''; });
    });
    $$('[data-tilt]').forEach(el => {
      el.addEventListener('mousemove', e => { const r = el.getBoundingClientRect(); const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        el.style.transform = `rotateY(${px * 8}deg) rotateX(${-py * 8}deg) translateZ(0)`; });
      el.addEventListener('mouseleave', () => { el.style.transition = 'transform .6s cubic-bezier(.22,.8,.2,1)'; el.style.transform = ''; setTimeout(() => el.style.transition = '', 600); });
    });
  }

  /* ============ CABINE DE PEINTURE ============ */
  const cv = $('#paintCv');
  const painter = (() => {
    if (!cv) return null;
    const ctx = cv.getContext('2d');
    const layer = document.createElement('canvas'), lctx = layer.getContext('2d');
    const V = { w: 1000, h: 520 };
    const body = new Path2D('M70 330C70 300 90 285 130 280L260 262C320 200 380 170 470 165L610 165C680 168 740 205 800 255L880 268C920 275 940 295 940 320L940 350C940 362 930 368 918 368L860 368A70 70 0 0 0 720 368L330 368A70 70 0 0 0 190 368L90 368C78 368 70 360 70 348Z');
    const winA = new Path2D('M305 262C352 216 396 197 470 193L558 193 558 262Z');
    const winB = new Path2D('M578 193 612 193C664 197 708 222 752 262L578 262Z');
    let color = '#1E3F9A', W = 0, H = 0, s = 1, ox = 0, oy = 0, dirty = true, touched = false;
    const size = () => {
      const r = cv.getBoundingClientRect(); W = r.width; H = r.height;
      cv.width = W * DPR; cv.height = H * DPR; if (layer.width !== V.w) { layer.width = V.w; layer.height = V.h; }
      s = Math.min(W / V.w, H / 330) * .94; ox = (W - V.w * s) / 2; oy = H * .56 - 300 * s;
      dirty = true;
    };
    const keep = document.createElement('canvas');
    const resize = () => { keep.width = layer.width; keep.height = layer.height; keep.getContext('2d').drawImage(layer, 0, 0); size(); lctx.drawImage(keep, 0, 0); };
    size();
    addEventListener('resize', resize);
    const spray = (vx, vy, col = color, n = 34, rad = 30) => {
      lctx.fillStyle = col;
      for (let i = 0; i < n; i++) {
        const a = Math.random() * 6.283, d = Math.sqrt(-2 * Math.log(Math.random() + 1e-6)) * rad * .45;
        lctx.globalAlpha = .18 + Math.random() * .3;
        lctx.beginPath(); lctx.arc(vx + Math.cos(a) * d, vy + Math.sin(a) * d, 1.5 + Math.random() * 4.5, 0, 6.283); lctx.fill();
      }
      lctx.globalAlpha = 1; dirty = true;
    };
    const wheel = (x0, y0) => {
      ctx.fillStyle = '#0B0C0E'; ctx.beginPath(); ctx.arc(x0, y0, 58, 0, 6.283); ctx.fill();
      const g = ctx.createRadialGradient(x0 - 10, y0 - 10, 4, x0, y0, 40); g.addColorStop(0, '#E8ECEF'); g.addColorStop(1, '#59616A');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x0, y0, 38, 0, 6.283); ctx.fill();
      ctx.strokeStyle = '#2A2F35'; ctx.lineWidth = 5;
      for (let k = 0; k < 5; k++) { const a = k * 1.2566 + .3; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.cos(a) * 36, y0 + Math.sin(a) * 36); ctx.stroke(); }
      ctx.fillStyle = '#C8102E'; ctx.beginPath(); ctx.arc(x0 + 24, y0 - 14, 7, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#20252A'; ctx.beginPath(); ctx.arc(x0, y0, 8, 0, 6.283); ctx.fill();
    };
    const draw = () => {
      if (!dirty) return; dirty = false;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.clearRect(0, 0, W, H);
      ctx.save(); ctx.translate(ox, oy); ctx.scale(s, s);
      // ombre au sol
      const sh = ctx.createRadialGradient(505, 430, 10, 505, 430, 470); sh.addColorStop(0, 'rgba(0,0,0,.55)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = sh; ctx.beginPath(); ctx.ellipse(505, 428, 470, 26, 0, 0, 6.283); ctx.fill();
      // apprêt
      const pr = ctx.createLinearGradient(0, 165, 0, 368); pr.addColorStop(0, '#9AA1A8'); pr.addColorStop(1, '#6F767D');
      ctx.fillStyle = pr; ctx.fill(body);
      // peinture
      ctx.save(); ctx.clip(body); ctx.drawImage(layer, 0, 0);
      // reflets
      const hl = ctx.createLinearGradient(0, 165, 0, 368);
      hl.addColorStop(0, 'rgba(255,255,255,.35)'); hl.addColorStop(.32, 'rgba(255,255,255,.08)'); hl.addColorStop(.36, 'rgba(255,255,255,.28)'); hl.addColorStop(.42, 'rgba(255,255,255,0)'); hl.addColorStop(1, 'rgba(0,0,0,.35)');
      ctx.fillStyle = hl; ctx.fillRect(0, 0, V.w, V.h);
      ctx.restore();
      // vitres
      const gl = ctx.createLinearGradient(300, 190, 760, 262); gl.addColorStop(0, '#1A2230'); gl.addColorStop(.5, '#3A4A5E'); gl.addColorStop(1, '#141A24');
      ctx.fillStyle = gl; ctx.fill(winA); ctx.fill(winB);
      ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.lineWidth = 3; ctx.stroke(winA); ctx.stroke(winB);
      // lignes de carrosserie
      ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(568, 190); ctx.lineTo(568, 340); ctx.moveTo(380, 270); ctx.lineTo(390, 350); ctx.stroke();
      ctx.fillStyle = 'rgba(0,0,0,.45)'; ctx.fillRect(470, 284, 40, 7);
      // phares / feux
      ctx.fillStyle = '#F5F0D8'; ctx.beginPath(); ctx.ellipse(900, 292, 26, 10, -.2, 0, 6.283); ctx.fill();
      ctx.fillStyle = '#C8102E'; ctx.fillRect(76, 292, 22, 18);
      // contour
      ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.lineWidth = 3; ctx.stroke(body);
      wheel(260, 368); wheel(790, 368);
      ctx.restore();
    };
    const toV = (cx, cy) => { const r = cv.getBoundingClientRect(); return [(cx - r.left - ox) / s, (cy - r.top - oy) / s]; };
    let down = false, last = null;
    const hint = $('#paintHint');
    const hide = () => { if (!touched) { touched = true; hint.style.opacity = 0; } };
    const move = e => {
      const [vx, vy] = toV(e.clientX, e.clientY);
      if (e.pointerType === 'mouse' || down) {
        if (last) { const dx = vx - last[0], dy = vy - last[1], n = Math.max(1, Math.hypot(dx, dy) / 10); for (let i = 1; i <= n; i++) spray(last[0] + dx * i / n, last[1] + dy * i / n, color, 12); }
        else spray(vx, vy);
        last = [vx, vy]; hide();
      }
    };
    cv.addEventListener('pointermove', move);
    cv.addEventListener('pointerdown', e => { down = true; last = null; cv.setPointerCapture?.(e.pointerId); move(e); });
    addEventListener('pointerup', () => { down = false; last = null; });
    cv.addEventListener('pointerleave', () => { last = null; });
    $$('.sw').forEach(b => b.addEventListener('click', () => { $$('.sw').forEach(x => x.classList.toggle('is-on', x === b)); color = b.dataset.color; }));
    $('#paintReset').addEventListener('click', () => { lctx.clearRect(0, 0, layer.width, layer.height); dirty = true; });
    const raf = () => { draw(); requestAnimationFrame(raf); };
    raf();
    // démo automatique : le tricolore à la première apparition
    const demo = () => {
      if (reduce) { [['#1E3F9A', 70, 380], ['#F2F4F6', 380, 650], ['#E2312A', 650, 940]].forEach(([c, a, b]) => { lctx.fillStyle = c; lctx.fillRect(a, 150, b - a, 240); }); dirty = true; return; }
      const bands = [['#1E3F9A', 70, 380], ['#F2F4F6', 380, 650], ['#E2312A', 650, 945]];
      let t0 = null; const dur = 2600;
      const step = t => {
        if (!t0) t0 = t; const p = Math.min(1, (t - t0) / dur);
        const x = 70 + p * 880;
        for (let k = 0; k < 7; k++) { const y = 165 + ((k * 37 + p * 900) % 210); const b = bands.find(([, a, z]) => x >= a && x < z) || bands[2]; spray(x + (Math.random() - .5) * 30, y, b[0], 26, 34); }
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    return { demo, size };
  })();
  if (cv) {
    let did = false;
    new IntersectionObserver(([e]) => { if (e.isIntersecting && !did) { did = true; setTimeout(() => painter.demo(), 400); } }, { threshold: .45 }).observe(cv);
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
      e.preventDefault(); lenis.scrollTo(el, { offset: t === '#top' ? 0 : -40, duration: 1.4 });
    }));
  }

  /* ---------- header + progression ---------- */
  const head = $('#head'); let lastY = 0;
  ScrollTrigger.create({ start: 0, end: 'max', onUpdate: s => {
    const yy = s.scroll();
    head.classList.toggle('is-scrolled', yy > 40);
    head.classList.toggle('is-hidden', yy > 500 && yy > lastY && !document.body.classList.contains('menu-open'));
    lastY = yy;
    gsap.set('.progress', { scaleX: s.progress });
  }});

  /* ---------- découpages ---------- */
  $$('[data-split]').forEach(el => {
    const t = el.textContent; el.textContent = '';
    t.split(' ').forEach((word, wi) => {
      if (wi) el.appendChild(document.createTextNode(' '));
      const wd = document.createElement('span'); wd.className = 'wd';
      [...word].forEach(ch => { const w = document.createElement('span'); w.className = 'chw'; const s = document.createElement('span'); s.className = 'ch'; s.textContent = ch; w.appendChild(s); wd.appendChild(w); });
      el.appendChild(wd);
    });
  });
  // le dégradé tricolore couvre toute la ligne, lettre par lettre
  const tri = $('.hl--tri');
  if (tri) {
    const place = () => { $$('.ch', tri).forEach(ch => { const r = ch.closest('.wd').getBoundingClientRect(); const c = ch.getBoundingClientRect(); ch.style.backgroundSize = `${r.width}px 100%`; ch.style.backgroundPosition = `${r.left - c.left}px 0`; }); };
    document.fonts?.ready.then(place); addEventListener('resize', place); place();
  }
  $$('[data-lines]').forEach(el => {
    const frag = document.createDocumentFragment();
    el.childNodes.forEach(n => {
      const isEm = n.nodeType === 1;
      (n.textContent.match(/\S+\s*/g) || []).forEach(word => {
        const m = document.createElement('span'); m.className = 'line-mask';
        const s = document.createElement(isEm ? 'em' : 'span'); s.textContent = word.trimEnd();
        m.appendChild(s); frag.appendChild(m); frag.appendChild(document.createTextNode(' '));
      });
    });
    el.textContent = ''; el.appendChild(frag);
  });

  /* ============ INTRO : LE LOGO SE CONSTRUIT ============ */
  const iC = $('#iC'), L = iC.getTotalLength();
  gsap.set(iC, { strokeDasharray: L, strokeDashoffset: L });
  gsap.set(['#iB', '#iW', '#iR'], { x: -260, opacity: 0, skewX: -20 });
  gsap.set('.intro__name', { opacity: 0, y: 20, letterSpacing: '.6em' });
  const heroBits = $$('[data-hero]').filter(e => e.dataset.hero !== 'car');
  gsap.set('.hl .ch', { yPercent: 120, skewX: -20 });
  gsap.set(heroBits, { y: 30, opacity: 0 });
  gsap.set('.hero__frame', { clipPath: 'polygon(14% 0,14% 0,0 100%,0 100%)' });
  gsap.set('.hero__frame img', { scale: 1.3, x: -60 });
  gsap.set('.hero__tag', { x: -40, opacity: 0 });
  gsap.set('.hero__mark', { opacity: 0, x: 200 });

  gsap.timeline({ defaults: { ease: 'expo.out' } })
    .to(iC, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' })
    .to('#iB', { x: 0, opacity: 1, skewX: 0, duration: .7 }, '-=.25')
    .to('#iW', { x: 0, opacity: 1, skewX: 0, duration: .7 }, '-=.58')
    .to('#iR', { x: 0, opacity: 1, skewX: 0, duration: .7 }, '-=.58')
    .to('.intro__name', { opacity: 1, y: 0, letterSpacing: '.2em', duration: 1 }, '-=.6')
    .to('.intro__logo', { scale: 1.06, duration: .3, ease: 'power2.out' }, '+=.15')
    .to(['#iB', '#iW', '#iR'], { x: 900, opacity: 0, duration: .55, stagger: .05, ease: 'power3.in' }, '+=.05')
    .to(iC, { opacity: 0, duration: .3 }, '<.2')
    .to('.intro__name', { opacity: 0, x: 60, duration: .3 }, '<')
    .to('.wipe i', { xPercent: 420, duration: .9, stagger: .07, ease: 'power3.inOut' }, '<.05')
    .add(() => { endIntro(); if (window.lenis) lenis.start(); }, '<.5')
    .to('.hl .ch', { yPercent: 0, skewX: 0, duration: 1.1, stagger: .03 }, '<-.1')
    .to('.hero__frame', { clipPath: 'polygon(14% 0,100% 0,86% 100%,0 100%)', duration: 1.3, ease: 'expo.inOut' }, '<.1')
    .to('.hero__frame img', { scale: 1, x: 0, duration: 1.8 }, '<.2')
    .to(heroBits, { y: 0, opacity: 1, duration: 1, stagger: .07 }, '<.2')
    .to('.hero__tag', { x: 0, opacity: 1, duration: .9 }, '<.4')
    .to('.hero__mark', { opacity: .07, x: 0, duration: 2 }, '<-.4');

  /* parallaxe du hero */
  const hs = { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true };
  gsap.to('.hero__text', { y: 120, opacity: 0, ease: 'none', scrollTrigger: hs });
  gsap.to('.hero__car', { y: -80, rotate: -3, ease: 'none', scrollTrigger: hs });
  gsap.to('.hero__mark', { xPercent: -20, ease: 'none', scrollTrigger: hs });

  /* ---------- bandeaux ---------- */
  $$('[data-marquee]').forEach(track => {
    const dir = +track.dataset.marquee;
    track.innerHTML += track.innerHTML + track.innerHTML;
    let x = 0, boost = 0;
    ScrollTrigger.create({ onUpdate: s => { boost = Math.min(Math.abs(s.getVelocity()) / 220, 9); } });
    gsap.ticker.add((t, dt) => { boost *= .94; x -= (0.05 + boost * .05) * dt * dir; const W = track.scrollWidth / 3; if (x <= -W) x += W; if (x > 0) x -= W; track.style.transform = `translate3d(${x}px,0,0)`; });
  });

  /* ---------- titres, apparitions ---------- */
  $$('[data-lines]').forEach(el => gsap.from(el.querySelectorAll('.line-mask > *'), { yPercent: 120, skewX: -15, duration: 1.1, ease: 'expo.out', stagger: .05, scrollTrigger: { trigger: el, start: 'top 86%' } }));
  $$('[data-reveal]').forEach(el => gsap.from(el, { y: 50, opacity: 0, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 90%' } }));

  /* ---------- savoir-faire : les cartes arrivent en glissant ---------- */
  ScrollTrigger.batch('.svc', { start: 'top 90%', once: true,
    onEnter: b => gsap.fromTo(b, { x: -80, skewX: -10, opacity: 0 }, { x: 0, skewX: 0, opacity: 1, duration: 1, stagger: .08, ease: 'expo.out', clearProps: 'transform' }) });
  gsap.set('.svc', { opacity: 0 });

  /* ---------- sinistre : défilement horizontal épinglé ---------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 761px)', () => {
    const track = $('#sinTrack');
    const dist = () => Math.max(0, track.scrollWidth - innerWidth + 40);
    const road = $('.sin__road');
    gsap.timeline({ scrollTrigger: { trigger: '.sin', start: 'top top', end: () => '+=' + dist() * 1.1, pin: true, scrub: 1, invalidateOnRefresh: true, anticipatePin: 1 } })
      .to(track, { x: () => -dist(), ease: 'none' }, 0)
      .to('#sinCar', { x: () => road.offsetWidth - 90, ease: 'none' }, 0);
  });

  /* ---------- chiffres ---------- */
  $$('[data-count]').forEach(el => {
    const end = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0), plain = el.hasAttribute('data-plain'), o = { v: plain ? end - 30 : 0 };
    gsap.to(o, { v: end, duration: 2, ease: 'power3.out', scrollTrigger: { trigger: el, start: 'top 88%' },
      onUpdate: () => { el.textContent = dec ? o.v.toFixed(dec).replace('.', ',') : Math.round(o.v); } });
  });

  /* ---------- atelier : la bobine défile avec le scroll ---------- */
  mm.add('(min-width: 761px)', () => {
    gsap.fromTo('#reel', { x: 0 }, { x: () => -($('#reel').scrollWidth - innerWidth) * .8, ease: 'none',
      scrollTrigger: { trigger: '.reel', start: 'top bottom', end: 'bottom top', scrub: 1, invalidateOnRefresh: true } });
  });
  ScrollTrigger.batch('.shot', { start: 'top 95%', once: true,
    onEnter: b => gsap.fromTo(b, { clipPath: 'polygon(10% 0,10% 0,0 100%,0 100%)' }, { clipPath: 'polygon(10% 0,100% 0,90% 100%,0 100%)', duration: 1.2, stagger: .1, ease: 'expo.inOut' }) });

  /* ---------- pied de page : le logo se reconstruit ---------- */
  const ft = gsap.timeline({ scrollTrigger: { trigger: '.foot', start: 'top 85%' } });
  ft.from('.foot__logo .cf-c', { opacity: 0, x: -80, duration: 1, ease: 'expo.out' })
    .from(['.foot__logo .cf-b', '.foot__logo .cf-w', '.foot__logo .cf-r'], { x: 300, opacity: 0, duration: .9, stagger: .1, ease: 'expo.out' }, '-=.7')
    .from('.foot__name', { letterSpacing: '.6em', opacity: 0, duration: 1.2, ease: 'expo.out' }, '-=.8');

  addEventListener('load', () => { ScrollTrigger.refresh(); painter?.size(); });
})();
