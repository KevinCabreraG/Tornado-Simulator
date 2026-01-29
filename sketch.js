// =====================================================
// Tornado Sim — SIMPLE + FIXED (KEEP + WEDGE + ROPEOUT + BAR)
// - Radar + Mini-map + GRID
// - EF scale + Reset Damage
// - 3 types: Cone / Wedge / Rope + short descriptions
// - Stages: Forming -> Mature -> Rope-out -> Gone
// - Rope-out: shrink ONLY -> then fade -> Gone (no reset)
// - Keep tornado: FREEZES stage + tornado (works in Mature and Rope-out)
// - Pause stage: also freezes stage (extra control)
// - Anti-cyclonic toggle (spin flips)
// - Base/Top size sliders 0-100
// - Tornado reaches the ground
// - Rain + Lightning toggles
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

  window.addEventListener(
    "keydown",
    (e) => {
      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
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
  ui.panel.style("background", "rgba(0,0,0,0.70)");
  ui.panel.style("color", "#eee");
  ui.panel.style("box-sizing", "border-box");

  title("🌪️ Tornado Sim");

  ui.btnNew = button("🌩️ New Storm", () => newStorm(true));
  ui.btnResetDamage = button("🧹 Reset Damage", () => resetDamage());

  hr();

  label("EF Scale");
  ui.ef = selectRow(["EF0", "EF1", "EF2", "EF3", "EF4", "EF5"], "EF3");

  label("Tornado Type");
  ui.type = selectRow(["Cone", "Wedge", "Rope"], "Cone");

  ui.typeDesc = createDiv("");
  ui.typeDesc.parent(ui.panel);
  ui.typeDesc.style("font-size", "12px");
  ui.typeDesc.style("opacity", "0.9");
  ui.typeDesc.style("margin", "6px 0 10px 0");

  hr();

  ui.baseSize = sliderLine("Base size (0–100)", 0, 100, 55, 1);
  ui.topSize  = sliderLine("Top size (0–100)", 0, 100, 70, 1);

  hr();

  ui.keepTornado = checkbox("✅ Keep tornado (FREEZE + never disappear)", false);
  ui.pauseStage  = checkbox("⏸️ Pause stage (FREEZE timing)", false);
  ui.anti        = checkbox("↩️ Anti-cyclonic (spin flips)", false);

  hr();

  ui.rainOn = checkbox("🌧️ Rain", true);
  ui.lightningOn = checkbox("⚡ Lightning", true);

  hr();
  small("Arrow keys steer tornado on the mini-map.", 12);

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
  storm.type = ui.type.value();
  storm.basePct = ui.baseSize.value();
  storm.topPct  = ui.topSize.value();
  storm.keepTornado = ui.keepTornado.checked();
  storm.pauseStage  = ui.pauseStage.checked();
  storm.anti = ui.anti.checked();
  storm.rainOn = ui.rainOn.checked();
  storm.lightningOn = ui.lightningOn.checked();

  ui.typeDesc.html(
    storm.type === "Cone"
      ? "Cone: classic funnel—wide aloft, tighter near the ground."
      : storm.type === "Wedge"
        ? "Wedge: very wide, lower-looking tornado (wider than tall)."
        : "Rope: thin, twisted tube—often near the end (rope-out look)."
  );
}

// =====================================================
// Background
// =====================================================
function drawScene(v) {
  background(14);
  fill(18);
  rect(v.x, 0, v.w, v.h);

  const cloudY = v.h * 0.18;
  const groundY = v.h * 0.78;

  fill(15);
  ellipse(v.x + v.w * 0.62, cloudY + 18, v.w * 1.05, 170);
  fill(12);
  ellipse(v.x + v.w * 0.62, cloudY + 34, v.w * 0.75, 120);

  fill(24);
  rect(v.x, groundY, v.w, v.h - groundY);

  fill(0, 90);
  for (let i = 0; i < 32; i++) {
    const x = v.x + (i / 31) * v.w;
    const w = 10 + noise(i * 0.6 + 10) * 44;
    const h = 8 + noise(i * 0.5 + 50) * 55;
    rect(x, groundY - h, w, h, 2);
  }
}

// =====================================================
// Storm state machine (FIXED timing)
// =====================================================
function newStorm(resetCity) {
  storm = {
    mx: 0.50,
    my: 0.55,

    stage: "Forming",        // Forming -> Mature -> Rope-out -> Gone
    stageElapsed: 0,         // seconds elapsed in current stage
    formingS: 3.0,
    matureS: 12.0,
    ropeOutS: 10.0,
    gone: false,
    goneElapsed: 0,          // seconds since Gone

    ef: "EF3",
    type: "Cone",
    basePct: 55,
    topPct: 70,
    keepTornado: false,
    pauseStage: false,
    anti: false,
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
  const dt = deltaTime / 1000;

  // radar sweep always moves
  radar.sweep += dt * 1.25;
  if (radar.sweep > TWO_PI) radar.sweep -= TWO_PI;

  // decay radar blips
  for (const b of radar.blips) b.ttl -= dt;
  radar.blips = radar.blips.filter((b) => b.ttl > 0);

  // movement (even if frozen, you can still steer)
  const speed = 0.26 * dt;
  if (keyIsDown(LEFT_ARROW)) storm.mx -= speed;
  if (keyIsDown(RIGHT_ARROW)) storm.mx += speed;
  if (keyIsDown(UP_ARROW)) storm.my -= speed;
  if (keyIsDown(DOWN_ARROW)) storm.my += speed;
  storm.mx = constrain(storm.mx, 0.03, 0.97);
  storm.my = constrain(storm.my, 0.03, 0.97);

  track.push({ mx: storm.mx, my: storm.my });
  if (track.length > MAX_TRACK) track.shift();

  // If already Gone, just count fade time
  if (storm.gone) {
    storm.goneElapsed += dt;
    return;
  }

  // FREEZE conditions:
  // - Keep tornado: freeze stage timing (Forming/Mature/Rope-out) AND never disappear
  // - Pause stage: freeze stage timing
  const frozen = storm.keepTornado || storm.pauseStage;

  if (!frozen) storm.stageElapsed += dt;

  // Stage transitions (ONLY when not frozen)
  if (!frozen) {
    if (storm.stage === "Forming" && storm.stageElapsed >= storm.formingS) {
      storm.stage = "Mature";
      storm.stageElapsed = 0;
    } else if (storm.stage === "Mature" && storm.stageElapsed >= storm.matureS) {
      storm.stage = "Rope-out";
      storm.stageElapsed = 0;
    } else if (storm.stage === "Rope-out" && storm.stageElapsed >= storm.ropeOutS) {
      // only disappear if keepTornado is OFF (but keepTornado is part of frozen anyway)
      storm.stage = "Gone";
      storm.gone = true;
      storm.goneElapsed = 0;
    }
  }
}

function ropeProgress() {
  if (storm.stage !== "Rope-out") return 0;
  return constrain(storm.stageElapsed / max(0.001, storm.ropeOutS), 0, 1);
}

function goneAlpha() {
  // Fade out for 1.5s after Gone
  if (!storm.gone) return 1;
  return 1 - constrain(storm.goneElapsed / 1.5, 0, 1);
}

// =====================================================
// Tornado drawing (WEDGE FIXED + ROPEOUT FIXED)
// =====================================================
function drawTornado(v) {
  const aGone = goneAlpha();
  if (aGone <= 0.001) return;

  const cloudY = v.h * 0.18 + 16;
  const groundY = v.h * 0.78;
  const cx = v.x + storm.mx * v.w;

  const yTop = cloudY;
  const yBot = groundY; // always reaches ground

  // forming reach-down
  const formingP = (storm.stage === "Forming")
    ? constrain(storm.stageElapsed / storm.formingS, 0, 1)
    : 1;

  const reachY = lerp(yTop + 20, yBot, smoothstep(0, 1, formingP));

  // sizes
  const efMul = map(efStrength(storm.ef), 0, 5, 0.85, 1.25);
  let baseW = map(storm.basePct, 0, 100, 20, 320) * efMul;
  let topW  = map(storm.topPct,  0, 100, 60, 520) * efMul;

  // Type shaping
  if (storm.type === "Wedge") {
    // Make it VERY wedge-y: huge top, big base, and thick for most of the height
    topW  = max(topW, baseW * 2.0);
    baseW = max(baseW, topW * 0.52);
  } else if (storm.type === "Rope") {
    topW *= 0.55;
    baseW *= 0.35;
  }

  // Anti-cyclonic flips spin direction
  const dir = storm.anti ? -1 : 1;

  // Rope-out: monotonic shrink ONLY
  const rp = ropeProgress();
  const shrink = (storm.stage === "Rope-out")
    ? (1.0 - 0.90 * smoothstep(0, 1, rp)) // 1 -> 0.10, never increases
    : 1.0;

  topW *= shrink;
  baseW *= shrink;

  // Rope-out fades while shrinking (and Gone fades more)
  const ropeFade = (storm.stage === "Rope-out")
    ? (1.0 - 0.55 * rp)
    : 1.0;

  const opacity = 175 * ropeFade * aGone;

  // debris ring
  fill(140, 70 * ropeFade * aGone);
  ellipse(cx, yBot + 18, baseW * 1.8, baseW * 0.45);

  const steps = 150;
  const tt = frameCount * 0.06;

  for (let i = 0; i <= steps; i++) {
    const p = i / steps; // 0 top -> 1 bottom
    const y = lerp(yTop, reachY, p);

    let w;
    if (storm.type === "Cone") {
      w = lerp(topW, baseW, pow(p, 0.95));
    } else if (storm.type === "Wedge") {
      // Wedge profile: stay thick until near the bottom, then taper
      // This is what makes it look different from cone.
      const thick = 1 - smoothstep(0.70, 1.0, p); // ~1 until 0.7 then drops
      w = lerp(baseW, topW, 1 - p);               // wide at top
      w = max(w, baseW * (0.85 + 0.25 * thick));  // keep it fat
    } else {
      // Rope
      w = lerp(topW * 0.35, baseW * 0.25, pow(p, 1.25));
    }

    // clearer spin
    const spin = sin((tt * 3.0 * dir) + p * 18) * w * 0.25;

    const a = opacity * (0.35 + 0.65 * (1 - p));
    fill(230, a);
    ellipse(cx + spin, y, w, 12);

    // band line for spin clarity
    stroke(40, a * 0.55);
    strokeWeight(max(1.0, w * 0.012));
    const k = 0.22 + 0.14 * (1 - p);
    line(cx - w * 0.46, y - w * k, cx + w * 0.46, y + w * k);
    noStroke();
  }
}

function efStrength(ef) {
  return { EF0: 0, EF1: 1, EF2: 2, EF3: 3, EF4: 4, EF5: 5 }[ef] ?? 3;
}

// =====================================================
// Radar
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

  stroke(60, 160);
  strokeWeight(1);
  noFill();
  circle(cx, cy, r * 2);
  circle(cx, cy, r * 1.35);
  circle(cx, cy, r * 0.70);
  line(cx - r, cy, cx + r, cy);
  line(cx, cy - r, cx, cy + r);

  const s = radar.sweep;
  const sx = cx + cos(s) * r;
  const sy = cy + sin(s) * r;
  stroke(120, 220);
  line(cx, cy, sx, sy);

  noStroke();
  fill(255);
  const tx = cx + (storm.mx - 0.5) * r * 2;
  const ty = cy + (storm.my - 0.5) * r * 2;
  circle(tx, ty, 6);

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
// Mini-map (GRID) + damage emojis
// =====================================================
function buildCity() {
  entities = [];
  track = [];
  for (let i = 0; i < 8; i++) entities.push(makeEnt("🏢", "building"));
  for (let i = 0; i < 8; i++) entities.push(makeEnt("🌳", "tree"));
  for (let i = 0; i < 6; i++) entities.push(makeEnt("🚗", "car"));
}

function makeEnt(kindChar, kind) {
  return { char: kindChar, kind, x: random(0.12, 0.88), y: random(0.12, 0.88), hit: false, rot: 0, flip: false, vx: 0, vy: 0, fade: 1 };
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

  const r = map(efStrength(storm.ef), 0, 5, 0.03, 0.10);
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

  // GRID
  stroke(255, 22);
  strokeWeight(1);
  const gridN = 8;
  for (let i = 1; i < gridN; i++) {
    const gx = ix + (i / gridN) * iw;
    const gy = iy + (i / gridN) * ih;
    line(gx, iy, gx, iy + ih);
    line(ix, gy, ix + iw, gy);
  }
  noStroke();

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
  return { x: random(width), y: random(height), vy: random(650, 1050), len: random(8, 16), drift: random(-40, 40) };
}
function updateRain(v) {
  if (!storm.rainOn) return;
  const dt = deltaTime / 1000;
  for (const d of rain) {
    d.x += d.drift * dt;
    d.y += d.vy * dt;
    if (d.y > height + 20) { d.y = -20; d.x = random(v.x, v.x + v.w); }
    if (d.x < v.x - 60) d.x = v.x + v.w + 60;
    if (d.x > v.x + v.w + 60) d.x = v.x - 60;
  }
}
function drawRain(v) {
  if (!storm.rainOn) return;
  stroke(200, 60);
  strokeWeight(1);
  for (const d of rain) {
    if (d.x < v.x) continue;
    line(d.x, d.y, d.x + 2, d.y + d.len);
  }
  noStroke();
}

// =====================================================
// Lightning
// =====================================================
function updateLightning(v) {
  if (!storm.lightningOn) return;
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
// HUD — FIXED stage bar finishing
// =====================================================
function drawHUD(v) {
  fill(255);
  textAlign(LEFT, TOP);
  textSize(13);

  const stage = storm.stage;
  text(`Stage: ${stage}`, v.x + 16, 16);
  text(`EF: ${storm.ef}  |  Type: ${storm.type}  |  Damage: ${storm.damage.toFixed(0)}`, v.x + 16, 34);

  drawStageBar(v.x + 16, 56, 320, 14);

  if (stage === "Rope-out") {
    const rp = ropeProgress();
    textSize(12);
    text(`Rope-out: ${(rp * 100).toFixed(0)}%`, v.x + 16, 76);
  }
}

function drawStageBar(x, y, w, h) {
  const segW = w / 3;

  // compute per-stage progress
  const pForm = (storm.stage === "Forming")
    ? constrain(storm.stageElapsed / storm.formingS, 0, 1)
    : (storm.stage === "Mature" || storm.stage === "Rope-out" || storm.stage === "Gone") ? 1 : 0;

  const pMat = (storm.stage === "Mature")
    ? constrain(storm.stageElapsed / storm.matureS, 0, 1)
    : (storm.stage === "Rope-out" || storm.stage === "Gone") ? 1 : 0;

  const pRope = (storm.stage === "Rope-out")
    ? constrain(storm.stageElapsed / storm.ropeOutS, 0, 1)
    : (storm.stage === "Gone") ? 1 : 0;

  // background
  noStroke();
  fill(255, 30);
  rect(x, y, w, h, 7);

  // fills
  fill(255, 150);
  rect(x, y, segW * pForm, h, 7);
  rect(x + segW, y, segW * pMat, h, 7);
  rect(x + segW * 2, y, segW * pRope, h, 7);

  // labels
  fill(255);
  textSize(10);
  textAlign(CENTER, CENTER);
  text("Forming", x + segW * 0.5, y + h / 2);
  text("Mature",  x + segW * 1.5, y + h / 2);
  text("Rope-out",x + segW * 2.5, y + h / 2);
  textAlign(LEFT, TOP);

  // stage outline
  stroke(255, 120);
  strokeWeight(2);
  noFill();
  const idx = (storm.stage === "Forming") ? 0 : (storm.stage === "Mature") ? 1 : 2;
  rect(x + idx * segW, y, segW, h, 7);
  noStroke();
}

// =====================================================
// Science fair box
// =====================================================
function drawScienceFairBox(v) {
  const bx = v.x + 14;
  const by = height - 150;
  const bw = min(520, v.w - 28);
  const bh = 130;

  fill(0, 165);
  rect(bx, by, bw, bh, 14);

  fill(255);
  textAlign(LEFT, TOP);
  textSize(12);

  const lines = [
    "Quick science note:",
    "• Forming: a small funnel grows downward from the cloud base.",
    "• Mature: strongest/widest stage (most damage potential).",
    "• Rope-out: vortex tightens into a thin tube and dissipates.",
    "• Radar shows tornado position + recent hit ‘blips’."
  ];

  let yy = by + 12;
  for (const line of lines) {
    text(line, bx + 14, yy);
    yy += 20;
  }
}

// =====================================================
// Helpers
// =====================================================
function smoothstep(a, b, x) {
  x = constrain((x - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}
