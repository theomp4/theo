/* Hôtel Mahfouf concept : objets 3D temps réel (Three.js r158).
   Un seul canvas WebGL fixe ; chaque élément [data-model] reçoit son objet,
   rendu dans son propre viewport/scissor, collé au DOM pendant le scroll. */
(function () {
  "use strict";
  var HM = window.HM || {};
  if (typeof window.THREE === "undefined") return;
  var T = window.THREE;

  /* ---------- Renderer ---------- */
  var renderer;
  try {
    renderer = new T.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (e) { return; }
  if (!renderer || !renderer.getContext()) return;
  var DPR = Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(DPR);
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = T.SRGBColorSpace;
  renderer.autoClear = false;
  var cv = renderer.domElement;
  cv.id = "gl";
  cv.setAttribute("aria-hidden", "true");
  cv.style.cssText = "position:fixed;left:0;top:0;z-index:30;pointer-events:none";
  var W = 0, H = 0;
  function size() {
    var w = document.documentElement.clientWidth, h = window.innerHeight;
    if (w !== W || h !== H) { W = w; H = h; renderer.setSize(W, H, true); }
  }

  /* ---------- Environnement studio (softboxes) ---------- */
  function makeEnv() {
    var pm = new T.PMREMGenerator(renderer);
    var sc = new T.Scene();
    var room = new T.Mesh(new T.BoxGeometry(12, 12, 12), new T.MeshBasicMaterial({ color: 0x3a1c22, side: T.BackSide }));
    sc.add(room);
    function panel(c, k, x, y, z, sx, sy) {
      var m = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ color: new T.Color(c).multiplyScalar(k), side: T.DoubleSide }));
      m.position.set(x, y, z); m.scale.set(sx, sy, 1); m.lookAt(0, 0, 0); sc.add(m);
    }
    panel(0xffffff, 7, 0, 5.5, 0.5, 7, 7);
    panel(0xffe0c8, 5, -5.5, 1.5, 2.5, 3, 6);
    panel(0xffb7c6, 4, 5.5, 0.5, 1, 3, 6);
    panel(0xffffff, 2.2, 0, 0.5, 5.8, 6, 2.5);
    panel(0xffd08a, 2.5, 0, -1, -5.8, 8, 2);
    var tex = pm.fromScene(sc, 0.035).texture;
    pm.dispose();
    return tex;
  }
  var ENV = makeEnv();

  /* ---------- Textures canvas ---------- */
  var MAXANI = renderer.capabilities.getMaxAnisotropy();
  function ctex(w, h, draw, srgb) {
    var c = document.createElement("canvas"); c.width = w; c.height = h;
    var x = c.getContext("2d"); draw(x, w, h);
    var t = new T.CanvasTexture(c);
    if (srgb !== false) t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = Math.min(8, MAXANI);
    return t;
  }
  var knit = ctex(256, 256, function (x, w, h) {
    x.fillStyle = "#808080"; x.fillRect(0, 0, w, h);
    for (var i = 0; i < w; i += 4) { x.fillStyle = "rgba(255,255,255,.35)"; x.fillRect(i, 0, 2, h); }
    var img = x.getImageData(0, 0, w, h), d = img.data;
    for (var p = 0; p < d.length; p += 4) { var n = (Math.random() - 0.5) * 50; d[p] += n; d[p + 1] += n; d[p + 2] += n; }
    x.putImageData(img, 0, 0);
  }, false);
  knit.wrapS = knit.wrapT = T.RepeatWrapping; knit.repeat.set(5, 5);

  var shadowTex = ctex(256, 256, function (x, w, h) {
    var g = x.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, "rgba(40,0,10,.55)"); g.addColorStop(0.45, "rgba(40,0,10,.22)"); g.addColorStop(1, "rgba(40,0,10,0)");
    x.fillStyle = g; x.fillRect(0, 0, w, h);
  });

  var F_DISPLAY = "Gloock, 'Bodoni 72', Didot, Georgia, serif";
  var F_MONO = "'DM Mono', ui-monospace, Menlo, monospace";

  /* Texte "brodé" : ombre + reflet */
  function stitch(x, txt, X, Y, font, col, hi) {
    x.font = font; x.textAlign = "center"; x.textBaseline = "middle";
    x.fillStyle = "rgba(0,0,0,.28)"; x.fillText(txt, X + 1.2, Y + 1.6);
    x.fillStyle = col; x.fillText(txt, X, Y);
    x.save(); x.globalAlpha = 0.35; x.fillStyle = hi || "#fff"; x.fillText(txt, X - 0.5, Y - 0.6); x.restore();
  }

  /* ---------- Matériaux ---------- */
  function fabric(color, opt) {
    opt = opt || {};
    return new T.MeshPhysicalMaterial(Object.assign({
      color: color, roughness: 0.92, metalness: 0, sheen: 0.6, sheenRoughness: 0.6,
      sheenColor: new T.Color(color).lerp(new T.Color(0xffffff), 0.3), bumpMap: knit, bumpScale: 1.2, envMapIntensity: 0.75
    }, opt));
  }
  var BRASS = new T.MeshPhysicalMaterial({ color: 0xe2b860, metalness: 1, roughness: 0.18, clearcoat: 0.6, clearcoatRoughness: 0.1 });
  function lacquer(color) { return new T.MeshPhysicalMaterial({ color: color, metalness: 0, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.06 }); }

  /* ---------- Formes ---------- */
  // chemin SVG (M L Q H Z, coordonnées absolues, repère 300x300) -> THREE.Shape centrée, unité = 100px
  function svgShape(d) {
    var tk = d.match(/[MLQHVZ]|-?\d*\.?\d+/g), i = 0, s = new T.Shape(), cx = 0, cy = 0, cmd = "";
    function X(v) { return (v - 150) / 100; } function Y(v) { return -(v - 150) / 100; }
    function num() { return parseFloat(tk[i++]); }
    while (i < tk.length) {
      if (/[MLQHVZ]/.test(tk[i])) cmd = tk[i++];
      if (cmd === "M") { cx = num(); cy = num(); s.moveTo(X(cx), Y(cy)); cmd = "L"; }
      else if (cmd === "L") { cx = num(); cy = num(); s.lineTo(X(cx), Y(cy)); }
      else if (cmd === "H") { cx = num(); s.lineTo(X(cx), Y(cy)); }
      else if (cmd === "V") { cy = num(); s.lineTo(X(cx), Y(cy)); }
      else if (cmd === "Q") { var a = num(), b = num(); cx = num(); cy = num(); s.quadraticCurveTo(X(a), Y(b), X(cx), Y(cy)); }
      else if (cmd === "Z") { s.closePath(); }
      else i++;
    }
    return s;
  }
  function roundRect(w, h, r) {
    var s = new T.Shape(), x = -w / 2, y = -h / 2;
    s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
    s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
    s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
    return s;
  }
  function roundPoly(pts, r) {
    var s = new T.Shape(), n = pts.length;
    for (var k = 0; k < n; k++) {
      var p = pts[k], a = pts[(k - 1 + n) % n], b = pts[(k + 1) % n];
      var da = new T.Vector2().subVectors(a, p).normalize().multiplyScalar(r);
      var db = new T.Vector2().subVectors(b, p).normalize().multiplyScalar(r);
      var p1 = p.clone().add(da), p2 = p.clone().add(db);
      if (k === 0) s.moveTo(p1.x, p1.y); else s.lineTo(p1.x, p1.y);
      s.quadraticCurveTo(p.x, p.y, p2.x, p2.y);
    }
    s.closePath(); return s;
  }
  // sépare les deux faces (avant/arrière) d'une ExtrudeGeometry : l'arrière reçoit une texture miroir lisible
  function splitLids(geo) {
    var g0 = geo.groups[0], half = g0.count / 2, pos = geo.attributes.position;
    var zA = 0; for (var i = g0.start; i < g0.start + 3; i++) zA += pos.getZ(i);
    var firstIsBack = zA < 0;
    var sides = geo.groups.slice(1);
    geo.clearGroups();
    geo.addGroup(g0.start, half, firstIsBack ? 2 : 0);
    geo.addGroup(g0.start + half, half, firstIsBack ? 0 : 2);
    sides.forEach(function (g) { geo.addGroup(g.start, g.count, 1); });
    return geo;
  }
  function mirrorTex(t) { var m = t.clone(); m.needsUpdate = true; m.repeat.x = -t.repeat.x; m.offset.x = 1 - t.offset.x; return m; }
  // map UV "monde" d'une ExtrudeGeometry vers [0,1] selon la boîte de la forme
  function fitTex(t, minX, minY, w, h) { t.repeat.set(1 / w, 1 / h); t.offset.set(-minX / w, -minY / h); return t; }

  /* ---------- Modèles ---------- */
  var SWEAT = "M95,48 Q150,84 205,48 L262,80 Q278,90 274,108 L264,196 Q262,208 250,207 L236,201 L222,118 L221,262 Q221,274 209,274 H91 Q79,274 79,262 L78,118 L64,201 L50,207 Q38,208 36,196 L26,108 Q22,90 38,80 Z";
  var TEE = "M100,42 Q150,74 200,42 L266,74 Q272,77 270,83 L250,124 Q247,129 241,127 L222,118 L222,266 Q222,276 212,276 H88 Q78,276 78,266 L78,118 L59,127 Q53,129 50,124 L30,83 Q28,77 34,74 Z";

  function garment(path, base, rib, drawFront, neck) {
    var g = new T.Group();
    var shape = svgShape(path);
    var geo = new T.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.17, bevelSize: 0.06, bevelSegments: 10, curveSegments: 28 });
    var tex = ctex(1024, 1024, function (x, w, h) {
      x.save(); x.scale(w / 260, h / 260); x.translate(-20, -20);
      x.fillStyle = base; x.fillRect(0, 0, 300, 300);
      var gr = x.createLinearGradient(0, 40, 0, 280); gr.addColorStop(0, "rgba(255,255,255,.10)"); gr.addColorStop(1, "rgba(0,0,0,.10)");
      x.fillStyle = gr; x.fillRect(0, 0, 300, 300);
      drawFront(x); x.restore();
    });
    fitTex(tex, -1.3, -1.3, 2.6, 2.6);
    var tint = new T.Color(base).lerp(new T.Color(0xffffff), 0.35);
    var front = fabric(0xffffff, { map: tex, sheenColor: tint, sheen: 0.7 });
    var back = fabric(0xffffff, { map: mirrorTex(tex), sheenColor: tint, sheen: 0.7 });
    var side = fabric(base, { sheenColor: tint, sheen: 0.7 });
    splitLids(geo);
    var m = new T.Mesh(geo, [front, side, back]); g.add(m);
    geo.computeBoundingBox(); var zf = geo.boundingBox.max.z;
    // col côtelé
    var c = neck;
    var curve = new T.QuadraticBezierCurve3(new T.Vector3(c[0], c[1], zf - 0.1), new T.Vector3(0, c[2], zf - 0.02), new T.Vector3(-c[0], c[1], zf - 0.1));
    var ribM = fabric(rib, { bumpScale: 2, sheen: 0.6, sheenColor: new T.Color(rib).lerp(new T.Color(0xffffff), 0.3) });
    g.add(new T.Mesh(new T.TubeGeometry(curve, 48, 0.06, 14, false), ribM));
    var back = new T.QuadraticBezierCurve3(new T.Vector3(c[0], c[1], zf - 0.1), new T.Vector3(0, c[1] - 0.05, zf - 0.32), new T.Vector3(-c[0], c[1], zf - 0.1));
    g.add(new T.Mesh(new T.TubeGeometry(back, 32, 0.055, 12, false), ribM));
    return g;
  }
  function ribBand(x, x0, x1, y0, y1, col) {
    x.fillStyle = col; x.fillRect(x0, y0, x1 - x0, y1 - y0);
    x.fillStyle = "rgba(0,0,0,.12)";
    for (var i = x0; i < x1; i += 3) x.fillRect(i, y0, 1.2, y1 - y0);
  }
  function sweat(base, rib, ink, gold) {
    return garment(SWEAT, base, rib, function (x) {
      ribBand(x, 79, 221, 256, 276, rib);
      x.save(); x.translate(257, 202); x.rotate(-0.16); ribBand(x, -16, 16, -6, 6, rib); x.restore();
      x.save(); x.translate(43, 202); x.rotate(0.16); ribBand(x, -16, 16, -6, 6, rib); x.restore();
      stitch(x, "★ ★ ★ ★ ★", 150, 118, "11px " + F_DISPLAY, gold || ink);
      stitch(x, "HÔTEL", 150, 146, "34px " + F_DISPLAY, ink);
      stitch(x, "Mahfouf", 150, 176, "25px " + F_DISPLAY, ink);
      x.fillStyle = ink; x.globalAlpha = 0.5; x.fillRect(118, 194, 64, 1.4); x.globalAlpha = 1;
      stitch(x, "PARIS · CHAMBRE 101", 150, 205, "500 7px " + F_MONO, ink);
    }, [0.5, 1.02, 0.66]);
  }
  function tee(base, rib, ink) {
    return garment(TEE, base, rib, function (x) {
      x.strokeStyle = ink; x.lineWidth = 2.4; x.beginPath(); x.arc(150, 166, 40, 0, Math.PI * 2); x.stroke();
      x.lineWidth = 1; x.beginPath(); x.arc(150, 166, 35, 0, Math.PI * 2); x.stroke();
      stitch(x, "ROOM", 150, 150, "500 10px " + F_MONO, ink);
      stitch(x, "Service", 150, 172, "24px " + F_DISPLAY, ink);
      stitch(x, "★ 24/7 ★", 150, 192, "500 7px " + F_MONO, ink);
      x.fillStyle = "rgba(0,0,0,.05)"; x.fillRect(78, 268, 144, 8);
    }, [0.46, 1.04, 0.72]);
  }

  function cap(base, ink) {
    var g = new T.Group();
    var tex = ctex(1024, 512, function (x, w, h) {
      x.fillStyle = base; x.fillRect(0, 0, w, h);
      x.strokeStyle = "rgba(0,0,0,.35)"; x.lineWidth = 3;
      for (var k = 0; k < 6; k++) { var px = (k / 6) * w + w / 12; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, h); x.stroke(); }
      x.strokeStyle = "rgba(255,255,255,.12)"; x.lineWidth = 1.5; x.setLineDash([6, 6]);
      for (k = 0; k < 6; k++) { px = (k / 6) * w + w / 12 + 8; x.beginPath(); x.moveTo(px, 0); x.lineTo(px, h); x.stroke(); }
      x.setLineDash([]);
      stitch(x, "Groom", w * 0.25, h * 0.62, "88px " + F_DISPLAY, ink, "#fff6d8");
      stitch(x, "HÔTEL MAHFOUF", w * 0.25, h * 0.8, "500 26px " + F_MONO, ink, "#fff6d8");
    });
    var capTint = new T.Color(base).lerp(new T.Color(0xffffff), 0.2);
    var mat = fabric(0xffffff, { map: tex, bumpScale: 1.4, sheen: 0.35, sheenColor: capTint, envMapIntensity: 0.55 });
    var crown = new T.Mesh(new T.SphereGeometry(1, 72, 36, 0, Math.PI * 2, 0, Math.PI / 2), mat);
    crown.scale.set(1, 0.82, 1.06); g.add(crown);
    var inside = new T.Mesh(new T.CircleGeometry(1, 64), fabric(0x2a0610, { side: T.DoubleSide }));
    inside.rotation.x = Math.PI / 2; inside.scale.set(1, 1.06, 1); inside.position.y = 0.002; g.add(inside);
    var btn = new T.Mesh(new T.SphereGeometry(0.08, 24, 16), fabric(base, { sheen: 0.5, sheenColor: capTint })); btn.position.y = 0.82; btn.scale.y = 0.6; g.add(btn);
    // visière
    var s = new T.Shape(), N = 40, i, a;
    for (i = 0; i <= N; i++) { a = Math.PI * i / N; var px = Math.cos(a) * 1.0, py = Math.sin(a) * 1.72; if (i === 0) s.moveTo(px, py * 0 + 0.0); else s.lineTo(px, py); }
    for (i = N; i >= 0; i--) { a = Math.PI * i / N; s.lineTo(Math.cos(a) * 0.98, Math.sin(a) * 1.02); }
    var bg = new T.ExtrudeGeometry(s, { depth: 0.03, bevelEnabled: true, bevelThickness: 0.035, bevelSize: 0.03, bevelSegments: 4, curveSegments: 12 });
    bg.rotateX(Math.PI / 2);
    var pos = bg.attributes.position;
    for (i = 0; i < pos.count; i++) { var z = pos.getZ(i), xx = pos.getX(i); pos.setY(i, pos.getY(i) - 0.16 * Math.max(0, z - 0.9) * Math.max(0, z - 0.9) - 0.12 * xx * xx); }
    bg.computeVertexNormals();
    var brim = new T.Mesh(bg, fabric(base, { sheen: 0.5, sheenColor: capTint })); brim.position.y = 0.04; g.add(brim);
    var band = new T.Mesh(new T.TorusGeometry(1.0, 0.035, 10, 80), fabric(new T.Color(base).multiplyScalar(0.6), { sheen: 0.3, sheenColor: capTint }));
    band.rotation.x = Math.PI / 2; band.scale.set(1, 1.06, 1); band.position.y = 0.03; g.add(band);
    g.rotation.x = 0.18;
    return g;
  }

  function key() {
    var g = new T.Group();
    var R = 1.08, r = 0.26;
    var shape = roundPoly([new T.Vector2(0, R), new T.Vector2(R, 0), new T.Vector2(0, -R), new T.Vector2(-R, 0)], r);
    var hole = new T.Path(); hole.absarc(0, 0.68, 0.09, 0, Math.PI * 2, true); shape.holes.push(hole);
    var geo = new T.ExtrudeGeometry(shape, { depth: 0.12, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.05, bevelSegments: 6, curveSegments: 24 });
    geo.center();
    var tex = ctex(1024, 1024, function (x, w, h) {
      x.fillStyle = "#c8102e"; x.fillRect(0, 0, w, h);
      var gr = x.createRadialGradient(w * .4, h * .35, 10, w / 2, h / 2, w * .7); gr.addColorStop(0, "rgba(255,255,255,.18)"); gr.addColorStop(1, "rgba(0,0,0,.18)");
      x.fillStyle = gr; x.fillRect(0, 0, w, h);
      x.save(); x.translate(w / 2, h / 2); x.rotate(Math.PI / 4);
      x.strokeStyle = "#e2b860"; x.lineWidth = 8; x.strokeRect(-250, -250, 500, 500); x.restore();
      x.fillStyle = "#f3cf7a"; x.textAlign = "center"; x.textBaseline = "middle";
      x.font = "230px " + F_DISPLAY; x.fillText("104", w / 2, h * 0.53);
      x.font = "500 40px " + F_MONO; x.fillText("HÔTEL MAHFOUF", w / 2, h * 0.68);
      x.font = "34px " + F_DISPLAY; x.fillText("★ ★ ★ ★ ★", w / 2, h * 0.36);
    });
    fitTex(tex, -R, -R, 2 * R, 2 * R);
    splitLids(geo);
    var tag = new T.Mesh(geo, [new T.MeshPhysicalMaterial({ map: tex, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 }), BRASS, new T.MeshPhysicalMaterial({ map: mirrorTex(tex), roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.05 })]);
    g.add(tag);
    var grom = new T.Mesh(new T.TorusGeometry(0.11, 0.035, 12, 32), BRASS); grom.position.set(0, 0.68, 0.13); g.add(grom);
    var ring = new T.Mesh(new T.TorusGeometry(0.34, 0.045, 16, 64), BRASS); ring.rotation.y = Math.PI / 2; ring.position.set(0, 1.02, 0); g.add(ring);
    // clé laiton
    var k = new T.Group();
    var bow = new T.Mesh(new T.TorusGeometry(0.2, 0.065, 16, 48), BRASS); k.add(bow);
    var shaft = new T.Mesh(new T.CylinderGeometry(0.055, 0.055, 1.35, 24), BRASS); shaft.position.y = -0.85; k.add(shaft);
    var b1 = new T.Mesh(new T.BoxGeometry(0.26, 0.09, 0.07), BRASS); b1.position.set(0.15, -1.38, 0); k.add(b1);
    var b2 = new T.Mesh(new T.BoxGeometry(0.18, 0.08, 0.07), BRASS); b2.position.set(0.11, -1.2, 0); k.add(b2);
    var b3 = new T.Mesh(new T.TorusGeometry(0.07, 0.02, 8, 24), BRASS); b3.position.set(0, -0.2, 0); b3.rotation.x = Math.PI / 2; k.add(b3);
    k.position.set(0.32, 1.1, -0.22); k.rotation.set(0, 0.4, 0.55); g.add(k);
    g.userData.sway = true;
    return g;
  }

  function bell() {
    var g = new T.Group();
    var base = new T.Mesh(new T.CylinderGeometry(1.25, 1.34, 0.3, 72), lacquer(0x3a0812)); base.position.y = 0.15; g.add(base);
    var trim = new T.Mesh(new T.TorusGeometry(1.25, 0.035, 12, 96), BRASS); trim.rotation.x = Math.PI / 2; trim.position.y = 0.3; g.add(trim);
    var trim2 = new T.Mesh(new T.TorusGeometry(1.34, 0.03, 12, 96), BRASS); trim2.rotation.x = Math.PI / 2; trim2.position.y = 0.0; g.add(trim2);
    var prof = [[0.001, 1.02], [0.22, 1.0], [0.46, 0.93], [0.66, 0.8], [0.82, 0.62], [0.94, 0.4], [1.02, 0.2], [1.1, 0.06], [1.14, 0.0]];
    var spl = new T.SplineCurve(prof.map(function (p) { return new T.Vector2(p[0], p[1]); })).getPoints(48);
    var dome = new T.Mesh(new T.LatheGeometry(spl, 96), new T.MeshPhysicalMaterial({ color: 0xf0c66a, metalness: 1, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.03 }));
    dome.position.y = 0.3; g.add(dome);
    var plunger = new T.Group();
    var stem = new T.Mesh(new T.CylinderGeometry(0.06, 0.06, 0.3, 24), BRASS); stem.position.y = 0.15; plunger.add(stem);
    var ball = new T.Mesh(new T.SphereGeometry(0.13, 32, 20), BRASS); ball.position.y = 0.34; ball.scale.y = 0.8; plunger.add(ball);
    plunger.position.y = 1.3; g.add(plunger);
    g.userData.plunger = plunger; g.userData.spin = 0.35;
    return g;
  }

  function suitcase() {
    var g = new T.Group();
    var w = 2.5, h = 1.75;
    var geo = new T.ExtrudeGeometry(roundRect(w, h, 0.26), { depth: 0.62, bevelEnabled: true, bevelThickness: 0.14, bevelSize: 0.1, bevelSegments: 8, curveSegments: 16 });
    geo.center();
    var tex = ctex(1024, 720, function (x, cw, ch) {
      x.fillStyle = "#c8102e"; x.fillRect(0, 0, cw, ch);
      for (var i = 0; i < cw; i += 64) { x.fillStyle = "rgba(255,255,255,.05)"; x.fillRect(i, 0, 30, ch); }
      // autocollants
      x.save(); x.translate(cw * 0.3, ch * 0.36); x.rotate(-0.18);
      x.fillStyle = "#f5b9c6"; x.beginPath(); x.arc(0, 0, 105, 0, Math.PI * 2); x.fill();
      x.strokeStyle = "#4e0c19"; x.lineWidth = 4; x.beginPath(); x.arc(0, 0, 90, 0, Math.PI * 2); x.stroke();
      x.fillStyle = "#4e0c19"; x.textAlign = "center"; x.textBaseline = "middle";
      x.font = "78px " + F_DISPLAY; x.fillText("HM", 0, 6); x.font = "500 18px " + F_MONO; x.fillText("PARIS", 0, 55); x.fillText("★★★★★", 0, -50);
      x.restore();
      x.save(); x.translate(cw * 0.7, ch * 0.62); x.rotate(0.1);
      x.fillStyle = "#fbeff0"; x.fillRect(-150, -60, 300, 120);
      x.strokeStyle = "#c8102e"; x.lineWidth = 4; x.strokeRect(-138, -48, 276, 96);
      x.fillStyle = "#c8102e"; x.textAlign = "center"; x.textBaseline = "middle";
      x.font = "52px " + F_DISPLAY; x.fillText("Hôtel Mahfouf", 0, -4); x.font = "500 16px " + F_MONO; x.fillText("BAGAGERIE · ROOM 104", 0, 32);
      x.restore();
      x.save(); x.translate(cw * 0.72, ch * 0.24); x.rotate(-0.06);
      x.fillStyle = "#e2b860"; x.beginPath(); x.ellipse(0, 0, 120, 52, 0, 0, Math.PI * 2); x.fill();
      x.fillStyle = "#22070e"; x.textAlign = "center"; x.textBaseline = "middle"; x.font = "500 22px " + F_MONO; x.fillText("CHECK-IN 24/7", 0, 2);
      x.restore();
    });
    fitTex(tex, -w / 2, -h / 2, w, h);
    splitLids(geo);
    var body = new T.Mesh(geo, [new T.MeshPhysicalMaterial({ map: tex, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 }), lacquer(0xb50e29), new T.MeshPhysicalMaterial({ map: mirrorTex(tex), roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 })]);
    g.add(body);
    var leather = new T.MeshPhysicalMaterial({ color: 0x9a5a2c, roughness: 0.55, clearcoat: 0.3, bumpMap: knit, bumpScale: 0.4 });
    [-0.62, 0.62].forEach(function (sx) {
      var strap = new T.Mesh(new T.BoxGeometry(0.2, h + 0.36, 0.98), leather); strap.position.x = sx; g.add(strap);
      var buckle = new T.Mesh(new T.BoxGeometry(0.3, 0.2, 0.06), BRASS); buckle.position.set(sx, 0.3, 0.5); g.add(buckle);
    });
    var handle = new T.Mesh(new T.TorusGeometry(0.38, 0.08, 16, 48, Math.PI), leather); handle.position.y = h / 2 + 0.16; g.add(handle);
    [-0.38, 0.38].forEach(function (sx) { var c = new T.Mesh(new T.BoxGeometry(0.2, 0.08, 0.2), BRASS); c.position.set(sx, h / 2 + 0.17, 0); g.add(c); });
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(function (p) {
      var c = new T.Mesh(new T.SphereGeometry(0.13, 24, 16), BRASS); c.position.set(p[0] * (w / 2 - 0.02), p[1] * (h / 2 - 0.02), 0); c.scale.set(1, 1, 3.4); g.add(c);
    });
    return g;
  }

  function tote() {
    var g = new T.Group();
    var w = 1.9, h = 2.0;
    var geo = new T.ExtrudeGeometry(roundRect(w, h, 0.06), { depth: 0.14, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.04, bevelSegments: 6, curveSegments: 8 });
    geo.center();
    var tex = ctex(1024, 1080, function (x, cw, ch) {
      x.fillStyle = "#f1e2cb"; x.fillRect(0, 0, cw, ch);
      for (var i = 0; i < 9000; i++) { x.fillStyle = Math.random() < .5 ? "rgba(120,80,40,.05)" : "rgba(255,255,255,.08)"; x.fillRect(Math.random() * cw, Math.random() * ch, 2, 2); }
      x.strokeStyle = "#4e0c19"; x.lineWidth = 8; x.beginPath(); x.arc(cw / 2, ch * 0.5, 250, 0, Math.PI * 2); x.stroke();
      x.lineWidth = 3; x.beginPath(); x.arc(cw / 2, ch * 0.5, 225, 0, Math.PI * 2); x.stroke();
      x.fillStyle = "#4e0c19"; x.textAlign = "center"; x.textBaseline = "middle";
      x.font = "500 40px " + F_MONO; x.fillText("BAGAGERIE", cw / 2, ch * 0.38);
      x.font = "200px " + F_DISPLAY; x.fillText("HM", cw / 2, ch * 0.52);
      x.font = "500 34px " + F_MONO; x.fillText("PARIS ★ 1ER ÉTAGE", cw / 2, ch * 0.64);
      x.fillStyle = "#c8102e"; x.fillRect(0, 0, cw, 46);
    });
    fitTex(tex, -w / 2, -h / 2, w, h);
    splitLids(geo);
    var bag = new T.Mesh(geo, [fabric(0xffffff, { map: tex, bumpScale: 2, sheen: 0.5 }), fabric(0xe9d8bd, { bumpScale: 2, sheen: 0.5 }), fabric(0xffffff, { map: mirrorTex(tex), bumpScale: 2, sheen: 0.5 })]);
    g.add(bag);
    var hm = fabric(0xc8102e, { bumpScale: 2 });
    [0.12, -0.12].forEach(function (z) {
      var c = new T.CubicBezierCurve3(new T.Vector3(-0.5, h / 2 - 0.05, z), new T.Vector3(-0.5, h / 2 + 1.0, z), new T.Vector3(0.5, h / 2 + 1.0, z), new T.Vector3(0.5, h / 2 - 0.05, z));
      g.add(new T.Mesh(new T.TubeGeometry(c, 48, 0.055, 12, false), hm));
    });
    return g;
  }

  function socks() {
    var g = new T.Group();
    var tex = ctex(1024, 256, function (x, w, h) {
      x.fillStyle = "#fbeff0"; x.fillRect(0, 0, w, h);
      x.fillStyle = "#c8102e"; [30, 90, 150].forEach(function (p) { x.fillRect(p, 0, 34, h); });
      x.fillStyle = "#f5b9c6"; x.fillRect(0, 0, 18, h);
      x.fillStyle = "#c8102e"; x.fillRect(w * 0.6, 0, w * 0.1, h); x.fillRect(w * 0.9, 0, w * 0.1, h);
      x.fillStyle = "rgba(0,0,0,.06)"; for (var i = 0; i < h; i += 4) x.fillRect(0, i, w, 1.5);
    });
    var mat = fabric(0xffffff, { map: tex, bumpScale: 1.6 });
    function one() {
      var s = new T.Group();
      var c = new T.CatmullRomCurve3([new T.Vector3(0, 1.25, 0), new T.Vector3(0, 0.4, 0), new T.Vector3(0.02, -0.25, 0.02), new T.Vector3(0.28, -0.6, 0.08), new T.Vector3(0.78, -0.7, 0.1), new T.Vector3(1.02, -0.68, 0.1)]);
      s.add(new T.Mesh(new T.TubeGeometry(c, 96, 0.27, 28, false), mat));
      var toe = new T.Mesh(new T.SphereGeometry(0.27, 28, 20), fabric(0xc8102e)); toe.position.copy(c.getPoint(1)); s.add(toe);
      var lip = new T.Mesh(new T.TorusGeometry(0.27, 0.035, 10, 40), fabric(0xf5b9c6)); lip.rotation.x = Math.PI / 2; lip.position.y = 1.25; s.add(lip);
      var top = new T.Mesh(new T.CircleGeometry(0.27, 40), fabric(0x7a0a1c, { side: T.DoubleSide })); top.rotation.x = -Math.PI / 2; top.position.y = 1.23; s.add(top);
      return s;
    }
    var a = one(); a.position.set(-0.45, 0.05, 0.15); a.rotation.set(0, -0.35, 0.06); g.add(a);
    var b = one(); b.position.set(0.25, -0.05, -0.25); b.rotation.set(0, -0.1, -0.08); g.add(b);
    return g;
  }


  function hanger() {
    var g = new T.Group(), w = 2.2, h = 4.6;
    var shape = roundRect(w, h, 0.22);
    var hole = new T.Path(); hole.absarc(0, h / 2 - 0.75, 0.4, 0, Math.PI * 2, true); shape.holes.push(hole);
    var geo = new T.ExtrudeGeometry(shape, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 4, curveSegments: 40 });
    geo.center();
    var tex = ctex(512, 1070, function (x, cw, ch) {
      var gr = x.createLinearGradient(0, 0, 0, ch); gr.addColorStop(0, "#d4173a"); gr.addColorStop(1, "#8d0b20");
      x.fillStyle = gr; x.fillRect(0, 0, cw, ch);
      x.strokeStyle = "#e2b860"; x.lineWidth = 6; x.strokeRect(26, 26, cw - 52, ch - 52);
      x.fillStyle = "#fbeff0"; x.textAlign = "center"; x.textBaseline = "middle";
      x.font = "92px " + F_DISPLAY; x.fillText("NE PAS", cw / 2, ch * 0.45); x.fillText("DÉRANGER", cw / 2, ch * 0.54);
      x.fillStyle = "#e2b860"; x.fillRect(cw * 0.2, ch * 0.605, cw * 0.6, 4);
      x.fillStyle = "#f5b9c6"; x.font = "500 30px " + F_MONO; x.fillText("DO NOT DISTURB", cw / 2, ch * 0.66);
      x.fillStyle = "#e2b860"; x.font = "52px " + F_DISPLAY; x.fillText("★ ★ ★ ★ ★", cw / 2, ch * 0.82);
      x.fillStyle = "#fbeff0"; x.font = "500 26px " + F_MONO; x.fillText("HÔTEL MAHFOUF", cw / 2, ch * 0.89);
    });
    fitTex(tex, -w / 2, -h / 2, w, h);
    splitLids(geo);
    var mat = function (t) { return new T.MeshPhysicalMaterial({ map: t, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.1 }); };
    g.add(new T.Mesh(geo, [mat(tex), lacquer(0x9d0b23), mat(mirrorTex(tex))]));
    var rim = new T.Mesh(new T.TorusGeometry(0.4, 0.03, 10, 64), BRASS); rim.position.y = h / 2 - 0.75; g.add(rim);
    g.userData.hanger = true;
    return g;
  }

  /* ---------- Catalogue ---------- */
  var BUILD = {
    sweat: function () { return sweat("#f7bfcb", "#e893a8", "#a50c25", "#c08a2c"); },
    spa: function () { return sweat("#c8102e", "#9d0b23", "#fbeff0", "#e2b860"); },
    tee: function () { return tee("#fdf8f8", "#eadde0", "#c8102e"); },
    cap: function () { return cap("#5a0f1e", "#e2b860"); },
    key: key, bell: bell, suitcase: suitcase, tote: tote, socks: socks, hanger: hanger
  };
  var PROFILE = {
    sweat: { y: 0, amp: 0.35, max: 0.6 }, spa: { y: 0, amp: 0.35, max: 0.6 }, tee: { y: 0, amp: 0.35, max: 0.6 },
    cap: { y: -0.85, amp: 0.45, max: 1.3 }, key: { y: 0.2, amp: 0.45, max: 0.75 }, bell: { y: 0, amp: 0, spin: 0.35, max: 9 },
    suitcase: { y: -0.28, amp: 0.3, max: 0.55 }, tote: { y: -0.25, amp: 0.35, max: 0.7 }, socks: { y: -0.35, amp: 0.4, max: 1.1 },
    hanger: { y: 0, amp: 0.4, max: 0.7 }
  };
  var models = {};
  function getModel(id) {
    if (models[id]) return models[id];
    var sc = new T.Scene(); sc.environment = ENV;
    var key1 = new T.DirectionalLight(0xffffff, 1.6); key1.position.set(3, 4, 5); sc.add(key1);
    var rim = new T.DirectionalLight(0xffb0c4, 1.1); rim.position.set(-4, 2, -3); sc.add(rim);
    sc.add(new T.AmbientLight(0xffffff, 0.15));
    var obj = BUILD[id]();
    var box = new T.Box3().setFromObject(obj), ctr = box.getCenter(new T.Vector3());
    var sph = box.getBoundingSphere(new T.Sphere()), s = 1.3 / sph.radius;
    obj.position.sub(ctr);
    var holder = new T.Group(); holder.add(obj); holder.scale.setScalar(s);
    var pivot = new T.Group(); pivot.add(holder); sc.add(pivot);
    var sh = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, toneMapped: false }));
    sh.rotation.x = -Math.PI / 2; sh.position.y = (box.min.y - ctr.y) * s - 0.12;
    var sz = box.getSize(new T.Vector3()); sh.scale.set(Math.max(sz.x, sz.z) * s * 1.15 + 0.4, Math.max(sz.x, sz.z) * s * 0.7 + 0.4, 1);
    sc.add(sh);
    var cam = new T.PerspectiveCamera(28, 1, 0.1, 60);
    models[id] = { scene: sc, pivot: pivot, obj: obj, shadow: sh, shadowY: sh.position.y, cam: cam, prof: PROFILE[id] || { y: 0, amp: 0.4 } };
    return models[id];
  }
  function frameCam(cam, aspect, zoom) {
    cam.aspect = aspect;
    var vf = T.MathUtils.degToRad(cam.fov);
    var hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
    var d = (1.45 / Math.sin(Math.min(vf, hf) / 2)) / (zoom || 1);
    cam.position.set(0, d * 0.12, d); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
  }

  /* ---------- Ancrages DOM ---------- */
  var anchors = [];
  function collect() {
    anchors = [];
    document.querySelectorAll("[data-model]").forEach(function (el, i) {
      var room = el.closest(".room"), card = el.closest(".cardroom");
      anchors.push({
        el: el, id: el.dataset.model, phase: i * 1.7, k: 0, kv: 0,
        room: room, door: card ? card.querySelector(".panel-door") : null, frame: card ? card.querySelector(".frame") : null,
        cab: room ? document.getElementById("cab") : null, float: el.classList.contains("float") ? el : null,
        zoom: parseFloat(el.dataset.zoom || "1"), lift: 0
      });
    });
  }

  /* ---------- Interaction ---------- */
  var ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", function (e) { ptr.tx = (e.clientX / W) * 2 - 1; ptr.ty = (e.clientY / H) * 2 - 1; }, { passive: true });
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
    ptr.x += (ptr.tx - ptr.x) * 0.06; ptr.y += (ptr.ty - ptr.y) * 0.06;
    var vel = HM.getVel ? HM.getVel() : 0;
    spinV += vel * 0.0009; spinV *= 0.9; spinA += spinV; spinA *= 0.965; spinA = Math.max(-0.9, Math.min(0.9, spinA));
    ring *= 0.94;

    renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);
    var vp = { l: 0, t: 0, r: W, b: H };
    for (var i = 0; i < anchors.length; i++) {
      var a = anchors[i], rect = R(a.el);
      var w = rect.r - rect.l, h = rect.b - rect.t;
      if (w < 4 || h < 4 || rect.b < 0 || rect.t > H || rect.r < 0 || rect.l > W) { a.k = 0; a.kv = 0; continue; }
      var target = 1;
      if (a.room && getComputedStyle(a.room).visibility === "hidden") { a.k = 0; a.kv = 0; continue; }
      if (a.float) { var op = parseFloat(a.float.style.opacity); if (a.float.style.visibility === "hidden" || op === 0) { continue; } }
      var clip = inter(rect, vp);
      if (a.cab) {
        clip = inter(clip, R(a.cab));
        var ld = a.cab.querySelector(".ldoor").getBoundingClientRect(), rd = a.cab.querySelector(".rdoor").getBoundingClientRect();
        clip.l = Math.max(clip.l, ld.right); clip.r = Math.min(clip.r, rd.left);
      }
      var open = 1;
      if (a.door) {
        clip = inter(clip, R(a.frame));
        var rot = window.gsap ? Math.abs(parseFloat(window.gsap.getProperty(a.door, "rotateY")) || 0) : 105;
        open = Math.min(1, Math.max(0, (rot - 25) / 70));
        target = open;
      }
      if (clip.r - clip.l < 1 || clip.b - clip.t < 1) continue;
      // ressort d'entrée
      if (a.door) { a.k = target; }
      else { a.kv += (target - a.k) * 0.12; a.kv *= 0.78; a.k += a.kv; if (reduce) a.k = 1; }
      var s = Math.max(0.001, a.k);

      var m = getModel(a.id), p = m.prof;
      var t = time + a.phase;
      m.pivot.scale.setScalar(s);
      m.pivot.position.y = Math.sin(t * 1.2) * 0.07;
      m.pivot.rotation.set(
        ptr.y * 0.22 + Math.sin(t * 0.7) * 0.04,
        p.y + (p.spin ? t * p.spin : Math.max(-p.max, Math.min(p.max, Math.sin(t * 0.55) * p.amp + ptr.x * 0.45 + spinA))) + (a.door ? (1 - open) * -1.4 : 0) + (1 - Math.min(1, a.k)) * 0.9,
        m.obj.userData.sway ? Math.sin(t * 1.3) * 0.06 : 0
      );
      if (m.obj.userData.hanger) { m.pivot.position.y = 0; m.pivot.rotation.x = 0; m.pivot.rotation.z = (HM.getSwing ? HM.getSwing() : 0) * Math.PI / 180; }
      if (m.obj.userData.plunger) {
        m.obj.userData.plunger.position.y = 1.3 - ring * 0.16;
        m.pivot.rotation.z = Math.sin(time * 40) * ring * 0.08;
      }
      m.shadow.scale.z = 1; m.shadow.material.opacity = Math.min(1, a.k) * (1 - Math.abs(m.pivot.position.y) * 2);
      frameCam(m.cam, w / h, a.zoom);
      renderer.setViewport(rect.l, H - rect.b, w, h);
      renderer.setScissor(clip.l, H - clip.b, clip.r - clip.l, clip.b - clip.t);
      renderer.render(m.scene, m.cam);
    }
  }

  /* ---------- Miniatures du panier (rendues une fois) ---------- */
  function thumbs() {
    var out = {}, S = 200;
    var ids = HM.products ? HM.products.map(function (p) { return [p.id, p.model]; }) : [];
    var c2 = document.createElement("canvas"); c2.width = S * DPR; c2.height = S * DPR; var x2 = c2.getContext("2d");
    ids.forEach(function (pair) {
      var m = getModel(pair[1]);
      m.pivot.scale.setScalar(1); m.pivot.position.y = 0; m.pivot.rotation.set(0.05, m.prof.y + 0.35, 0);
      frameCam(m.cam, 1, 1);
      renderer.setScissorTest(true);
      renderer.setViewport(0, 0, S, S); renderer.setScissor(0, 0, S, S);
      renderer.clear(); renderer.render(m.scene, m.cam);
      x2.clearRect(0, 0, c2.width, c2.height);
      x2.drawImage(cv, 0, cv.height - S * DPR, S * DPR, S * DPR, 0, 0, S * DPR, S * DPR);
      try { out[pair[0]] = c2.toDataURL("image/png"); } catch (e) {}
    });
    renderer.setScissorTest(false); renderer.clear();
    return out;
  }

  /* ---------- Démarrage (après chargement des polices pour les broderies) ---------- */
  function start() {
    try {
      document.body.appendChild(cv);
      size();
      collect();
      Object.keys(BUILD).forEach(getModel); // compile tout d'avance : pas d'à-coup au scroll
      anchors.forEach(function (a) { var m = getModel(a.id); frameCam(m.cam, 1, 1); renderer.compile(m.scene, m.cam); });
      HM.thumbs = thumbs();
      if (HM.renderCart) HM.renderCart();
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
    ? Promise.all([document.fonts.load("40px Gloock"), document.fonts.load("500 20px 'DM Mono'")]) : Promise.resolve();
  var timeout = new Promise(function (r) { setTimeout(r, 1800); });
  Promise.race([fontsReady, timeout]).then(start, start);
})();
