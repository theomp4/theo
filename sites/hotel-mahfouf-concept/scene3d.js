/* Hôtel Mahfouf, concept : 3D temps réel (Three.js r158).
   Un seul canvas WebGL fixe. Chaque élément [data-model] reçoit son objet
   et [data-gallery] la galerie circulaire de photos, chacun rendu dans son
   propre viewport/scissor et collé au DOM pendant le scroll. */
(function () {
  "use strict";
  var HM = window.HM || (window.HM = {});
  if (typeof window.THREE === "undefined") return;
  var T = window.THREE;

  var renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" }); }
  catch (e) { return; }
  if (!renderer || !renderer.getContext()) return;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.autoClear = false;
  var cv = renderer.domElement;
  cv.id = "gl"; cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:fixed;left:0;top:0;z-index:30;pointer-events:none";
  var W = 0, H = 0;
  function size() {
    var w = document.documentElement.clientWidth, h = window.innerHeight;
    if (w !== W || h !== H) { W = w; H = h; renderer.setSize(W, H, true); }
  }

  /* ---------- Studio : softboxes chaudes sur fond sombre ---------- */
  function makeEnv(room, front) {
    var pm = new T.PMREMGenerator(renderer), sc = new T.Scene();
    sc.add(new T.Mesh(new T.BoxGeometry(14, 14, 14), new T.MeshBasicMaterial({ color: room || 0x0c0a09, side: T.BackSide })));
    if (front) { panel(0xffe2c0, front, 0, 0.2, 6.8, 13, 4); panel(0xffe2c0, front * 0.8, 0, 0.2, -6.8, 13, 3); }
    function panel(c, k, x, y, z, sx, sy) {
      var m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k), side: T.DoubleSide }));
      m.position.set(x, y, z); m.scale.set(sx, sy, 1); m.lookAt(0, 0, 0); sc.add(m);
    }
    panel(0xfff1e0, 9, 0, 6.5, 1.5, 6, 3);      // softbox haut
    panel(0xffe2c4, 4.5, -6.5, 1, 2, 1.4, 7);   // strip gauche
    panel(0xffffff, 3.2, 6.5, 0.5, -1, 1.4, 7); // strip droite (liseré)
    panel(0xffd9b0, 2.4, 0, -1.2, 6.5, 11, 1.6); // réflexion basse face
    panel(0x8a6338, 2.4, 0, -6.5, 0, 12, 12);   // sol chaud
    // bandeaux à hauteur d'horizon : ce que reflètent les surfaces polies
    panel(0xffe6c8, 3.2, -4.5, 0.4, -4.5, 5, 0.9);
    panel(0xffefe0, 3.6, 4.5, 0.6, -4.5, 5, 0.9);
    panel(0xffd9b0, 2.4, 0, 1.2, -6.5, 7, 1.2);
    var tex = pm.fromScene(sc, 0.02).texture; pm.dispose(); return tex;
  }
  var ENV = makeEnv();
  var ENV_BELL = makeEnv(0x2a2219, 1.6);

  /* ---------- Textures canvas ---------- */
  var ANI = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  function ctex(w, h, draw, srgb) {
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    draw(c.getContext("2d"), w, h);
    var t = new T.CanvasTexture(c);
    if (srgb !== false) t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = ANI; return t;
  }
  function noise(x, w, h, amt, base) {
    x.fillStyle = base; x.fillRect(0, 0, w, h);
    var img = x.getImageData(0, 0, w, h), d = img.data;
    for (var p = 0; p < d.length; p += 4) { var n = (Math.random() - 0.5) * amt; d[p] += n; d[p + 1] += n; d[p + 2] += n; }
    x.putImageData(img, 0, 0);
  }
  // laiton brossé : rugosité qui varie le long d'un axe
  var brushed = ctex(512, 512, function (x, w, h) {
    x.fillStyle = "rgb(0,92,255)"; x.fillRect(0, 0, w, h);
    for (var i = 0; i < 1400; i++) { var g = 70 + Math.random() * 60; x.fillStyle = "rgba(0," + (g | 0) + ",255,.5)"; x.fillRect(0, Math.random() * h, w, 1); }
  }, false);
  brushed.wrapS = brushed.wrapT = T.RepeatWrapping; brushed.repeat.set(2, 2);

  var F_SERIF = "'Bodoni Moda', 'Didot', 'Bodoni 72', Georgia, serif";
  var F_SANS = "'Inter Tight', 'Helvetica Neue', Arial, sans-serif";

  var BRASS = new T.MeshPhysicalMaterial({ color: 0xcfa760, metalness: 1, roughness: 0.3, roughnessMap: brushed, metalnessMap: brushed, clearcoat: 0.4, clearcoatRoughness: 0.18, envMapIntensity: 1.15 });
  var BRASS_POLISHED = new T.MeshPhysicalMaterial({ color: 0xd9b36a, metalness: 1, roughness: 0.07, clearcoat: 1, clearcoatRoughness: 0.03, envMapIntensity: 1.2 });

  function roundRect(w, h, r) {
    var s = new T.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function pill(w, h) { // rectangle aux extrémités en demi-cercle
    var s = new T.Shape(), r = w / 2, k = h / 2 - r;
    s.moveTo(-r, -k); s.lineTo(-r, k); s.absarc(0, k, r, Math.PI, 0, true); s.lineTo(r, -k); s.absarc(0, -k, r, 0, Math.PI, true);
    return s;
  }
  // deux faces d'une ExtrudeGeometry : avant (0), côtés (1), arrière (2)
  function splitLids(geo) {
    var g0 = geo.groups[0], half = g0.count / 2, pos = geo.attributes.position, zA = 0;
    for (var i = g0.start; i < g0.start + 3; i++) zA += pos.getZ(i);
    var firstIsBack = zA < 0, sides = geo.groups.slice(1);
    geo.clearGroups();
    geo.addGroup(g0.start, half, firstIsBack ? 2 : 0);
    geo.addGroup(g0.start + half, half, firstIsBack ? 0 : 2);
    sides.forEach(function (g) { geo.addGroup(g.start, g.count, 1); });
  }
  function fit(t, minX, minY, w, h) { t.repeat.set(1 / w, 1 / h); t.offset.set(-minX / w, -minY / h); return t; }
  function mirror(t) { t.repeat.x = -t.repeat.x; t.offset.x = 1 - t.offset.x; return t; }

  /* ---------- Clé d'hôtel : porte-clé cuir + lettrage or, clé laiton ---------- */
  function fobSet(w, h, side) {
    // trois textures cohérentes : couleur, rugosité/métal (G/B), relief
    var W2 = 640, H2 = Math.round(640 * h / w);
    function layout(x, mode) {
      // mode: "col" couleur | "mr" métal-rugosité | "bump"
      var cx = W2 / 2;
      var foil = mode === "col" ? "#e0bd76" : mode === "mr" ? "rgb(0,105,255)" : "#fff";
      x.fillStyle = foil; x.strokeStyle = foil;
      x.textAlign = "center"; x.textBaseline = "middle";
      if (side === "front") {
        x.font = "500 64px " + F_SANS; x.fillText("HÔTEL", cx, H2 * 0.30);
        x.font = "500 300px " + F_SERIF; x.fillText("104", cx, H2 * 0.53);
        x.font = "500 52px " + F_SANS; x.fillText("MAHFOUF", cx, H2 * 0.73);
        x.lineWidth = 3; x.beginPath(); x.moveTo(cx - 90, H2 * 0.635); x.lineTo(cx + 90, H2 * 0.635); x.stroke();
        x.font = "500 30px " + F_SANS; x.fillText("PARIS", cx, H2 * 0.80);
      } else {
        x.font = "italic 400 46px " + F_SERIF;
        x.fillText("Merci de déposer", cx, H2 * 0.45); x.fillText("la clé", cx, H2 * 0.5); x.fillText("à la réception", cx, H2 * 0.55);
        x.font = "500 26px " + F_SANS; x.fillText("HÔTEL MAHFOUF · CHAMBRE 104", cx, H2 * 0.66);
      }
    }
    function stitches(x, col, lw) {
      x.save(); x.strokeStyle = col; x.lineWidth = lw; x.setLineDash([22, 14]); x.lineCap = "round";
      var r = W2 / 2 - 34, top = r + 34, bot = H2 - r - 34;
      x.beginPath(); x.moveTo(34, bot); x.lineTo(34, top); x.arc(W2 / 2, top, r, Math.PI, 0); x.lineTo(W2 - 34, bot); x.arc(W2 / 2, bot, r, 0, Math.PI); x.stroke();
      x.restore();
    }
    var col = ctex(W2, H2, function (x) {
      noise(x, W2, H2, 22, "#3d0c14");
      var g = x.createLinearGradient(0, 0, W2, H2); g.addColorStop(0, "rgba(255,200,180,.06)"); g.addColorStop(1, "rgba(0,0,0,.18)");
      x.fillStyle = g; x.fillRect(0, 0, W2, H2);
      stitches(x, "#8a4a4e", 5); layout(x, "col");
    });
    var mr = ctex(W2, H2, function (x) {
      noise(x, W2, H2, 30, "rgb(0,150,0)"); stitches(x, "rgb(0,190,0)", 5); layout(x, "mr");
    }, false);
    var bump = ctex(W2, H2, function (x) {
      noise(x, W2, H2, 70, "#808080");
      // grain de cuir : petits pores
      for (var i = 0; i < 9000; i++) { x.fillStyle = "rgba(0,0,0,.25)"; x.beginPath(); x.arc(Math.random() * W2, Math.random() * H2, Math.random() * 2 + 0.5, 0, 7); x.fill(); }
      stitches(x, "#202020", 7); x.globalAlpha = 0.9; layout(x, "bump"); x.globalAlpha = 1;
    }, false);
    [col, mr, bump].forEach(function (t) { fit(t, -w / 2, -h / 2, w, h); if (side === "back") mirror(t); });
    return new T.MeshPhysicalMaterial({ map: col, roughnessMap: mr, metalnessMap: mr, roughness: 1, metalness: 1, bumpMap: bump, bumpScale: 2.2, clearcoat: 0.25, clearcoatRoughness: 0.5, sheen: 0.4, sheenRoughness: 0.6, sheenColor: new T.Color(0x7a3038) });
  }
  function key() {
    var g = new T.Group();
    // porte-clé
    var w = 1.3, h = 3.0;
    var shape = pill(w, h);
    var hole = new T.Path(); hole.absarc(0, h / 2 - 0.42, 0.13, 0, Math.PI * 2, true); shape.holes.push(hole);
    var geo = new T.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.07, bevelSize: 0.06, bevelSegments: 10, curveSegments: 48 });
    geo.center(); splitLids(geo);
    var edge = new T.MeshPhysicalMaterial({ color: 0x1e0509, roughness: 0.42, clearcoat: 0.5, clearcoatRoughness: 0.3 });
    var fob = new T.Mesh(geo, [fobSet(w, h, "front"), edge, fobSet(w, h, "back")]);
    g.add(fob);
    var eyelet = new T.Mesh(new T.TorusGeometry(0.15, 0.04, 16, 48), BRASS_POLISHED); eyelet.position.set(0, h / 2 - 0.42, 0.135); g.add(eyelet);
    var eyelet2 = eyelet.clone(); eyelet2.position.z = -0.135; g.add(eyelet2);
    // anneau
    var ringY = h / 2 - 0.42 + 0.34;
    var ring = new T.Mesh(new T.TorusGeometry(0.34, 0.032, 16, 96), BRASS_POLISHED); ring.rotation.y = Math.PI / 2; ring.position.y = ringY; g.add(ring);
    // clé
    var k = new T.Group();
    var bow = new T.Mesh(new T.TorusGeometry(0.3, 0.075, 24, 72), BRASS); k.add(bow);
    var inner = new T.Mesh(new T.TorusGeometry(0.17, 0.03, 12, 48), BRASS); k.add(inner);
    var cross = new T.Mesh(new T.CylinderGeometry(0.025, 0.025, 0.34, 12), BRASS); cross.rotation.z = Math.PI / 2; k.add(cross);
    var collar = new T.Mesh(new T.CylinderGeometry(0.11, 0.11, 0.12, 32), BRASS); collar.position.y = 0.42; k.add(collar);
    var collar2 = new T.Mesh(new T.CylinderGeometry(0.095, 0.095, 0.05, 32), BRASS); collar2.position.y = 0.52; k.add(collar2);
    var shaft = new T.Mesh(new T.CylinderGeometry(0.06, 0.068, 1.55, 32), BRASS); shaft.position.y = 1.3; k.add(shaft);
    var tipC = new T.Mesh(new T.CylinderGeometry(0.085, 0.085, 0.06, 32), BRASS); tipC.position.y = 1.62; k.add(tipC);
    var bs = new T.Shape(); // panneton à encoches
    bs.moveTo(0, 0); bs.lineTo(0.42, 0); bs.lineTo(0.42, 0.1); bs.lineTo(0.32, 0.1); bs.lineTo(0.32, 0.18); bs.lineTo(0.42, 0.18); bs.lineTo(0.42, 0.34); bs.lineTo(0.24, 0.34); bs.lineTo(0.24, 0.26); bs.lineTo(0.14, 0.26); bs.lineTo(0.14, 0.4); bs.lineTo(0, 0.4); bs.closePath();
    var bg = new T.ExtrudeGeometry(bs, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2 });
    var bit = new T.Mesh(bg, BRASS); bit.position.set(0.03, 1.66, -0.035); k.add(bit);
    var end = new T.Mesh(new T.SphereGeometry(0.068, 24, 16), BRASS); end.position.y = 2.08; end.scale.y = 0.5; k.add(end);
    k.rotation.y = Math.PI / 2;            // le plan de l'anneau de la clé croise l'anneau
    k.position.y = ringY + 0.34 + 0.24;    // l'anneau de la clé passe dans l'anneau
    var kw = new T.Group(); kw.add(k); kw.rotation.z = 0.12; g.add(kw);
    g.rotation.z = -0.62;                  // composition en diagonale
    return g;
  }

  /* ---------- Sonnette de réception ---------- */
  function bell() {
    var g = new T.Group();
    var marbleCol = ctex(1024, 1024, function (x, w, h) {
      x.fillStyle = "#0f0e0d"; x.fillRect(0, 0, w, h);
      for (var v = 0; v < 14; v++) {
        x.strokeStyle = "rgba(220,210,195," + (0.05 + Math.random() * 0.12) + ")"; x.lineWidth = 0.8 + Math.random() * 2.2;
        x.beginPath(); var px = Math.random() * w, py = 0; x.moveTo(px, py);
        while (py < h) { px += (Math.random() - 0.5) * 60; py += 20 + Math.random() * 40; x.lineTo(px, py); }
        x.stroke();
      }
    });
    marbleCol.wrapS = marbleCol.wrapT = T.RepeatWrapping;
    var marble = new T.MeshStandardMaterial({ map: marbleCol, roughness: 0.14, metalness: 0, envMapIntensity: 1.1 });
    var base = new T.Mesh(new T.CylinderGeometry(1.25, 1.3, 0.32, 96), marble); base.position.y = 0.16; g.add(base);
    var trim = new T.Mesh(new T.TorusGeometry(1.25, 0.022, 12, 128), BRASS_POLISHED); trim.rotation.x = Math.PI / 2; trim.position.y = 0.32; g.add(trim);
    var prof = [[0.001, 1.02], [0.22, 1.0], [0.46, 0.93], [0.66, 0.8], [0.82, 0.62], [0.94, 0.4], [1.02, 0.2], [1.1, 0.06], [1.13, 0.0]];
    var pts = new T.SplineCurve(prof.map(function (p) { return new T.Vector2(p[0], p[1]); })).getPoints(64).reverse(); // du bas vers le haut : normales vers l'extérieur
    var domeMat = BRASS_POLISHED.clone(); domeMat.side = T.DoubleSide;
    var dome = new T.Mesh(new T.LatheGeometry(pts, 128), domeMat); dome.position.y = 0.32; g.add(dome);
    var plunger = new T.Group();
    var stem = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.3, 24), BRASS_POLISHED); stem.position.y = 0.15; plunger.add(stem);
    var knob = new T.Mesh(new T.SphereGeometry(0.12, 32, 24), BRASS_POLISHED); knob.position.y = 0.33; knob.scale.y = 0.75; plunger.add(knob);
    plunger.position.y = 1.32; g.add(plunger);
    g.userData.plunger = plunger;
    return g;
  }

  /* ---------- Scènes objets ---------- */
  var BUILD = { key: key, bell: bell };
  var models = {};
  function getModel(id) {
    if (models[id]) return models[id];
    var sc = new T.Scene(); sc.environment = id === "bell" ? ENV_BELL : ENV;
    var kl = new T.DirectionalLight(0xfff0dd, 1.4); kl.position.set(2, 5, 4); sc.add(kl);
    var rl = new T.DirectionalLight(0xffd7a8, 0.8); rl.position.set(-4, 1, -3); sc.add(rl);
    var obj = BUILD[id]();
    var box = new T.Box3().setFromObject(obj), ctr = box.getCenter(new T.Vector3());
    var s = 1.3 / box.getBoundingSphere(new T.Sphere()).radius;
    obj.position.sub(ctr);
    var holder = new T.Group(); holder.add(obj); holder.scale.setScalar(s);
    var pivot = new T.Group(); pivot.add(holder); sc.add(pivot);
    var cam = new T.PerspectiveCamera(26, 1, 0.1, 60);
    models[id] = { scene: sc, pivot: pivot, obj: obj, cam: cam };
    return models[id];
  }
  function frameCam(cam, aspect, zoom, ty) {
    cam.aspect = aspect;
    var vf = T.MathUtils.degToRad(cam.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
    var d = (1.38 / Math.sin(Math.min(vf, hf) / 2)) / (zoom || 1);
    cam.position.set(0, d * 0.08 + (ty || 0), d); cam.lookAt(0, ty || 0, 0); cam.updateProjectionMatrix();
  }

  /* ---------- Galerie circulaire (photos réelles) ---------- */
  var gal = null;
  function buildGallery(el) {
    var list = (HM.gallery || []);
    if (!list.length) return null;
    var N = list.length, PW = 3, PH = 4, GAP = 0.55;
    var R = (N * (PW + GAP)) / (Math.PI * 2);
    var sc = new T.Scene(), ring = new T.Group(); sc.add(ring);
    var loader = new T.TextureLoader();
    var items = list.map(function (src, i) {
      var geo = new T.PlaneGeometry(PW, PH, 40, 1), pos = geo.attributes.position;
      for (var v = 0; v < pos.count; v++) { var x = pos.getX(v), a = x / R; pos.setX(v, R * Math.sin(a)); pos.setZ(v, R * Math.cos(a) - R); }
      geo.computeBoundingSphere();
      var mat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: T.DoubleSide, toneMapped: false });
      var m = new T.Mesh(geo, mat), th = (i / N) * Math.PI * 2;
      m.position.set(R * Math.sin(th), 0, R * Math.cos(th)); m.rotation.y = th;
      ring.add(m);
      loader.load(src, function (t) {
        t.colorSpace = T.SRGBColorSpace; t.anisotropy = ANI;
        var ia = t.image.width / t.image.height, pa = PW / PH;
        if (ia > pa) { t.repeat.set(pa / ia, 1); t.offset.set((1 - pa / ia) / 2, 0); } else { t.repeat.set(1, ia / pa); t.offset.set(0, (1 - ia / pa) / 2); }
        mat.map = t; mat.needsUpdate = true; mat.userData.ready = true;
      });
      return { mesh: m, mat: mat, th: th };
    });
    var cam = new T.PerspectiveCamera(30, 1, 0.1, 100);
    return { el: el, scene: sc, ring: ring, items: items, N: N, R: R, PW: PW, PH: PH, cam: cam, rot: 0 };
  }
  function renderGallery(rect, clip) {
    var g = gal, w = rect.r - rect.l, h = rect.b - rect.t, aspect = w / h;
    var target = (HM.galleryPos || 0) * (Math.PI * 2 / g.N);
    g.rot += (target - g.rot) * 0.09;
    g.ring.rotation.y = -g.rot + ptr.x * 0.035;
    g.ring.rotation.x = ptr.y * 0.02;
    g.ring.position.y = Math.sin(time * 0.6) * 0.04;
    g.items.forEach(function (it) {
      var a = it.th - g.rot, c = Math.cos(a);
      var on = it.mat.userData.ready ? 1 : 0;
      it.mat.opacity += ((on ? (0.18 + 0.82 * Math.pow(Math.max(0, c), 3)) : 0) - it.mat.opacity) * 0.12;
      it.mat.color.setScalar(0.35 + 0.65 * Math.max(0, c));
    });
    var cam = g.cam; cam.aspect = aspect;
    var vf = T.MathUtils.degToRad(cam.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
    var dh = (g.PH / 0.62 / 2) / Math.tan(vf / 2), dw = (g.PW / (aspect < 0.8 ? 0.74 : 0.3) / 2) / Math.tan(hf / 2);
    var d = Math.max(dh, dw);
    cam.position.set(0, 0.15, g.R + d); cam.lookAt(0, 0, g.R - 2); cam.updateProjectionMatrix();
    renderer.setViewport(rect.l, H - rect.b, w, h);
    renderer.setScissor(clip.l, H - clip.b, clip.r - clip.l, clip.b - clip.t);
    renderer.render(g.scene, cam);
  }

  /* ---------- Ancrages ---------- */
  var anchors = [];
  function collect() {
    anchors = [];
    document.querySelectorAll("[data-model]").forEach(function (el, i) {
      anchors.push({ el: el, id: el.dataset.model, phase: i * 2.1, k: 0, kv: 0, zoom: parseFloat(el.dataset.zoom || "1"), hero: el.hasAttribute("data-hero") });
    });
    var ge = document.querySelector("[data-gallery]");
    if (ge) gal = buildGallery(ge);
  }

  var ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", function (e) { if (!W) return; ptr.tx = (e.clientX / W) * 2 - 1; ptr.ty = (e.clientY / H) * 2 - 1; }, { passive: true });
  var spinV = 0, spinA = 0, ring = 0;
  document.addEventListener("hm:bell", function () { ring = 1; });
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function inter(a, b) { return { l: Math.max(a.l, b.l), t: Math.max(a.t, b.t), r: Math.min(a.r, b.r), b: Math.min(a.b, b.b) }; }
  function R(el) { var r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }

  var last = performance.now(), time = 0;
  function render() {
    size();
    var now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduce) time += dt;
    ptr.x += (ptr.tx - ptr.x) * 0.05; ptr.y += (ptr.ty - ptr.y) * 0.05;
    var vel = HM.getVel ? HM.getVel() : 0;
    spinV += vel * 0.0006; spinV *= 0.9; spinA += spinV; spinA *= 0.96; spinA = Math.max(-0.7, Math.min(0.7, spinA));
    ring *= 0.94;

    renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);
    var vp = { l: 0, t: 0, r: W, b: H };

    if (gal) {
      var gr = R(gal.el);
      if (gr.b > 0 && gr.t < H && gr.r - gr.l > 4) {
        var gc = inter(gr, vp);
        if (gc.r - gc.l >= 1 && gc.b - gc.t >= 1) renderGallery(gr, gc);
      }
    }

    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i], rect = R(a.el), w = rect.r - rect.l, h = rect.b - rect.t;
      if (w < 4 || h < 4 || rect.b < 0 || rect.t > H || rect.r < 0 || rect.l > W) continue;
      var clip = inter(rect, vp);
      if (clip.r - clip.l < 1 || clip.b - clip.t < 1) continue;
      var target = a.hero ? (HM.heroIn ? 1 : 0) : 1;
      a.kv += (target - a.k) * 0.06; a.kv *= 0.8; a.k += a.kv; if (reduce) a.k = target;
      if (a.k < 0.002) continue;
      var m = getModel(a.id), t = time + a.phase;
      // progression de sortie de la section (0 → 1 quand elle quitte l'écran par le haut)
      var out = Math.max(0, Math.min(1, -rect.t / Math.max(1, h)));
      var ease = 1 - Math.pow(1 - Math.min(1, a.k), 3);
      m.pivot.scale.setScalar(0.82 + 0.18 * ease);
      m.pivot.position.y = Math.sin(t * 0.9) * 0.05 + (1 - ease) * -0.5 + out * 0.9;
      if (a.id === "key") {
        m.pivot.rotation.set(ptr.y * 0.18 + Math.sin(t * 0.5) * 0.05, Math.sin(t * 0.4) * 0.5 + ptr.x * 0.55 + spinA + out * 2.6 + (1 - ease) * -1.2, Math.sin(t * 0.7) * 0.03);
      } else {
        m.pivot.rotation.set(0.2 + ptr.y * 0.08, t * 0.25 + ptr.x * 0.3, Math.sin(time * 42) * ring * 0.05);
        if (m.obj.userData.plunger) m.obj.userData.plunger.position.y = 1.32 - ring * 0.14;
      }
      frameCam(m.cam, w / h, a.zoom);
      renderer.setViewport(rect.l, H - rect.b, w, h);
      renderer.setScissor(clip.l, H - clip.b, clip.r - clip.l, clip.b - clip.t);
      renderer.render(m.scene, m.cam);
    }
  }

  function start() {
    try {
      document.body.appendChild(cv);
      size(); collect();
      anchors.forEach(function (a) { var m = getModel(a.id); frameCam(m.cam, 1, 1); renderer.compile(m.scene, m.cam); });
      document.documentElement.classList.add("gl");
      if (window.gsap) window.gsap.ticker.add(render);
      else (function loop() { render(); requestAnimationFrame(loop); })();
    } catch (e) {
      if (cv.parentNode) cv.parentNode.removeChild(cv);
      document.documentElement.classList.remove("gl");
      if (window.console) console.info("3D désactivée :", e && e.message);
    }
  }
  var fontsReady = document.fonts && document.fonts.load
    ? Promise.all([document.fonts.load("400 100px 'Bodoni Moda'"), document.fonts.load("italic 400 40px 'Bodoni Moda'"), document.fonts.load("500 40px 'Inter Tight'")]) : Promise.resolve();
  Promise.race([fontsReady, new Promise(function (r) { setTimeout(r, 2000); })]).then(start, start);
})();
