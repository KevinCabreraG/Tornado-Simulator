
// =====================================================
// TORNADO SIMULATOR — EVERYTHING EDITION (Stable)
// p5.js single-file sketch.js
// =====================================================

// ---------- Global ----------
let ui = {};
let storm, radar;
let entities = []; // emoji entities on minimap
let roads = []; // road segments for minimap drawing
let track = []; // tornado trail on minimap
let rain = []; // rain particles
let bolts = []; // lightning bolts
let subVorts = []; // subvortex arms

// Memory/perf safeguards
const MAX_TRACK = 220;
const MAX_RAIN = 900;
const MAX_BOLTS = 4;
const MAX_SUBV = 12;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  textFont("system-ui, sans-serif");
  angleMode(RADIANS);

  // STOP arrow keys from scrolling page
  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
      e.preventDefault();
    }
  }, { passive: false });

  buildUI();
  newStorm(true);
  initRain();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (ui.panel) ui.panel.size(330, height - 20);
}

function draw() {
  const view = getView();

  // Update settings from UI (safe to read every frame)
  storm.type = ui.type.value();
  storm.ef = ui.ef.value();
  storm.keepTornado = ui.keepTornado.checked();
  storm.keepSub = ui.keepSub.checked();
  storm.anti = ui.anti.checked();
  storm.ropeEnabled = ui.ropeEnabled.checked();

  storm.lifeS = ui.lifeS.value();
  storm.ropeDurS = ui.ropeDurS.value();
  storm.rainOn = ui.rainOn.checked();
  storm.lightningOn = ui.lightningOn.checked();

  background(14);

  drawScene(view);

  updateControls();
  updateStorm();
  updateRain(view);
  updateLightning(view);
  updateEntities();
  updateSubVortices();

  drawTornado(view);
  drawRain(view);
  drawLightning(view);

  drawRadar(view);
  drawMiniMap(view);
  drawHUD(view);
}

// =====================================================
// UI
// =====================================================
function buildUI() {
  document.body.style.overflow = "hidden";

  ui.panel = createDiv("");
  ui.panel.position(10, 10);
  ui.panel.size(330, height - 20);
  ui.panel.style("overflow-y", "auto");
  ui.panel.style("padding", "12px");
  ui.panel.style("border-radius", "16px");
  ui.panel.style("background", "rgba(0,0,0,0.65)");
  ui.panel.style("color", "#eee");
  ui.panel.style("box-sizing", "border-box");

  title("🌪️ Tornado Simulator — EVERYTHING");

  ui.btnRandom = makeButton("🎲 Random Storm", () => randomizeStorm());
  ui.btnResetStorm = makeButton("🔄 Reset Storm", () => newStorm(true));
  ui.btnResetDamage = makeButton("🧹 Reset Damage", () => resetDamage());

  hr();

  label("EF Scale");
  ui.ef = makeSelect(["EF0","EF1","EF2","EF3","EF4","EF5"], "EF3");

  label("Tornado Type");
  ui.type = makeSelect(
    ["cone","wedge","rope","needle","segmented","sheathed","loop"],
    "wedge"
  );

  hr();

  ui.anti = makeCheckbox("↩️ Anti-cyclonic (spin flips)", false);
  ui.ropeEnabled = makeCheckbox("🧵 Rope-out enabled", true);
  ui.keepTornado = makeCheckbox("✅ Keep tornado (don’t vanish)", true);

  label("Mature time (seconds)");
  ui.lifeS = makeSlider(4, 60, 14, 1);

  label("Rope-out duration (seconds)");
  ui.ropeDurS = makeSlider(3, 30, 10, 1);

  hr();

  ui.keepSub = makeCheckbox("🌀 Keep subvortices", false);

  label("Subvortex count");
  ui.subCount = makeSlider(0, 12, 6, 1);

  label("Subvortex lifetime (seconds)");
  ui.subLife = makeSlider(2, 20, 10, 1);

  hr();

  ui.rainOn = makeCheckbox("🌧️ Rain", true);
  ui.lightningOn = makeCheckbox("⚡ Lightning", true);

  small("Controls: Arrow keys steer tornado on mini-map. Click canvas once if keys feel ignored.", 12);

  // --- UI helper fns ---
  function title(t) {
    const d = createDiv(t);
    d.parent(ui.panel);
    d.style("font-size", "18px");
    d.style("font-weight", "800");
    d.style("margin", "0 0 10px 0");
  }
  function label(t) {
    const d = createDiv(t);
    d.parent(ui.panel);
    d.style("font-size", "13px");
    d.style("font-weight", "700");
    d.style("margin", "10px 0 6px 0");
  }
  function hr() {
    const d = createDiv("");
    d.parent(ui.panel);
    d.style("height", "1px");
    d.style("background", "rgba(255,255,255,0.14)");
    d.style("margin", "12px 0");
  }
  function small(t, sz) {
    const d = createDiv(t);
    d.parent(ui.panel);
    d.style("font-size", sz + "px");
    d.style("opacity", "0.9");
    d.style("margin", "10px 0 0 0");
  }
  function makeButton(t, fn) {
    const b = createButton(t);
    b.parent(ui.panel);
    b.style("width", "100%");
    b.style("margin", "6px 0");
    b.style("padding", "10px");
    b.style("border", "none");
    b.style("border-radius", "12px");
    b.style("background", "#222");
    b.style("color", "#eee");
    b.style("font-size", "14px");
    b.style("cursor", "pointer");
    b.mousePressed(fn);
    return b;
  }
  function makeSelect(opts, selected) {
    const s = createSelect();
    opts.forEach(o => s.option(o));
    s.selected(selected);
    s.parent(ui.panel);
    s.style("width", "100%");
    return s;
  }
  function makeSlider(a, b, v, step) {
    const s = createSlider(a, b, v, step);
    s.parent(ui.panel);
    s.style("width", "100%");
    return s;
  }
  function makeCheckbox(labelText, start) {
    const c = createCheckbox(labelText, start);
    c.parent(ui.panel);
    c.style("color", "#eee");
    c.style("margin", "6px 0");
    return c;
  }
}

// =====================================================
// Core state / storm setup
// =====================================================
function getView() {
  const panelW = 350;
  return { x: panelW, w: width - panelW, h: height };
}

function newStorm(resetCity) {
  storm = {
    mx: 0.50,
    my: 0.56,
    bornMs: millis(),
    rope: false,
    ropeStartMs: 0,
    ropeProg: 0,

    // UI-fed each frame
    ef: "EF3",
    type: "wedge",
    anti: false,
    ropeEnabled: true,
    keepTornado: true,
    keepSub: false,

    lifeS: 14,
    ropeDurS: 10,

    rainOn: true,
    lightningOn: true,

    score: 0
  };

  radar = {
    sweep: 0,
    blips: [] // {mx,my,ttl}
  };

  track = [];
  bolts = [];
  subVorts = [];

  if (resetCity) buildCity();
}

function randomizeStorm() {
  const types = ["cone","wedge","rope","needle","segmented","sheathed","loop"];
  const efs = ["EF0","EF1","EF2","EF3","EF4","EF5"];

  ui.type.selected(random(types));
  ui.ef.selected(random(efs));
  ui.anti.checked(random([true,false]));
  ui.keepSub.checked(random([true,false]));
  ui.subCount.value(int(random(0, 13)));

  newStorm(true);
}

function resetDamage() {
  storm.score = 0;
  radar.blips = [];
  for (const e of entities) {
    e.hit = false;
    e.state = "ok";
    e.rot = 0;
    e.flip = false;
    e.vx = 0;
    e.vy = 0;
    e.fade = 1;
  }
}

// =====================================================
// Background / scene
// =====================================================
function drawScene(view) {
  // main view background
  noStroke();
  fill(18);
  rect(view.x, 0, view.w, view.h);

  const cloudY = view.h * 0.18;
  const groundY = view.h * 0.78;

  // cloud base / meso vibe
  fill(15);
  ellipse(view.x + view.w * 0.62, cloudY + 18, view.w * 1.05, 170);
  fill(12);
  ellipse(view.x + view.w * 0.62, cloudY + 34, view.w * 0.75, 120);

  // ground
  fill(24);
  rect(view.x, groundY, view.w, view.h - groundY);

  // town silhouette
  fill(0, 95);
  const baseY = groundY + 6;
  for (let i = 0; i < 30; i++) {
    const x = view.x + (i / 29) * view.w + (noise(i * 0.2) - 0.5) * 60;
    const w = 12 + noise(i * 0.6 + 10) * 44;
    const h = 10 + noise(i * 0.55 + 50) * 50;
    rect(x, baseY - h, w, h, 2);
  }
}

// =====================================================
// Controls + storm update
// =====================================================
function updateControls() {
  const dt = deltaTime / 1000;
  const speed = 0.26 * dt;

  if (keyIsDown(LEFT_ARROW)) storm.mx -= speed;
  if (keyIsDown(RIGHT_ARROW)) storm.mx += speed;
  if (keyIsDown(UP_ARROW)) storm.my -= speed;
  if (keyIsDown(DOWN_ARROW)) storm.my += speed;

  storm.mx = constrain(storm.mx, 0.03, 0.97);
  storm.my = constrain(storm.my, 0.03, 0.97);

  track.push({ mx: storm.mx, my: storm.my });
  if (track.length > MAX_TRACK) track.shift();
}

function updateStorm() {
  const ageS = (millis() - storm.bornMs) / 1000;

  // Rope-out start
  if (storm.ropeEnabled && !storm.rope && ageS > storm.lifeS) {
    storm.rope = true;
    storm.ropeStartMs = millis();
  }

  // Rope progress
  if (storm.rope) {
    const dur = max(1, storm.ropeDurS);
    storm.ropeProg = constrain(((millis() - storm.ropeStartMs) / 1000) / dur, 0, 1);
  } else {
    storm.ropeProg = 0;
  }

  // Optional vanish (only if keep is OFF)
  if (!storm.keepTornado && storm.rope && storm.ropeProg >= 1) {
    // auto restart storm after rope-out completes
    newStorm(false);
  }

  // radar sweep
  radar.sweep += (deltaTime / 1000) * 1.25;
  if (radar.sweep > TWO_PI) radar.sweep -= TWO_PI;

  // radar blips decay
  for (const b of radar.blips) b.ttl -= (deltaTime / 1000);
  radar.blips = radar.blips.filter(b => b.ttl > 0);
}

// =====================================================
// Tornado drawing (types + rope-out + anti-cyclonic)
// =====================================================
function drawTornado(view) {
  const cloudY = view.h * 0.18 + 16;
  const groundY = view.h * 0.78;
  const cx = view.x + storm.mx * view.w;

  const ageS = (millis() - storm.bornMs) / 1000;
  const form = constrain(ageS / 3.0, 0, 1);

  const yTop = cloudY;
  const yBot = lerp(cloudY + 40, groundY, smoothstep(0, 1, form));

  // Widths per type
  let topW = 220, baseW = 120;
  switch (storm.type) {
    case "wedge": topW = 430; baseW = 220; break;
    case "cone": topW = 260; baseW = 120; break;
    case "rope": topW = 110; baseW = 55; break;
    case "needle": topW = 120; baseW = 38; break;
    case "segmented": topW = 260; baseW = 140; break;
    case "sheathed": topW = 300; baseW = 130; break;
    case "loop": topW = 160; baseW = 60; break;
  }

  // scale by EF
  const efScale = map(efRadius(storm.ef), 0.03, 0.10, 0.8, 1.35);
  topW *= efScale;
  baseW *= efScale;

  // rope-out thinning into a tube
  const thin = storm.rope ? lerp(1.0, 0.18, smoothstep(0.05, 0.85, storm.ropeProg)) : 1.0;
  topW *= thin;
  baseW *= thin;

  // debris ring
  noStroke();
  fill(140, 85 * (0.2 + 0.8 * form));
  ellipse(cx, groundY + 18, baseW * 2.0, baseW * 0.5);

  // spin direction
  const dir = storm.anti ? -1 : 1;

  // draw funnel with clearer bands
  const steps = 160;
  const t = frameCount * 0.06;

  for (let i = 0; i <= steps; i++) {
    const p = i / steps; // 0 top -> 1 bottom
    const y = lerp(yTop, yBot, p);

    let w = widthAt(p, topW, baseW, storm.type);

    // segmented effect
    if (storm.type === "segmented") {
      const seg = 0.78 + 0.35 * pow(max(0, sin(PI * 12 * p + t * 0.9)), 2);
      w *= seg;
    }

    // sheathed veil near top
    if (storm.type === "sheathed") {
      const veil = 1.0 + 0.70 * smoothstep(0.0, 0.22, 1 - p);
      w *= veil;
    }

    // bend + rope whip
    const bend = (noise(p * 2.2, ageS * 0.2) - 0.5) * 14;
    const whip = (storm.rope ? (storm.ropeProg * 40 * pow(p, 1.4) * sin(t * 6 + p * 12)) : 0);
    const spin = sin((t * 3 * dir) + p * 12) * w * 0.24;

    // smoky body
    const a = (145 + 70 * (1 - p)) * (0.2 + 0.8 * form);
    fill(225, a);
    ellipse(cx + bend + spin + whip, y, w, 12);

    // band lines (spin clarity)
    const band = sin((t * 3.4 * dir) + p * 22);
    const k = 0.23 + 0.14 * (1 - p);
    const x1 = (cx + bend + whip) - w * (0.45 + 0.10 * band);
    const x2 = (cx + bend + whip) + w * (0.45 + 0.10 * band);

    stroke(40, a * 0.55);
    strokeWeight(max(1.0, w * 0.013));
    line(x1, y - w * k, x2, y + w * k);

    stroke(255, a * 0.25);
    strokeWeight(max(0.9, w * 0.010));
    line(x1, y + w * k * 0.55, x2, y - w * k * 0.55);
    noStroke();
  }

  // loop type: actual loop near bottom
  if (storm.type === "loop" && form > 0.9 && storm.ropeProg < 0.95) {
    const lp = 0.88;
    const y = lerp(yTop, yBot, lp);
    const w = widthAt(lp, topW, baseW, storm.type);
    const loopX = cx + sin(t * 0.9) * (w * 0.7);

    stroke(255, 120);
    strokeWeight(3);
    noFill();
    ellipse(loopX, y, w * 1.2, w * 0.45);
    noStroke();
  }

  // Subvortices drawn around the funnel base (arms)
  drawSubVortices(view, cx, yTop, yBot, topW, baseW, dir);
}

function widthAt(p, topW, baseW, type) {
  // p 0 top -> 1 bottom
  if (type === "wedge") return lerp(topW, baseW, pow(p, 0.55)); // top wider than bottom
  if (type === "rope") return lerp(topW * 0.35, baseW * 0.25, pow(p, 1.2));
  if (type === "needle") return lerp(topW * 0.30, baseW * 0.15, pow(p, 1.35));
  if (type === "loop") return lerp(topW * 0.42, baseW * 0.22, pow(p, 1.05));
  return lerp(topW, baseW, pow(p, 0.95));
}

// =====================================================
// Subvortices (multi-vortex arms)
// =====================================================
function updateSubVortices() {
  const dt = deltaTime / 1000;
  const target = constrain(ui.subCount.value(), 0, MAX_SUBV);
  const lifeS = ui.subLife.value();

  // spawn up to target (don’t spawn if 0)
  while (subVorts.length < target) {
    subVorts.push(makeSubVortex());
  }
  // trim down if target reduced
  while (subVorts.length > target) subVorts.pop();

  // update
  for (const s of subVorts) {
    s.age += dt;
    s.phase += dt * s.omega;
    s.rad = lerp(s.rad, s.radTarget, dt * 1.5);

    // fade out unless keepSub is on
    if (!storm.keepSub) {
      s.alpha = 1 - constrain(s.age / lifeS, 0, 1);
      if (s.age >= lifeS) {
        // respawn to keep count stable but "temporary"
        Object.assign(s, makeSubVortex());
      }
    } else {
      s.alpha = 1;
    }
  }
}

function makeSubVortex() {
  return {
    rad: random(18, 60),
    radTarget: random(18, 75),
    omega: random(2.0, 4.2) * (random() < 0.5 ? 1 : -1),
    phase: random(TWO_PI),
    age: 0,
    alpha: 1,
    thickness: random(5, 10),
    length: random(55, 95),
    twist: random(0.8, 1.6)
  };
}

function drawSubVortices(view, cx, yTop, yBot, topW, baseW, dir) {
  // anchor near lower third (multi-vortex region)
  const baseY = lerp(yTop, yBot, 0.82);
  const coreW = widthAt(0.82, topW, baseW, storm.type);

  // Don’t show if no subvortices
  if (subVorts.length === 0) return;

  // draw as connected “whip cords”
  for (const s of subVorts) {
    const ang = (s.phase * dir);
    const rx = (coreW * 0.35) + s.rad;
    const x0 = cx + cos(ang) * rx;
    const y0 = baseY + sin(ang) * (rx * 0.18);

    // arm points
    const pts = [];
    const segs = 18;
    for (let i = 0; i <= segs; i++) {
      const p = i / segs;
      const curl = sin((p * PI * 1.6) + s.phase * s.twist) * (1 - p);
      const ax = x0 + cos(ang + curl) * (s.length * p);
      const ay = y0 + sin(ang + curl) * (s.length * p) * 0.28 + p * 10;
      pts.push({ x: ax, y: ay });
    }

    // draw thick + thin stroke for "girthy rope"
    const a = 160 * s.alpha;
    stroke(255, a * 0.25);
    strokeWeight(s.thickness);
    noFill();
    beginShape();
    for (const p of pts) curveVertex(p.x, p.y);
    endShape();

    stroke(40, a * 0.35);
    strokeWeight(max(2, s.thickness * 0.45));
    beginShape();
    for (const p of pts) curveVertex(p.x, p.y);
    endShape();

    noStroke();

    // little suction vort core at the end
    const tip = pts[pts.length - 1];
    fill(230, 120 * s.alpha);
    ellipse(tip.x, tip.y, s.thickness * 1.2, s.thickness * 0.8);
  }
}

// =====================================================
// Mini-map city entities (emoji) + damage
// =====================================================
function buildCity() {
  entities = [];
  track = [];

  // roads for drawing (grid feel like your reference)
  roads = [
    { x1: 0.08, y1: 0.28, x2: 0.92, y2: 0.28 },
    { x1: 0.08, y1: 0.55, x2: 0.92, y2: 0.55 },
    { x1: 0.08, y1: 0.80, x2: 0.92, y2: 0.80 },
    { x1: 0.25, y1: 0.08, x2: 0.25, y2: 0.92 },
    { x1: 0.50, y1: 0.08, x2: 0.50, y2: 0.92 },
    { x1: 0.75, y1: 0.08, x2: 0.75, y2: 0.92 },
  ];

  // buildings
  for (let i = 0; i < 10; i++) entities.push(makeEntity("🏢", "building", random(0.12, 0.88), random(0.12, 0.88)));
  // trees
  for (let i = 0; i < 10; i++) entities.push(makeEntity("🌳", "tree", random(0.12, 0.88), random(0.12, 0.88)));
  // cars on roads
  for (let i = 0; i < 9; i++) {
    const lane = random([
      { kind: "h", y: 0.28 }, { kind: "h", y: 0.55 }, { kind: "h", y: 0.80 },
      { kind: "v", x: 0.25 }, { kind: "v", x: 0.50 }, { kind: "v", x: 0.75 }
    ]);
    const c = makeEntity("🚗", "car", 0.5, 0.5);
    c.lane = lane;
    c.t = random(0, 1);
    c.dir = random([-1, 1]);
    c.speed = random(0.08, 0.14);
    entities.push(c);
  }
}

function makeEntity(char, kind, x, y) {
  return {
    char, kind,
    x, y,
    state: "ok",
    hit: false,
    rot: 0,
    flip: false,
    vx: 0, vy: 0,
    fade: 1,
    lane: null,
    t: 0,
    dir: 1,
    speed: 0
  };
}

function updateEntities() {
  const dt = deltaTime / 1000;
  const r = efRadius(storm.ef);
  const dmg = efDamage(storm.ef);

  // cars move
  for (const e of entities) {
    if (e.kind === "car" && e.state === "ok") {
      e.t += e.dir * e.speed * dt;
      if (e.t < 0) { e.t = 0; e.dir *= -1; }
      if (e.t > 1) { e.t = 1; e.dir *= -1; }

      if (e.lane.kind === "h") {
        e.x = lerp(0.10, 0.90, e.t);
        e.y = e.lane.y;
        e.rot = (e.dir > 0) ? 0 : PI;
      } else {
        e.x = e.lane.x;
        e.y = lerp(0.10, 0.90, e.t);
        e.rot = (e.dir > 0) ? HALF_PI : -HALF_PI;
      }
    }
  }

  // impacts
  for (const e of entities) {
    const d = dist(storm.mx, storm.my, e.x, e.y);

    // near wobble
    if (!e.hit && d < r * 1.6) {
      if (e.kind === "building") e.rot = (noise(frameCount * 0.03, e.x * 9) - 0.5) * 0.35;
      if (e.kind === "tree") e.rot = (noise(frameCount * 0.04, e.y * 9) - 0.5) * 0.55;
    }

    // direct hit
    if (!e.hit && d < r) {
      e.hit = true;
      storm.score += dmg;

      radar.blips.push({ mx: e.x, my: e.y, ttl: 2.0 });
      if (radar.blips.length > 14) radar.blips.shift();

      const ang = atan2(e.y - storm.my, e.x - storm.mx);

      if (e.kind === "car") {
        e.state = "destroyed";
        e.flip = true;
        e.vx = cos(ang) * 0.55;
        e.vy = sin(ang) * 0.55;
        e.rot += (random() < 0.5 ? -1 : 1) * 0.6;
      } else if (e.kind === "tree") {
        e.state = "destroyed";
        e.vx = cos(ang) * 0.24;
        e.vy = sin(ang) * 0.24;
        e.rot = (random() < 0.5 ? -1 : 1) * HALF_PI;
      } else {
        e.state = "damaged";
        e.vx = cos(ang) * 0.14;
        e.vy = sin(ang) * 0.14;
        e.rot = (random() < 0.5 ? -1 : 1) * (PI / 2.3);
      }
    }

    // fling drift + fade
    if (e.state !== "ok") {
      e.x = constrain(e.x + e.vx * dt, 0.02, 0.98);
      e.y = constrain(e.y + e.vy * dt, 0.02, 0.98);
      e.vx *= 0.92;
      e.vy *= 0.92;
      if (e.state === "destroyed") e.fade = max(0.35, e.fade - dt * 0.5);
    }
  }
}

function efRadius(ef) {
  return { EF0: 0.03, EF1: 0.04, EF2: 0.05, EF3: 0.06, EF4: 0.08, EF5: 0.10 }[ef] || 0.06;
}
function efDamage(ef) {
  return { EF0: 20, EF1: 40, EF2: 70, EF3: 110, EF4: 170, EF5: 250 }[ef] || 110;
}

// =====================================================
// Mini-map draw
// =====================================================
function drawMiniMap(view) {
  const mw = 270, mh = 185;
  const mx = view.x + view.w - mw - 12;
  const my = height - mh - 12;

  noStroke();
  fill(0, 175);
  rect(mx, my, mw, mh, 14);

  fill(235);
  textAlign(LEFT, CENTER);
  textSize(12);
  text("Mini Map", mx + 12, my + 18);

  const ix = mx + 12, iy = my + 30, iw = mw - 24, ih = mh - 42;

  fill(18);
  rect(ix, iy, iw, ih, 10);

  // roads
  stroke(150, 140);
  strokeWeight(2);
  for (const r of roads) {
    line(ix + r.x1 * iw, iy + r.y1 * ih, ix + r.x2 * iw, iy + r.y2 * ih);
  }
  noStroke();

  // trail
  if (track.length > 1) {
    stroke(255, 70);
    strokeWeight(6);
    for (let i = 1; i < track.length; i++) {
      const a = track[i - 1], b = track[i];
      line(ix + a.mx * iw, iy + a.my * ih, ix + b.mx * iw, iy + b.my * ih);
    }
    stroke(255, 200);
    strokeWeight(2);
    for (let i = 1; i < track.length; i++) {
      const a = track[i - 1], b = track[i];
      line(ix + a.mx * iw, iy + a.my * ih, ix + b.mx * iw, iy + b.my * ih);
    }
    noStroke();
  }

  // entities
  textAlign(CENTER, CENTER);
  textSize(16);
  for (const e of entities) {
    push();
    translate(ix + e.x * iw, iy + e.y * ih);

    rotate(e.rot || 0);
    if (e.flip) scale(1, -1);

    fill(255, 255 * (e.fade ?? 1));
    text(e.char, 0, 0);
    pop();
  }

  // tornado marker + radius ring
  const tx = ix + storm.mx * iw;
  const ty = iy + storm.my * ih;
  fill(255);
  circle(tx, ty, 10);

  fill(255, 45);
  circle(tx, ty, efRadius(storm.ef) * iw * 2);
}

// =====================================================
// Radar (top right)
// =====================================================
function drawRadar(view) {
  const rw = 220, rh = 220;
  const rx = view.x + view.w - rw - 14;
  const ry = 14;

  noStroke();
  fill(0, 170);
  rect(rx, ry, rw, rh, 16);

  const cx = rx + rw / 2;
  const cy = ry + rh / 2;
  const r = 92;

  // grid
  stroke(60, 160);
  strokeWeight(1);
  noFill();
  circle(cx, cy, r * 2);
  circle(cx, cy, r * 1.35);
  circle(cx, cy, r * 0.70);
  line(cx - r, cy, cx + r, cy);
  line(cx, cy - r, cx, cy + r);

  // sweep
  const sx = cx + cos(radar.sweep) * r;
  const sy = cy + sin(radar.sweep) * r;
  stroke(120, 220);
  line(cx, cy, sx, sy);

  // tornado dot
  noStroke();
  fill(255);
  const tx = cx + (storm.mx - 0.5) * r * 2;
  const ty = cy + (storm.my - 0.5) * r * 2;
  circle(tx, ty, 6);

  // blips
  for (const b of radar.blips) {
    const bx = cx + (b.mx - 0.5) * r * 2;
    const by = cy + (b.my - 0.5) * r * 2;
    fill(255, 180 * constrain(b.ttl / 2.0, 0, 1));
    circle(bx, by, 5);
  }

  noStroke();
  fill(230);
  textAlign(LEFT, CENTER);
  textSize(12);
  text("Radar", rx + 12, ry + 16);
}

// =====================================================
// Rain
// =====================================================
function initRain() {
  rain = [];
  for (let i = 0; i < MAX_RAIN; i++) rain.push(makeDrop());
}

function makeDrop() {
  return {
    x: random(width),
    y: random(height),
    vy: random(700, 1100),
    len: random(8, 16),
    drift: random(-40, 40)
  };
}

function updateRain(view) {
  if (!storm.rainOn) return;

  const dt = deltaTime / 1000;
  for (const d of rain) {
    d.x += d.drift * dt;
    d.y += d.vy * dt;

    if (d.y > height + 20) {
      d.y = -20;
      d.x = random(view.x, view.x + view.w);
    }
    if (d.x < view.x - 50) d.x = view.x + view.w + 50;
    if (d.x > view.x + view.w + 50) d.x = view.x - 50;
  }
}

function drawRain(view) {
  if (!storm.rainOn) return;

  stroke(200, 60);
  strokeWeight(1);
  for (const d of rain) {
    // only draw rain over the main view (not UI panel)
    if (d.x < view.x) continue;
    line(d.x, d.y, d.x + 2, d.y + d.len);
  }
  noStroke();
}

// =====================================================
// Lightning
// =====================================================
function updateLightning(view) {
  if (!storm.lightningOn) return;

  // random spawn chance
  if (random() < 0.012 && bolts.length < MAX_BOLTS) {
    bolts.push(makeBolt(view));
  }

  // update existing bolts
  const dt = deltaTime / 1000;
  for (const b of bolts) b.ttl -= dt;
  bolts = bolts.filter(b => b.ttl > 0);
}

function makeBolt(view) {
  const x0 = random(view.x + 30, view.x + view.w - 30);
  const y0 = 10;
  const y1 = random(height * 0.35, height * 0.75);

  const pts = [];
  let x = x0, y = y0;
  const steps = 14;
  for (let i = 0; i < steps; i++) {
    const ny = lerp(y0, y1, i / steps);
    x += random(-22, 22);
    y = ny;
    pts.push({ x, y });
  }

  return { pts, ttl: 0.18, flash: 1.0 };
}

function drawLightning(view) {
  if (!storm.lightningOn) return;

  if (bolts.length > 0) {
    // flash overlay
    noStroke();
    fill(255, 35);
    rect(view.x, 0, view.w, height);
  }

  stroke(255, 200);
  strokeWeight(2);
  for (const b of bolts) {
    beginShape();
    vertex(b.pts[0].x, b.pts[0].y);
    for (const p of b.pts) vertex(p.x, p.y);
    endShape();
  }
  noStroke();
}

// =====================================================
// HUD
// =====================================================
function drawHUD(view) {
  fill(255);
  textAlign(LEFT, TOP);
  textSize(13);

  const ageS = (millis() - storm.bornMs) / 1000;
  const phase = ageS < 3 ? "Forming" : storm.rope ? "Rope-out" : "Mature";

  text(`EF: ${storm.ef} Type: ${storm.type} ${storm.anti ? "Anti-cyclonic" : "Cyclonic"}`, view.x + 16, 16);
  text(`Phase: ${phase} Damage: ${storm.score}`, view.x + 16, 34);
  text(`Rope-out: ${storm.ropeEnabled ? "ON" : "OFF"} | Keep tornado: ${storm.keepTornado ? "ON" : "OFF"}`, view.x + 16, 52);
  text(`Subvortices: ${ui.subCount.value()} | Keep: ${storm.keepSub ? "ON" : "OFF"}`, view.x + 16, 70);
}

// =====================================================
// Helpers
// =====================================================
function smoothstep(a, b, x) {
  x = constrain((x - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}
