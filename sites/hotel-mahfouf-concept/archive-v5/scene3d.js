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

  /* ---------- Objets (clé, sonnette) ---------- */
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
    var cam = new T.PerspectiveCamera(26, 1, 0.01, 60);
    models[id] = { scene: sc, pivot: pivot, obj: obj, cam: cam, focus: ctr.clone().multiplyScalar(-s) };
    return models[id];
  }
  function camDist(cam, aspect) {
    var vf = T.MathUtils.degToRad(cam.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
    return 1.38 / Math.sin(Math.min(vf, hf) / 2);
  }
  function frameCam(cam, aspect, zoom) {
    cam.aspect = aspect;
    var d = camDist(cam, aspect) / (zoom || 1);
    cam.position.set(0, d * 0.08, d); cam.lookAt(0, 0, 0); cam.updateProjectionMatrix();
  }

  /* ---------- Photos « liquides » : révélation en vague, onde au survol, aberration à la vitesse ---------- */
  var texCache = {}, tl = new T.TextureLoader();
  function tex(src) {
    if (texCache[src]) return texCache[src];
    var t = tl.load(src, function () { t.userData.ready = true; });
    t.colorSpace = T.SRGBColorSpace; t.anisotropy = ANI; t.minFilter = T.LinearMipmapLinearFilter;
    texCache[src] = t; return t;
  }
  var LQ_V = "uniform float uVel; varying vec2 vUv; void main(){ vUv = uv; vec3 p = position; p.y += sin(uv.x*3.14159)*uVel*0.045; gl_Position = projectionMatrix*modelViewMatrix*vec4(p,1.0); }";
  var LQ_F = [
    "uniform sampler2D uTex; uniform vec2 uCover; uniform vec2 uOff; uniform float uVel; uniform vec2 uMouse; uniform float uHover; uniform float uTime; uniform float uRev; uniform float uPar; uniform float uAspect;",
    "varying vec2 vUv;",
    "void main(){",
    "  vec2 uv = vUv;",
    "  float edge = uRev*1.3 - 0.15 + sin(uv.x*5.0 + uTime*1.2)*0.035*(1.0-uRev) + sin(uv.x*11.0 - uTime)*0.015*(1.0-uRev);",
    "  if(uv.y > edge) discard;",
    "  vec2 d = uv - uMouse; float dist = length(d*vec2(uAspect,1.0));",
    "  uv += normalize(d + 1e-5) * sin(dist*30.0 - uTime*6.0) * 0.007 * uHover * smoothstep(0.5, 0.0, dist);",
    "  float z = 1.12 + (1.0-uRev)*0.25;",
    "  uv = (uv - 0.5)/z + 0.5; uv.y += uPar*0.045;",
    "  vec2 t = uv*uCover + uOff; float s = uVel*0.0055;",
    "  vec4 c = texture2D(uTex, t); c.r = texture2D(uTex, t + vec2(0.0, s)).r; c.b = texture2D(uTex, t - vec2(0.0, s)).b;",
    "  float lip = smoothstep(0.0, 0.025, edge - vUv.y);",
    "  vec3 col = mix(vec3(0.80,0.66,0.40), c.rgb, lip);",
    "  gl_FragColor = vec4(col, 1.0);",
    "  #include <colorspace_fragment>",
    "}"].join("\n");
  var lq = null;
  function buildLiquid() {
    var sc = new T.Scene();
    var mat = new T.ShaderMaterial({ vertexShader: LQ_V, fragmentShader: LQ_F, uniforms: {
      uTex: { value: null }, uCover: { value: new T.Vector2(1, 1) }, uOff: { value: new T.Vector2() }, uVel: { value: 0 }, uMouse: { value: new T.Vector2(.5, .5) },
      uHover: { value: 0 }, uTime: { value: 0 }, uRev: { value: 0 }, uPar: { value: 0 }, uAspect: { value: 1 } } });
    var mesh = new T.Mesh(new T.PlaneGeometry(1, 1, 40, 40), mat); sc.add(mesh);
    var cam = new T.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10); cam.position.z = 2;
    return { scene: sc, mat: mat, cam: cam };
  }
  var mouse = { x: -1, y: -1 };
  window.addEventListener("pointermove", function (e) { mouse.x = e.clientX; mouse.y = e.clientY; }, { passive: true });

  /* ---------- Anneau de photos ---------- */
  var gal = null;
  function buildGallery(el) {
    var list = HM.gallery || [];
    if (!list.length) return null;
    var N = list.length, PW = 3, PH = 4, GAP = 0.55, R = (N * (PW + GAP)) / (Math.PI * 2);
    var sc = new T.Scene(), ring = new T.Group(); sc.add(ring);
    var items = list.map(function (src, i) {
      var geo = new T.PlaneGeometry(PW, PH, 40, 1), pos = geo.attributes.position;
      for (var v = 0; v < pos.count; v++) { var x = pos.getX(v), a = x / R; pos.setX(v, R * Math.sin(a)); pos.setZ(v, R * Math.cos(a) - R); }
      geo.computeBoundingSphere();
      var mat = new T.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: T.DoubleSide, toneMapped: false });
      var m = new T.Mesh(geo, mat), th = (i / N) * Math.PI * 2;
      m.position.set(R * Math.sin(th), 0, R * Math.cos(th)); m.rotation.y = th; ring.add(m);
      var t = tl.load(src, function () {
        var ia = t.image.width / t.image.height, pa = PW / PH;
        if (ia > pa) { t.repeat.set(pa / ia, 1); t.offset.set((1 - pa / ia) / 2, 0); } else { t.repeat.set(1, ia / pa); t.offset.set(0, (1 - ia / pa) / 2); }
        mat.map = t; mat.needsUpdate = true; mat.userData.ready = true;
      });
      t.colorSpace = T.SRGBColorSpace; t.anisotropy = ANI;
      return { mat: mat, th: th };
    });
    return { el: el, scene: sc, ring: ring, items: items, N: N, R: R, PW: PW, PH: PH, cam: new T.PerspectiveCamera(30, 1, 0.1, 100), rot: 0 };
  }
  function renderGallery(rect, clip) {
    var g = gal, w = rect.r - rect.l, h = rect.b - rect.t, aspect = w / h;
    g.rot += ((HM.galleryPos || 0) * (Math.PI * 2 / g.N) - g.rot) * 0.08;
    g.ring.rotation.y = -g.rot + ptr.x * 0.04; g.ring.rotation.x = ptr.y * 0.025 + 0.04;
    g.ring.position.y = Math.sin(time * 0.6) * 0.04;
    g.items.forEach(function (it) {
      var c = Math.cos(it.th - g.rot);
      it.mat.opacity += ((it.mat.userData.ready ? 0.16 + 0.84 * Math.pow(Math.max(0, c), 3) : 0) - it.mat.opacity) * 0.12;
      it.mat.color.setScalar(0.35 + 0.65 * Math.max(0, c));
    });
    var cam = g.cam; cam.aspect = aspect;
    var vf = T.MathUtils.degToRad(cam.fov), hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
    var d = Math.max((g.PH / 0.6 / 2) / Math.tan(vf / 2), (g.PW / (aspect < 0.8 ? 0.72 : 0.3) / 2) / Math.tan(hf / 2));
    cam.position.set(0, 0.25, g.R + d); cam.lookAt(0, 0, g.R - 2); cam.updateProjectionMatrix();
    draw(g.scene, cam, rect, clip);
  }

  /* ---------- Casier à clés de la réception ---------- */
  var cab = null;
  function buildCabinet(el) {
    var sc = new T.Scene(); sc.environment = ENV;
    sc.add(new T.AmbientLight(0xffe8cc, 0.18));
    var dl = new T.DirectionalLight(0xffe2bf, 0.9); dl.position.set(-2, 4, 5); sc.add(dl);
    [[-2.2, 0.6], [0.4, -0.4], [2.6, 0.8]].forEach(function (p) { var pl = new T.PointLight(0xffc98a, 9, 7, 2); pl.position.set(p[0], p[1], 1.8); sc.add(pl); });
    var woodC = ctex(1024, 1024, function (x, w, h) {
      x.fillStyle = "#4a2c18"; x.fillRect(0, 0, w, h);
      for (var i = 0; i < 260; i++) {
        var y0 = Math.random() * h, amp = 4 + Math.random() * 14, c = 40 + Math.random() * 50;
        x.strokeStyle = "rgba(" + (c + 60) + "," + (c + 25) + "," + c + "," + (0.08 + Math.random() * 0.18) + ")"; x.lineWidth = 0.6 + Math.random() * 2.4;
        x.beginPath(); for (var X = 0; X <= w; X += 16) { var Y = y0 + Math.sin(X * 0.006 + i) * amp + Math.sin(X * 0.03 + i * 3) * 2; X === 0 ? x.moveTo(X, Y) : x.lineTo(X, Y); } x.stroke();
      }
    });
    woodC.wrapS = woodC.wrapT = T.RepeatWrapping; woodC.repeat.set(1.5, 1.5);
    var wood = new T.MeshStandardMaterial({ map: woodC, roughness: 0.42, metalness: 0, envMapIntensity: 0.7 });
    var woodDark = new T.MeshStandardMaterial({ map: woodC, color: 0x6a5244, roughness: 0.6, envMapIntensity: 0.4 });
    var COLS = 7, ROWS = 4, CW = 1, CH = 0.8, D = 0.55, TH = 0.06, W = COLS * CW, HH = ROWS * CH;
    var g = new T.Group(); sc.add(g);
    var back = new T.Mesh(new T.BoxGeometry(W + 0.2, HH + 0.2, 0.05), woodDark); back.position.z = -D / 2; g.add(back);
    for (var r = 0; r <= ROWS; r++) { var sh = new T.Mesh(new T.BoxGeometry(W + TH, TH, D), wood); sh.position.y = -HH / 2 + r * CH; g.add(sh); }
    for (var c = 0; c <= COLS; c++) { var dv = new T.Mesh(new T.BoxGeometry(TH, HH + TH, D), wood); dv.position.x = -W / 2 + c * CW; g.add(dv); }
    var corn = new T.Mesh(new T.BoxGeometry(W + 0.5, 0.2, D + 0.18), wood); corn.position.set(0, HH / 2 + 0.13, 0.05); g.add(corn);
    var plinth = new T.Mesh(new T.BoxGeometry(W + 0.4, 0.26, D + 0.14), wood); plinth.position.set(0, -HH / 2 - 0.16, 0.04); g.add(plinth);
    var trim = new T.Mesh(new T.BoxGeometry(W + 0.52, 0.025, 0.03), BRASS_POLISHED); trim.position.set(0, HH / 2 + 0.03, D / 2 + 0.15); g.add(trim);
    // plaques laiton gravées (atlas)
    var PW2 = 200, PH2 = 70;
    var atlas = ctex(PW2 * COLS, PH2 * ROWS, function (x) {
      for (var r = 0; r < ROWS; r++) for (var c = 0; c < COLS; c++) {
        var X = c * PW2, Y = r * PH2, gr = x.createLinearGradient(X, Y, X, Y + PH2);
        gr.addColorStop(0, "#e9c97f"); gr.addColorStop(0.5, "#c39a52"); gr.addColorStop(1, "#9c7535");
        x.fillStyle = gr; x.fillRect(X, Y, PW2, PH2);
        x.strokeStyle = "rgba(60,35,10,.6)"; x.lineWidth = 3; x.strokeRect(X + 8, Y + 8, PW2 - 16, PH2 - 16);
        x.fillStyle = "#3a230d"; x.textAlign = "center"; x.textBaseline = "middle"; x.font = "500 42px " + F_SERIF;
        x.fillText(String((ROWS - r) * 100 + c + 1), X + PW2 / 2, Y + PH2 / 2 + 3);
      }
    });
    var leather = new T.MeshPhysicalMaterial({ color: 0x4a0f18, roughness: 0.55, clearcoat: 0.3, clearcoatRoughness: 0.5, sheen: 0.4, sheenColor: new T.Color(0x7a3038) });
    var fobGeo = new T.ExtrudeGeometry(pill(0.15, 0.36), { depth: 0.02, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.01, bevelSegments: 4, curveSegments: 20 });
    fobGeo.center();
    var envGeo = new T.BoxGeometry(0.42, 0.26, 0.008), paper = new T.MeshStandardMaterial({ color: 0xe9e1d2, roughness: 0.9 });
    var swing = [], k104 = null, k104Rest = null;
    for (r = 0; r < ROWS; r++) for (c = 0; c < COLS; c++) {
      var num = (ROWS - r) * 100 + c + 1, cx = -W / 2 + CW * (c + 0.5), top = HH / 2 - r * CH, cy = top - CH / 2;
      var t = atlas.clone(); t.needsUpdate = true; t.repeat.set(1 / COLS, 1 / ROWS); t.offset.set(c / COLS, 1 - (r + 1) / ROWS);
      var face = new T.MeshPhysicalMaterial({ map: t, metalness: 0.85, roughness: 0.3, clearcoat: 0.6, envMapIntensity: 1.2 });
      var pl = new T.Mesh(new T.BoxGeometry(0.34, 0.12, 0.012), [BRASS, BRASS, BRASS, BRASS, face, BRASS]);
      pl.position.set(cx, top - CH + TH / 2 + 0.085, D / 2 + 0.007); g.add(pl);
      var hook = new T.Mesh(new T.CylinderGeometry(0.012, 0.012, 0.12, 12), BRASS_POLISHED); hook.rotation.x = Math.PI / 2; hook.position.set(cx, top - TH / 2 - 0.06, -0.05); g.add(hook);
      var seed = Math.sin(num * 12.9898) * 43758.5453; seed -= Math.floor(seed);
      if (num === 104) continue;
      if (seed < 0.62) {
        var kg = new T.Group(); kg.position.set(cx, top - TH / 2 - 0.06, 0.02);
        var rg = new T.Mesh(new T.TorusGeometry(0.045, 0.008, 8, 24), BRASS_POLISHED); rg.position.y = -0.04; kg.add(rg);
        var fb = new T.Mesh(fobGeo, leather); fb.position.y = -0.27; kg.add(fb);
        var ky = new T.Mesh(new T.CylinderGeometry(0.008, 0.008, 0.2, 8), BRASS); ky.position.set(0.035, -0.13, 0.012); ky.rotation.z = 0.25; kg.add(ky);
        kg.rotation.z = (seed - 0.3) * 0.15; g.add(kg); swing.push({ g: kg, base: kg.rotation.z, ph: seed * 20 });
      } else if (seed < 0.85) {
        var en = new T.Mesh(envGeo, paper); en.position.set(cx + (seed - 0.7) * 0.4, cy - CH / 2 + TH / 2 + 0.13, -0.12); en.rotation.set(-0.25, 0, (seed - 0.7) * 0.4); g.add(en);
      }
    }
    // la clé 104 : le vrai porte-clé cuir gravé (sans la clé laiton)
    var full = key(); full.rotation.z = 0; full.children[full.children.length - 1].visible = false;
    var fb2 = new T.Box3().setFromObject(full), fsz = fb2.getSize(new T.Vector3()), fs = 0.5 / fsz.y;
    var fc = fb2.getCenter(new T.Vector3());
    full.position.set(-fc.x, -fb2.max.y, -fc.z);
    var hold = new T.Group(); hold.add(full); hold.scale.setScalar(fs);
    k104 = new T.Group(); k104.add(hold);
    var c104 = -W / 2 + CW * 3.5, top104 = HH / 2 - 3 * CH;
    k104Rest = new T.Vector3(c104, top104 - TH / 2 - 0.04, 0.03); k104.position.copy(k104Rest); g.add(k104);
    var cam = new T.PerspectiveCamera(34, 1, 0.05, 50);
    var pos = new T.CatmullRomCurve3([new T.Vector3(-3.2, 1.3, 1.7), new T.Vector3(-1.2, 0.6, 2.6), new T.Vector3(1.6, 0.1, 3.4), new T.Vector3(0.6, -0.6, 3.0), new T.Vector3(c104, -0.95, 1.55)]);
    var look = new T.CatmullRomCurve3([new T.Vector3(-2.6, 1.1, 0), new T.Vector3(-0.8, 0.4, 0), new T.Vector3(1.0, 0, 0), new T.Vector3(0.3, -0.5, 0), new T.Vector3(c104, -1.05, 0.5)]);
    return { el: el, scene: sc, cam: cam, pos: pos, look: look, swing: swing, k104: k104, rest: k104Rest, p: 0 };
  }
  var vA = new T.Vector3(), vB = new T.Vector3();
  function renderCabinet(rect, clip) {
    var g = cab, w = rect.r - rect.l, h = rect.b - rect.t;
    g.p += ((HM.cabP || 0) - g.p) * 0.08;
    var p = g.p, travel = Math.min(1, p / 0.82), e = travel * travel * (3 - 2 * travel);
    g.pos.getPoint(e, vA); g.look.getPoint(e, vB);
    vA.x += ptr.x * 0.12; vA.y -= ptr.y * 0.08;
    var cam = g.cam; cam.aspect = w / h; cam.fov = w / h < 0.8 ? 52 : 34;
    if (w / h < 0.8) vA.z += 0.6 * (1 - e * 0.6);
    cam.position.copy(vA); cam.lookAt(vB); cam.updateProjectionMatrix();
    g.swing.forEach(function (s) { s.g.rotation.z = s.base + Math.sin(time * 1.3 + s.ph) * 0.035 + (HM.getVel ? HM.getVel() : 0) * 0.002; });
    var out = Math.max(0, (p - 0.78) / 0.22), oe = 1 - Math.pow(1 - Math.min(1, out), 3);
    g.k104.position.set(g.rest.x, g.rest.y + oe * 0.12, g.rest.z + oe * 0.62);
    g.k104.rotation.set(oe * 0.08, Math.sin(time * 0.8) * 0.12 * (1 - oe) + oe * Math.sin(time * 0.6) * 0.18, Math.sin(time * 1.1) * 0.04);
    draw(g.scene, cam, rect, clip);
  }

  /* ---------- Ancrages ---------- */
  var anchors = [], liquids = [];
  function collect() {
    document.querySelectorAll("[data-model]").forEach(function (el, i) {
      anchors.push({ el: el, id: el.dataset.model, phase: i * 2.1, k: 0, kv: 0, zoom: parseFloat(el.dataset.zoom || "1"), hero: el.hasAttribute("data-hero") });
    });
    document.querySelectorAll("[data-liquid]").forEach(function (el) {
      var src = (window.HM_IMG || {})[el.dataset.liquid]; if (!src) return;
      el.__rev = el.__rev || { v: 0 };
      liquids.push({ el: el, t: tex(src), hover: 0, mx: 0.5, my: 0.5 });
    });
    if (liquids.length) lq = buildLiquid();
    var ge = document.querySelector("[data-gallery]"); if (ge) gal = buildGallery(ge);
    var ce = document.querySelector("[data-cabinet]"); if (ce) cab = buildCabinet(ce);
  }

  var ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  window.addEventListener("pointermove", function (e) { if (!W) return; ptr.tx = (e.clientX / W) * 2 - 1; ptr.ty = (e.clientY / H) * 2 - 1; }, { passive: true });
  var spinV = 0, spinA = 0, ringBell = 0, svel = 0;
  document.addEventListener("hm:bell", function () { ringBell = 1; });
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function inter(a, b) { return { l: Math.max(a.l, b.l), t: Math.max(a.t, b.t), r: Math.min(a.r, b.r), b: Math.min(a.b, b.b) }; }
  function R(el) { var r = el.getBoundingClientRect(); return { l: r.left, t: r.top, r: r.right, b: r.bottom }; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function draw(scene, cam, rect, clip) {
    renderer.setViewport(rect.l, H - rect.b, rect.r - rect.l, rect.b - rect.t);
    renderer.setScissor(clip.l, H - clip.b, clip.r - clip.l, clip.b - clip.t);
    renderer.render(scene, cam);
  }
  var VP = { l: 0, t: 0, r: 0, b: 0 };
  function visible(rect) {
    if (rect.r - rect.l < 4 || rect.b - rect.t < 4 || rect.b < 0 || rect.t > H || rect.r < 0 || rect.l > W) return null;
    var c = inter(rect, VP); return (c.r - c.l >= 1 && c.b - c.t >= 1) ? c : null;
  }
  var dead = {};
  function safe(name, fn) { if (dead[name]) return; try { fn(); } catch (e) { dead[name] = true; if (window.console) console.info("3D « " + name + " » désactivée :", e && e.message); } }
  var tmpV = new T.Vector3(), tmpE = new T.Euler();

  var last = performance.now(), time = 0, heroE = 0;
  function render() {
    size(); VP.r = W; VP.b = H;
    var now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (!reduce) time += dt;
    ptr.x += (ptr.tx - ptr.x) * 0.05; ptr.y += (ptr.ty - ptr.y) * 0.05;
    var vel = HM.getVel ? HM.getVel() : 0; svel += (vel - svel) * 0.12;
    spinV += vel * 0.0006; spinV *= 0.9; spinA += spinV; spinA *= 0.96; spinA = Math.max(-0.7, Math.min(0.7, spinA));
    ringBell *= 0.94;
    renderer.setScissorTest(false); renderer.clear(); renderer.setScissorTest(true);

    if (lq) safe("photos", function () {
      var u = lq.mat.uniforms; u.uTime.value = time; u.uVel.value = Math.max(-1, Math.min(1, svel * 0.016));
      for (var i = 0; i < liquids.length; i++) {
        var L = liquids[i], rect = R(L.el), clip = visible(rect);
        if (!clip || !L.t.userData.ready || L.el.__rev.v <= 0.001) continue;
        var w = rect.r - rect.l, h = rect.b - rect.t, ra = w / h, ia = L.t.image.width / L.t.image.height;
        var inside = mouse.x >= rect.l && mouse.x <= rect.r && mouse.y >= rect.t && mouse.y <= rect.b;
        L.hover += ((inside ? 1 : 0) - L.hover) * 0.06;
        if (inside) { L.mx += ((mouse.x - rect.l) / w - L.mx) * 0.2; L.my += (1 - (mouse.y - rect.t) / h - L.my) * 0.2; }
        u.uTex.value = L.t; u.uRev.value = L.el.__rev.v; u.uHover.value = L.hover; u.uMouse.value.set(L.mx, L.my); u.uAspect.value = ra;
        u.uPar.value = Math.max(-1, Math.min(1, ((rect.t + h / 2) - H / 2) / H));
        if (ia > ra) { u.uCover.value.set(ra / ia, 1); u.uOff.value.set((1 - ra / ia) / 2, 0); } else { u.uCover.value.set(1, ia / ra); u.uOff.value.set(0, (1 - ia / ra) / 2); }
        draw(lq.scene, lq.cam, rect, clip);
      }
    });
    if (gal) safe("anneau", function () { var r = R(gal.el), c = visible(r); if (c) renderGallery(r, c); });
    if (cab) safe("casier", function () { var r = R(cab.el), c = visible(r); if (c) renderCabinet(r, c); });

    safe("objets", function () {
      for (var i = 0; i < anchors.length; i++) {
        var a = anchors[i], rect = R(a.el), clip = visible(rect);
        if (!clip) continue;
        var w = rect.r - rect.l, h = rect.b - rect.t;
        var target = a.hero ? (HM.heroIn ? 1 : 0) : 1;
        a.kv += (target - a.k) * 0.06; a.kv *= 0.8; a.k += a.kv; if (reduce) a.k = target;
        if (a.k < 0.002) continue;
        var m = getModel(a.id), t = time + a.phase, ease = 1 - Math.pow(1 - Math.min(1, a.k), 3), cam = m.cam, aspect = w / h;
        cam.aspect = aspect;
        if (a.hero) {
          heroE += ((HM.heroP || 0) - heroE) * 0.12;
          var e = heroE, e2 = e * e * (3 - 2 * e);
          m.pivot.scale.setScalar(0.82 + 0.18 * ease);
          m.pivot.position.y = lerp(Math.sin(t * 0.9) * 0.05 + (1 - ease) * -0.5, 0, e2);
          m.pivot.rotation.set(lerp(ptr.y * 0.18 + Math.sin(t * 0.5) * 0.05, 0, e2),
            lerp(Math.sin(t * 0.4) * 0.5 + ptr.x * 0.55 + spinA + (1 - ease) * -1.2, 0, e2) + e2 * Math.PI * 2,
            lerp(Math.sin(t * 0.7) * 0.03, 0.62, e2));
          tmpV.copy(m.focus).multiplyScalar(m.pivot.scale.x).applyEuler(tmpE.copy(m.pivot.rotation)).add(m.pivot.position);
          var d = camDist(cam, aspect) / ((1 + 22 * Math.pow(e, 2.6)) * a.zoom), tx = tmpV.x * e2, ty = tmpV.y * e2;
          cam.position.set(tx, ty + d * 0.08 * (1 - e2), d + tmpV.z * e2); cam.lookAt(tx, ty, tmpV.z * e2); cam.updateProjectionMatrix();
        } else if (a.id === "bell") {
          m.pivot.scale.setScalar(0.82 + 0.18 * ease);
          m.pivot.position.y = (1 - ease) * -0.4;
          m.pivot.rotation.set(0.22 + ptr.y * 0.08, t * 0.22 + ptr.x * 0.3, Math.sin(time * 42) * ringBell * 0.05);
          if (m.obj.userData.plunger) m.obj.userData.plunger.position.y = 1.32 - ringBell * 0.14;
          frameCam(cam, aspect, a.zoom);
        } else {
          m.pivot.scale.setScalar(0.82 + 0.18 * ease);
          m.pivot.position.y = Math.sin(t * 0.9) * 0.05;
          m.pivot.rotation.set(ptr.y * 0.18, t * 0.5 + ptr.x * 0.4, 0);
          frameCam(cam, aspect, a.zoom);
        }
        draw(m.scene, cam, rect, clip);
      }
    });
  }

  function start() {
    try {
      document.body.appendChild(cv);
      size(); collect();
      anchors.forEach(function (a) { var m = getModel(a.id); frameCam(m.cam, 1, 1); renderer.compile(m.scene, m.cam); });
      if (cab) renderer.compile(cab.scene, cab.cam);
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
