// =====================================================
// Tornado Sim (Simple + Clean)
// - Radar + Mini-map
// - EF scale
// - Base/Top size 0-100
// - 3 types: Cone / Wedge / Rope
// - Stages: Forming -> Mature -> Rope-out -> Gone
// - Rope-out ACTUALLY thins + whips + fades out + disappears (no reset)
// - Rain + Lightning toggles
// - Reset Damage button
// - Science fair explanation box
// =====================================================

let ui = {};
let storm;
let track = [];
let entities = [];
let rain = [];
let bolts = [];
let radar = { sweep: 0, blips: [] };

const MAX_TRACK = 220;
const MAX_RAIN = 750;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  textFont("system-ui, sans-serif");
  noStroke();

  // Chromebook fix: arrow keys shouldn't scroll the page
  window.addEventListener(
    "keydown",
    (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

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

  applyUI();

  drawScene(view);

  updateStorm();
  updateEntities();
  updateRain(view);
  updateLightning(view);

  drawTornado(view);
  drawRain(view);
  drawLightning(view);

  drawRadar(view);
  drawMiniMap(view);
  drawHUD(view);
  drawScienceFairBox(view);
}

// =====================================================
// Layout
// =====================================================
function getView() {
  const panelW = 350;
  return { x: panelW, w: width - panelW, h: height };
}

// =====================================================
// UI (clean + simple)
// =====================================================
function buildUI() {
  document.body.style.overflow = "hidden";

  ui.panel = createDiv("");
  ui.panel.position(10, 10);
  ui.panel.size(330, height - 20);
  ui.panel.style("overflow-y", "auto");
  ui.panel.style("padding", "12px");
  ui.panel.style("border-radius", "16px");
  ui.panel.style("background", "rgba(0,0,0,0.70)");
  ui.panel.style("color", "#eee");
  ui.panel.style("box-sizing", "border-box");

  title("🌪️ Tornado Sim (Simple)");

  ui.btnNew = button("🌩️ New Storm", () => newStorm(true));
  ui.btnResetDamage = button("🧹 Reset Damage", () => resetDamage());

  hr();

  label("EF Scale");
  ui.ef = selectRow(["EF0", "EF1", "EF2", "EF3", "EF4", "EF5"], "EF3");

  label("Tornado Type");
  ui.type = selectRow(["Cone", "Wedge", "Rope"], "Cone");

  hr();

  ui.baseSize = sliderLine("Base size (0–100)", 0, 100, 55, 1);
  ui.topSize = sliderLine("Top size (0–100)", 0, 100, 70, 1);

  hr();

  ui.rainOn = checkbox("🌧️ Rain", true);
  ui.lightningOn = checkbox("⚡ Lightning", true);

  hr();

  small("Controls: Arrow keys steer the tornado on the mini-map.", 12);

  // ---------- UI helpers ----------
  function title(t) {
    const d = createDiv(t);
    d.parent(ui.panel);
    d.style("font-size", "18px");
    d.style("font-weight", "800");
    d.style("margin", "0 0 10px 0");
  }
  function hr() {
    const d = createDiv("");
    d.parent(ui.panel);
    d.style("height", "1px");
    d.style("background", "rgba(255,255,255,0.14)");
    d.style("margin", "12px 0");
  }
  function label(t) {
    const d = createDiv(t);
    d.parent(ui.panel);
    d.style("font-size", "13px");
    d.style("font-weight", "800");
    d.style("margin", "10px 0 6px 0");
    d.style("opacity", "0.95");
  }
  function small(t, sz) {
    const d = createDiv(t);
    d.parent(ui.panel);
    d.style("font-size", sz + "px");
    d.style("opacity", "0.9");
    d.style("margin", "8px 0 0 0");
  }
  function button(t, fn) {
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
  function checkbox(t, start) {
    const c = createCheckbox(t, start);
    c.parent(ui.panel);
    c.style("margin", "6px 0");
    c.style("color", "#eee");
    return c;
  }
  function selectRow(opts, selected) {
    const s = createSelect();
    opts.forEach((o) => s.option(o));
    s.selected(selected);
    s.parent(ui.panel);
    s.style("width", "100%");
    s.style("padding", "6px");
    s.style("border-radius", "10px");
    return s;
  }
  function sliderLine(labelText, a, b, v, step) {
    const wrap = createDiv("");
    wrap.parent(ui.panel);
    wrap.style("margin", "8px 0");

    const lab = createDiv("");
    lab.parent(wrap);
    lab.style("font-size", "12px");
    lab.style("opacity", "0.95");

    const s = createSlider(a, b, v, step);
    s.parent(wrap);
    s.style("width", "100%");

    const update = () => lab.html(`${labelText}: <b>${s.value()}</b>`);
    s.input(update);
    update();

    return s;
  }
}

function applyUI() {
  storm.ef = ui.ef.value();
  storm.type = ui.type.value(); // "Cone" "Wedge" "Rope"
  storm.basePct = ui.baseSize.value(); // 0..100
  storm.topPct = ui.topSize.value();   // 0..100
  storm.rainOn = ui.rainOn.checked();
  storm.lightningOn = ui.lightningOn.checked();
}

// =====================================================
// Scene background
// =====================================================
function drawScene(v) {
  background(14);

  // main view
  fill(18);
  rect(v.x, 0, v.w, v.h);

  const cloudY = v.h * 0.18;
  const groundY = v.h * 0.78;

  // cloud base
  fill(15);
  ellipse(v.x + v.w * 0.62, cloudY + 18, v.w * 1.05, 170);
  fill(12);
  ellipse(v.x + v.w * 0.62, cloudY + 34, v.w * 0.75, 120);

  // ground
  fill(24);
  rect(v.x, groundY, v.w, v.h - groundY);

  // horizon silhouette
  fill(0, 90);
  for (let i = 0; i < 32; i++) {
    const x = v.x + (i / 31) * v.w;
    const w = 10 + noise(i * 0.6 + 10) * 44;
    const h = 8 + noise(i * 0.5 + 50) * 55;
    rect(x, groundY - h, w, h, 2);
  }
}

// =====================================================
// Storm logic (REAL rope-out + disappear)
// =====================================================
function newStorm(resetCity) {
  storm = {
    mx: 0.50,
    my: 0.55,

    bornMs: millis(),
    stage: "Forming", // Forming -> Mature -> Rope-out -> Gone

    // timings (simple + stable)
    formingS: 3.0,
    matureS: 12.0,      // after forming, stay mature this long
    ropeOutS: 10.0,     // rope-out duration
    gone: false,

    ropeStartMs: 0,
    goneStartMs: 0,

    // UI driven
    ef: "EF3",
    type: "Cone",
    basePct: 55,
    topPct: 70,
    rainOn: true,
    lightningOn: true,

    damage: 0
  };

  track = [];
  radar.blips = [];
  bolts = [];

  if (resetCity) buildCity();
}

function updateStorm() {
  if (storm.gone) return;

  const dt = deltaTime / 1000;

  // Arrow key steering
  const speed = 0.26 * dt;
  if (keyIsDown(LEFT_ARROW)) storm.mx -= speed;
  if (keyIsDown(RIGHT_ARROW)) storm.mx += speed;
  if (keyIsDown(UP_ARROW)) storm.my -= speed;
  if (keyIsDown(DOWN_ARROW)) storm.my += speed;

  storm.mx = constrain(storm.mx, 0.03, 0.97);
  storm.my = constrain(storm.my, 0.03, 0.97);

  // track
  track.push({ mx: storm.mx, my: storm.my });
  if (track.length > MAX_TRACK) track.shift();

  // stage timing
  const ageS = (millis() - storm.bornMs) / 1000;

  if (ageS < storm.formingS) {
    storm.stage = "Forming";
    return;
  }

  const afterForm = ageS - storm.formingS;

  if (afterForm < storm.matureS) {
    storm.stage = "Mature";
    return;
  }

  // Rope-out stage begins
  if (storm.stage !== "Rope-out") {
    storm.stage = "Rope-out";
    storm.ropeStartMs = millis();
  }

  const ropeProg = ropeProgress(); // 0..1

  // When rope-out finishes: fade out + disappear (NO reset)
  if (ropeProg >= 1) {
    storm.stage = "Gone";
    storm.gone = true;
    storm.goneStartMs = millis();
  }

  // radar sweep
  radar.sweep += dt * 1.25;
  if (radar.sweep > TWO_PI) radar.sweep -= TWO_PI;

  // blips decay
  for (const b of radar.blips) b.ttl -= dt;
  radar.blips = radar.blips.filter((b) => b.ttl > 0);
}

function ropeProgress() {
  if (storm.stage !== "Rope-out") return 0;
  const t = (millis() - storm.ropeStartMs) / 1000;
  return constrain(t / max(1, storm.ropeOutS), 0, 1);
}

function goneAlpha() {
  // fade out over 1.5s after stage becomes Gone
  if (!storm.gone) return 1;
  const t = (millis() - storm.goneStartMs) / 1000;
  return 1 - constrain(t / 1.5, 0, 1);
}

// =====================================================
// Tornado drawing (simple but good-looking)
// =====================================================
function drawTornado(v) {
  const aGone = goneAlpha();
  if (aGone <= 0.001) return; // fully disappeared

  const cloudY = v.h * 0.18 + 16;
  const groundY = v.h * 0.78;
  const cx = v.x + storm.mx * v.w;

  // tornado ALWAYS reaches ground
  const yTop = cloudY;
  const yBot = groundY;

  // forming: small funnel at top and grows down
  const ageS = (millis() - storm.bornMs) / 1000;
  const formP = constrain(ageS / storm.formingS, 0, 1);
  const reachY = lerp(yTop + 20, yBot, smoothstep(0, 1, formP));

  // sizes from 0..100 mapped to pixels (simple!)
  // EF slightly scales size so EF5 feels bigger
  const efMul = map(efStrength(storm.ef), 0, 5, 0.85, 1.25);

  let baseW = map(storm.basePct, 0, 100, 20, 320) * efMul;
  let topW = map(storm.topPct, 0, 100, 60, 520) * efMul;

  // enforce wedge rule: top wider than bottom
  if (storm.type === "Wedge") topW = max(topW, baseW * 1.35);

  // Rope type: naturally thin
  if (storm.type === "Rope") {
    topW *= 0.55;
    baseW *= 0.35;
  }

  // Rope-out: thin into a tube, whip, then fade
  const rp = ropeProgress(); // 0..1
  const ropeThin = (storm.stage === "Rope-out") ? lerp(1.0, 0.12, smoothstep(0.05, 0.95, rp)) : 1.0;
  topW *= ropeThin;
  baseW *= ropeThin;

  // visual parameters
  const opacity = 175 * aGone;
  const dir = 1; // keep simple; if you want anti-cyclonic later we can add toggle back

  // debris ring (simple)
  fill(140, 70 * aGone);
  ellipse(cx, yBot + 18, baseW * 1.8, baseW * 0.45);

  // draw funnel
  const steps = 150;
  const t = frameCount * 0.06;

  for (let i = 0; i <= steps; i++) {
    const p = i / steps; // 0 top -> 1 bottom
    const y = lerp(yTop, reachY, p);

    // width along height
    let w;
    if (storm.type === "Cone") w = lerp(topW, baseW, pow(p, 0.95));
    else if (storm.type === "Wedge") w = lerp(topW, baseW, pow(p, 0.55));
    else w = lerp(topW * 0.35, baseW * 0.25, pow(p, 1.25)); // Rope

    // clearer spin
    const spin = sin((t * 3.0 * dir) + p * 18) * w * 0.25;

    // rope-out whip bend (tube whips near bottom)
    const whip = (storm.stage === "Rope-out")
      ? (rp * 60 * pow(p, 1.55) * sin(t * 6 + p * 14))
      : 0;

    // fade slightly near top
    const a = opacity * (0.35 + 0.65 * (1 - p));

    fill(230, a);
    ellipse(cx + spin + whip, y, w, 12);

    // band line for extra “spin definition”
    stroke(40, a * 0.55);
    strokeWeight(max(1.0, w * 0.012));
    const k = 0.22 + 0.14 * (1 - p);
    line(cx - w * 0.46 + whip, y - w * k, cx + w * 0.46 + whip, y + w * k);
    noStroke();
  }
}

function efStrength(ef) {
  return { EF0: 0, EF1: 1, EF2: 2, EF3: 3, EF4: 4, EF5: 5 }[ef] ?? 3;
}

// =====================================================
// Radar (simple + nice)
// =====================================================
function drawRadar(v) {
  const rw = 220, rh = 220;
  const rx = v.x + v.w - rw - 14;
  const ry = 14;

  fill(0, 170);
  rect(rx, ry, rw, rh, 16);

  const cx = rx + rw / 2;
  const cy = ry + rh / 2;
  const r = 92;

  // rings
  stroke(60, 160);
  strokeWeight(1);
  noFill();
  circle(cx, cy, r * 2);
  circle(cx, cy, r * 1.35);
  circle(cx, cy, r * 0.70);
  line(cx - r, cy, cx + r, cy);
  line(cx, cy - r, cx, cy + r);

  // sweep
  const s = radar.sweep;
  const sx = cx + cos(s) * r;
  const sy = cy + sin(s) * r;
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
// Mini-map (simple city + damage)
// =====================================================
function buildCity() {
  entities = [];
  track = [];

  // simple emoji city (just enough for Reset Damage to matter)
  for (let i = 0; i < 8; i++) entities.push(makeEnt("🏢", "building"));
  for (let i = 0; i < 8; i++) entities.push(makeEnt("🌳", "tree"));
  for (let i = 0; i < 6; i++) entities.push(makeEnt("🚗", "car"));
}

function makeEnt(kindChar, kind) {
  return {
    char: kindChar,
    kind,
    x: random(0.12, 0.88),
    y: random(0.12, 0.88),
    hit: false,
    rot: 0,
    flip: false,
    vx: 0,
    vy: 0,
    fade: 1
  };
}

function resetDamage() {
  radar.blips = [];
  storm.damage = 0;
  for (const e of entities) {
    e.hit = false;
    e.rot = 0;
    e.flip = false;
    e.vx = 0;
    e.vy = 0;
    e.fade = 1;
  }
}

function updateEntities() {
  if (storm.gone) return;

  const r = map(efStrength(storm.ef), 0, 5, 0.03, 0.10); // EF affects hit radius
  const dmg = map(efStrength(storm.ef), 0, 5, 20, 180);

  for (const e of entities) {
    if (!e.hit && dist(storm.mx, storm.my, e.x, e.y) < r) {
      e.hit = true;

      const ang = atan2(e.y - storm.my, e.x - storm.mx);
      const force = (e.kind === "car") ? 0.50 : (e.kind === "tree") ? 0.25 : 0.14;

      e.vx = cos(ang) * force;
      e.vy = sin(ang) * force;
      e.flip = (e.kind === "car");
      e.rot = (random() < 0.5 ? -1 : 1) * (e.kind === "building" ? PI / 2.5 : PI / 2);

      storm.damage += dmg;

      radar.blips.push({ mx: e.x, my: e.y, ttl: 2.0 });
      if (radar.blips.length > 14) radar.blips.shift();
    }

    // drift after hit
    if (e.hit) {
      e.x = constrain(e.x + e.vx * 0.02, 0.05, 0.95);
      e.y = constrain(e.y + e.vy * 0.02, 0.05, 0.95);
      e.vx *= 0.94;
      e.vy *= 0.94;
      e.fade = max(0.35, e.fade - 0.003);
    }
  }
}

function drawMiniMap(v) {
  const mw = 270, mh = 185;
  const mx = v.x + v.w - mw - 12;
  const my = height - mh - 12;

  fill(0, 175);
  rect(mx, my, mw, mh, 14);

  fill(235);
  textAlign(LEFT, CENTER);
  textSize(12);
  text("Mini-map", mx + 12, my + 18);

  const ix = mx + 12, iy = my + 30, iw = mw - 24, ih = mh - 42;

  fill(18);
  rect(ix, iy, iw, ih, 10);

  // track
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
    rotate(e.rot);
    if (e.flip) scale(1, -1);
    fill(255, 255 * e.fade);
    text(e.char, 0, 0);
    pop();
  }

  // tornado dot
  fill(255);
  circle(ix + storm.mx * iw, iy + storm.my * ih, 10);
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
    vy: random(650, 1050),
    len: random(8, 16),
    drift: random(-40, 40)
  };
}

function updateRain(v) {
  if (!storm.rainOn) return;
  const dt = deltaTime / 1000;

  for (const d of rain) {
    d.x += d.drift * dt;
    d.y += d.vy * dt;

    if (d.y > height + 20) {
      d.y = -20;
      d.x = random(v.x, v.x + v.w);
    }
    if (d.x < v.x - 60) d.x = v.x + v.w + 60;
    if (d.x > v.x + v.w + 60) d.x = v.x - 60;
  }
}

function drawRain(v) {
  if (!storm.rainOn) return;
  stroke(200, 60);
  strokeWeight(1);
  for (const d of rain) {
    if (d.x < v.x) continue; // keep rain out of UI panel
    line(d.x, d.y, d.x + 2, d.y + d.len);
  }
  noStroke();
}

// =====================================================
// Lightning
// =====================================================
function updateLightning(v) {
  if (!storm.lightningOn) return;

  // random lightning
  if (random() < 0.012 && bolts.length < 3) bolts.push(makeBolt(v));

  const dt = deltaTime / 1000;
  for (const b of bolts) b.ttl -= dt;
  bolts = bolts.filter((b) => b.ttl > 0);
}

function makeBolt(v) {
  const x0 = random(v.x + 40, v.x + v.w - 40);
  const y0 = 10;
  const y1 = random(height * 0.35, height * 0.75);

  const pts = [];
  let x = x0, y = y0;
  for (let i = 0; i < 14; i++) {
    y = lerp(y0, y1, i / 14);
    x += random(-22, 22);
    pts.push({ x, y });
  }
  return { pts, ttl: 0.18 };
}

function drawLightning(v) {
  if (!storm.lightningOn) return;

  if (bolts.length > 0) {
    fill(255, 35);
    rect(v.x, 0, v.w, height);
  }

  stroke(255, 200);
  strokeWeight(2);
  for (const b of bolts) {
    beginShape();
    for (const p of b.pts) vertex(p.x, p.y);
    endShape();
  }
  noStroke();
}

// =====================================================
// HUD + Science Fair explanation
// =====================================================
function drawHUD(v) {
  fill(255);
  textAlign(LEFT, TOP);
  textSize(13);

  const ageS = (millis() - storm.bornMs) / 1000;
  const rp = ropeProgress();
  const a = goneAlpha();

  text(`Stage: ${storm.stage}`, v.x + 16, 16);
  text(`EF: ${storm.ef}  |  Type: ${storm.type}  |  Damage: ${storm.damage.toFixed(0)}`, v.x + 16, 34);

  // tiny progress bar for rope-out only
  if (storm.stage === "Rope-out") {
    drawBar(v.x + 16, 54, 220, 9, rp, `Rope-out ${(rp * 100).toFixed(0)}%`);
  }
  if (storm.gone && a > 0) {
    drawBar(v.x + 16, 54, 220, 9, 1 - a, `Fading out`);
  }
}

function drawBar(x, y, w, h, p, labelText) {
  fill(255, 40);
  rect(x, y, w, h, 6);
  fill(255, 170);
  rect(x, y, w * constrain(p, 0, 1), h, 6);
  fill(255);
  textSize(11);
  text(labelText, x + w + 10, y - 2);
}

function drawScienceFairBox(v) {
  // simple, clean explanation panel in the main view
  const bx = v.x + 14;
  const by = height - 170;
  const bw = min(520, v.w - 28);
  const bh = 150;

  fill(0, 165);
  rect(bx, by, bw, bh, 14);

  fill(255);
  textAlign(LEFT, TOP);
  textSize(12);

  const lines = [
    "Science fair note (simple):",
    "• Tornado stage changes over time: Forming → Mature → Rope-out → Gone.",
    "• 'EF scale' controls how intense the damage zone is on the mini-map.",
    "• Rope-out happens when the vortex thins into a narrow tube and dissipates.",
    "• The radar shows the tornado position + recent damage blips.",
    "• Rain and lightning are visual effects from the storm environment."
  ];

  let y = by + 12;
  for (const line of lines) {
    text(line, bx + 14, y);
    y += 20;
  }
}

function smoothstep(a, b, x) {
  x = constrain((x - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
  }
