// =====================================================
// Tornado Sim — Clean UI + REAL Rope-out + Random Subvortices
// Single-file p5.js sketch.js
// =====================================================

let ui = {};
let storm, city;
let entities = [];
let track = [];
let rain = [];
let bolts = [];
let subV = [];

const MAX_TRACK = 220;
const MAX_RAIN = 900;
const MAX_BOLTS = 4;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  textFont("system-ui, sans-serif");

  // Prevent arrow keys from scrolling the page (Chromebook fix)
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
  resetAll(true);
  initRain();
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (ui.panel) ui.panel.size(330, height - 20);
}

function draw() {
  const view = getView();

  // Apply UI -> storm every frame (safe)
  applyUI();

  // Background / scene
  drawScene(view);

  // Update
  updateStorm();
  updateEntities();
  updateRain(view);
  updateLightning(view);
  updateSubvortices();

  // Draw
  drawTornado(view);
  drawSubvortices(view);
  drawRain(view);
  drawLightning(view);

  drawMiniMap(view);
  drawHUD(view);
}

// =====================================================
// VIEW / SCENE
// =====================================================
function getView() {
  const panelW = 350;
  return { x: panelW, w: width - panelW, h: height };
}

function drawScene(v) {
  background(14);

  // main view background
  noStroke();
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

  // simple horizon silhouettes
  fill(0, 95);
  for (let i = 0; i < 30; i++) {
    const x = v.x + (i / 29) * v.w;
    const w = 12 + noise(i * 0.6 + 10) * 44;
    const h = 10 + noise(i * 0.55 + 50) * 50;
    rect(x, groundY - h, w, h, 2);
  }
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

  ui.btnNew = button("🌩️ New storm", () => resetAll(true));
  ui.btnDamage = button("🧹 Reset damage", () => resetAll(false));

  section("Lifetime");
  ui.keepTornado = checkbox("Keep tornado", true);
  ui.lifeS = sliderWithValue("Life before rope-out (s)", 3, 60, 18, 1);
  ui.ropeDurS = sliderWithValue("Rope-out duration (s)", 3, 30, 10, 1);

  section("Type");
  ui.type = selectRow("Tornado type", ["cone","wedge","rope","needle","segmented","sheathed","loop"], "cone");

  ui.spinDir = radioRow("Rotation", ["1","-1"], "1"); // 1 cyclonic, -1 anti

  section("Shape");
  ui.baseW = sliderWithValue("Base size", 60, 520, 224, 1);
  ui.topW = sliderWithValue("Top size", 80, 600, 360, 1);
  ui.height = sliderWithValue("Height", 180, 520, 330, 1);

  ui.spinDef = sliderWithValue("Spin definition", 0.8, 5.0, 2.8, 0.1);
  ui.edgeChaos = sliderWithValue("Edge chaos", 0.0, 1.2, 0.65, 0.01);
  ui.opacity = sliderWithValue("Opacity", 40, 255, 170, 1);
  ui.debris = sliderWithValue("Debris", 0.0, 1.0, 0.75, 0.01);

  section("Subvortex arms");
  ui.enableArms = checkbox("Enable arms", true);
  ui.keepSub = checkbox("Keep subvortices", false);
  ui.subLife = sliderWithValue("Subvortex lifetime (s)", 2, 20, 10, 1);
  ui.armsCount = sliderWithValue("Arms count", 0, 12, 7, 1);
  ui.armLen = sliderWithValue("Arm length", 0.5, 3.5, 1.8, 0.1);
  ui.armGirth = sliderWithValue("Arm girth", 2, 18, 10, 1);
  ui.armSpacing = sliderWithValue("Arm spacing", 0.7, 3.0, 1.7, 0.1);

  section("Weather");
  ui.rainOn = checkbox("Rain (particles)", true);
  ui.lightningOn = checkbox("Lightning", true);

  // ---------- UI helpers ----------
  function title(t) {
    const d = createDiv(t);
    d.parent(ui.panel);
    d.style("font-size", "18px");
    d.style("font-weight", "800");
    d.style("margin", "0 0 10px 0");
  }
  function section(t) {
    const d = createDiv(t);
    d.parent(ui.panel);
    d.style("margin", "14px 0 8px 0");
    d.style("font-size", "13px");
    d.style("font-weight", "800");
    d.style("opacity", "0.95");
    const hr = createDiv("");
    hr.parent(ui.panel);
    hr.style("height", "1px");
    hr.style("background", "rgba(255,255,255,0.12)");
    hr.style("margin", "8px 0 10px 0");
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
  function sliderWithValue(labelTxt, a, b, v, step) {
    const wrap = createDiv("");
    wrap.parent(ui.panel);
    wrap.style("margin", "6px 0 10px 0");

    const lab = createDiv("");
    lab.parent(wrap);
    lab.style("font-size", "12px");
    lab.style("opacity", "0.95");

    const s = createSlider(a, b, v, step);
    s.parent(wrap);
    s.style("width", "100%");

    const update = () => lab.html(`${labelTxt}: <b>${s.value()}</b>`);
    s.input(update);
    update();

    return s;
  }
  function selectRow(labelTxt, opts, selected) {
    const wrap = createDiv("");
    wrap.parent(ui.panel);
    wrap.style("margin", "6px 0 10px 0");

    const lab = createDiv(labelTxt);
    lab.parent(wrap);
    lab.style("font-size", "12px");
    lab.style("opacity", "0.95");
    lab.style("margin-bottom", "4px");

    const sel = createSelect();
    opts.forEach(o => sel.option(o));
    sel.selected(selected);
    sel.parent(wrap);
    sel.style("width", "100%");
    sel.style("padding", "6px");
    sel.style("border-radius", "10px");
    return sel;
  }
  function radioRow(labelTxt, opts, selected) {
    const wrap = createDiv("");
    wrap.parent(ui.panel);
    wrap.style("margin", "8px 0 6px 0");

    const lab = createDiv(labelTxt);
    lab.parent(wrap);
    lab.style("font-size", "12px");
    lab.style("opacity", "0.95");
    lab.style("margin-bottom", "4px");

    const r = createRadio();
    r.parent(wrap);
    opts.forEach(o => r.option(o, o));
    r.selected(selected);
    r.style("color", "#eee");
    r.style("display", "flex");
    r.style("gap", "10px");
    return r;
  }
}

function applyUI() {
  storm.keepTornado = ui.keepTornado.checked();
  storm.lifeS = ui.lifeS.value();
  storm.ropeDurS = ui.ropeDurS.value();

  storm.type = ui.type.value();
  storm.spinDir = parseInt(ui.spinDir.value(), 10); // 1 or -1

  storm.baseW = ui.baseW.value();
  storm.topW = ui.topW.value();
  storm.height = ui.height.value();

  storm.spinDef = ui.spinDef.value();
  storm.edgeChaos = ui.edgeChaos.value();
  storm.opacity = ui.opacity.value();
  storm.debris = ui.debris.value();

  storm.enableArms = ui.enableArms.checked();
  storm.keepSub = ui.keepSub.checked();
  storm.subLife = ui.subLife.value();
  storm.armsCount = ui.armsCount.value();
  storm.armLen = ui.armLen.value();
  storm.armGirth = ui.armGirth.value();
  storm.armSpacing = ui.armSpacing.value();

  storm.rainOn = ui.rainOn.checked();
  storm.lightningOn = ui.lightningOn.checked();
}

// =====================================================
// STORM / PHASES (THIS FIXES ROPE-OUT)
// =====================================================
function resetAll(resetCity) {
  storm = {
    // minimap coords 0..1
    mx: 0.50,
    my: 0.56,

    bornMs: millis(),
    phase: "forming", // forming -> mature -> ropeout -> dissipated
    ropeStartMs: 0,
    dissipateStartMs: 0,

    // defaults overwritten by UI each frame
    keepTornado: true,
    lifeS: 18,
    ropeDurS: 10,
    type: "cone",
    spinDir: 1,

    baseW: 224,
    topW: 360,
    height: 330,
    spinDef: 2.8,
    edgeChaos: 0.65,
    opacity: 170,
    debris: 0.75,

    enableArms: true,
    keepSub: false,
    subLife: 10,
    armsCount: 7,
    armLen: 1.8,
    armGirth: 10,
    armSpacing: 1.7,

    rainOn: true,
    lightningOn: true,

    score: 0
  };

  track = [];
  bolts = [];
  subV = [];

  if (resetCity) buildCity();
}

function updateStorm() {
  const dt = deltaTime / 1000;

  // Arrow key steering
  const speed = 0.26 * dt;
  if (keyIsDown(LEFT_ARROW)) storm.mx -= speed;
  if (keyIsDown(RIGHT_ARROW)) storm.mx += speed;
  if (keyIsDown(UP_ARROW)) storm.my -= speed;
  if (keyIsDown(DOWN_ARROW)) storm.my += speed;

  storm.mx = constrain(storm.mx, 0.03, 0.97);
  storm.my = constrain(storm.my, 0.03, 0.97);

  // Track
  track.push({ mx: storm.mx, my: storm.my });
  if (track.length > MAX_TRACK) track.shift();

  const ageS = (millis() - storm.bornMs) / 1000;

  // Phase logic:
  // forming ~ 3s
  if (storm.phase === "forming" && ageS >= 3) storm.phase = "mature";

  // ropeout starts after lifeS
  if (storm.phase === "mature" && ageS >= storm.lifeS) {
    storm.phase = "ropeout";
    storm.ropeStartMs = millis();
  }

  // after ropeout finishes, either stay (keep) or dissipate + vanish
  if (storm.phase === "ropeout") {
    const ropeProg = ropeProgress();
    if (ropeProg >= 1) {
      if (storm.keepTornado) {
        // If keep is ON, stay in ropeout but stop progressing (frozen at max rope look)
        // (looks like a skinny rope tornado hanging around)
      } else {
        storm.phase = "dissipated";
        storm.dissipateStartMs = millis();
      }
    }
  }

  // dissipated fades out then stays gone (no reset!)
  // User can press New storm anytime.
}

function ropeProgress() {
  if (storm.phase !== "ropeout") return 0;
  const t = (millis() - storm.ropeStartMs) / 1000;
  return constrain(t / max(1, storm.ropeDurS), 0, 1);
}

function dissipateAlpha() {
  if (storm.phase !== "dissipated") return 1;
  const t = (millis() - storm.dissipateStartMs) / 1000;
  // fade out over 2 seconds
  return 1 - constrain(t / 2.0, 0, 1);
}

// =====================================================
// TORNADO DRAW (more clear spin + real ropeout)
// =====================================================
function drawTornado(v) {
  const alpha = dissipateAlpha();
  if (alpha <= 0.001) return;

  const cloudY = v.h * 0.18 + 16;
  const groundY = v.h * 0.78;

  // tornado x based on mx
  const cx = v.x + storm.mx * v.w;

  // top anchored, bottom reaches ground based on height
  const yTop = cloudY;
  const yBot = min(groundY, yTop + storm.height);

  // forming factor
  const ageS = (millis() - storm.bornMs) / 1000;
  const form = constrain(ageS / 3.0, 0, 1);

  // rope-out progress
  const rp = ropeProgress();

  // widths (use your sliders, but fix wedge rule: top wider than bottom)
  let topW = storm.topW;
  let baseW = storm.baseW;

  // Type corrections / shape feel
  if (storm.type === "wedge") {
    // wedge: top much wider than bottom, shorter feel
    topW = max(topW, baseW * 1.4);
  }
  if (storm.type === "rope") {
    topW *= 0.5;
    baseW *= 0.35;
  }
  if (storm.type === "needle") {
    topW *= 0.45;
    baseW *= 0.22;
  }

  // ropeout thinning into a tube
  const thin = (storm.phase === "ropeout")
    ? lerp(1.0, 0.16, smoothstep(0.05, 0.85, rp))
    : 1.0;

  // when dissipating, also shrink
  const dis = lerp(1.0, 0.7, 1 - alpha);

  topW *= thin * dis;
  baseW *= thin * dis;

  // debris ring
  noStroke();
  fill(140, (storm.opacity * 0.45) * alpha);
  ellipse(cx, yBot + 18, baseW * (1.8 + storm.debris), baseW * (0.45 + 0.25 * storm.debris));

  // funnel layers
  const steps = 170;
  const t = frameCount * 0.06;
  const dir = storm.spinDir;

  for (let i = 0; i <= steps; i++) {
    const p = i / steps; // 0 top -> 1 bottom
    const y = lerp(yTop, yBot, p);

    // width at p
    let w = widthAt(p, topW, baseW, storm.type);

    // segmented
    if (storm.type === "segmented") {
      const seg = 0.75 + 0.35 * pow(max(0, sin(PI * 10 * p + t * 1.2)), 2);
      w *= seg;
    }

    // sheathed (fat veil near top)
    if (storm.type === "sheathed") {
      const veil = 1.0 + 0.70 * smoothstep(0.0, 0.25, 1 - p);
      w *= veil;
    }

    // edge chaos
    const chaos = (noise(p * 3.1, t * 0.12) - 0.5) * (storm.edgeChaos * 24);

    // clear spin banding
    const spin = sin((t * storm.spinDef * dir) + p * 18) * w * 0.26;

    // rope whip bend (only during ropeout)
    const whip = (storm.phase === "ropeout")
      ? (rp * 52 * pow(p, 1.5) * sin(t * 6 + p * 12))
      : 0;

    const a = storm.opacity * (0.15 + 0.85 * form) * (0.55 + 0.45 * (1 - p)) * alpha;

    // body
    fill(230, a);
    ellipse(cx + chaos + spin + whip, y, w, lerp(8, 16, 1 - p));

    // band strokes (more defined)
    stroke(40, a * 0.55);
    strokeWeight(max(1.0, w * 0.013));
    const k = 0.22 + 0.14 * (1 - p);
    const x1 = (cx + chaos + whip) - w * 0.46;
    const x2 = (cx + chaos + whip) + w * 0.46;
    line(x1, y - w * k, x2, y + w * k);

    stroke(255, a * 0.20);
    strokeWeight(max(0.9, w * 0.010));
    line(x1, y + w * k * 0.55, x2, y - w * k * 0.55);
    noStroke();
  }

  // loop type: add loop near base
  if (storm.type === "loop" && form > 0.9 && alpha > 0.2) {
    const lp = 0.88;
    const y = lerp(yTop, yBot, lp);
    const w = widthAt(lp, topW, baseW, storm.type);
    const loopX = cx + sin(t * 0.8) * (w * 0.7);

    stroke(255, 120 * alpha);
    strokeWeight(3);
    noFill();
    ellipse(loopX, y, w * 1.2, w * 0.45);
    noStroke();
  }
}

function widthAt(p, topW, baseW, type) {
  if (type === "wedge") return lerp(topW, baseW, pow(p, 0.55)); // top wider than bottom
  if (type === "rope") return lerp(topW * 0.35, baseW * 0.25, pow(p, 1.2));
  if (type === "needle") return lerp(topW * 0.30, baseW * 0.15, pow(p, 1.35));
  if (type === "loop") return lerp(topW * 0.42, baseW * 0.22, pow(p, 1.05));
  return lerp(topW, baseW, pow(p, 0.95));
}

// =====================================================
// SUBVORTICES — thicker, bigger, random pop-out then fade
// =====================================================
function updateSubvortices() {
  if (!storm.enableArms || storm.armsCount <= 0) {
    subV = [];
    return;
  }

  const dt = deltaTime / 1000;
  const target = storm.armsCount;

  // spawn randomly until target count is reached
  while (subV.length < target) {
    // spawn with randomness so they don’t appear all at once
    if (random() < 0.25) subV.push(makeSub());
    else break;
  }

  // update
  for (const s of subV) {
    s.age += dt;
    s.phase += dt * s.omega;
    s.rad = lerp(s.rad, s.radTarget, dt * 1.6);

    if (!storm.keepSub) {
      s.alpha = 1 - constrain(s.age / storm.subLife, 0, 1);
    } else {
      s.alpha = 1;
    }
  }

  // remove finished ones, then allow new ones to spawn later
  if (!storm.keepSub) {
    subV = subV.filter(s => s.age < storm.subLife);
  }

  // hard cap safety
  if (subV.length > 14) subV.length = 14;
}

function makeSub() {
  return {
    rad: random(18, 55) * storm.armSpacing,
    radTarget: random(25, 80) * storm.armSpacing,
    omega: random(2.0, 4.2) * (random() < 0.5 ? 1 : -1),
    phase: random(TWO_PI),
    age: 0,
    alpha: 1,
    thickness: storm.armGirth * random(0.8, 1.2), // thicker
    length: storm.armLen * random(55, 105), // longer
    twist: random(0.9, 1.8)
  };
}

function drawSubvortices(v) {
  const alpha = dissipateAlpha();
  if (alpha <= 0.001) return;
  if (!storm.enableArms || subV.length === 0) return;

  const cloudY = v.h * 0.18 + 16;
  const groundY = v.h * 0.78;
  const cx = v.x + storm.mx * v.w;

  const yTop = cloudY;
  const yBot = min(groundY, yTop + storm.height);
  const baseY = lerp(yTop, yBot, 0.82);

  // approximate core width near base
  const coreW = widthAt(0.82, storm.topW, storm.baseW, storm.type);

  const dir = storm.spinDir;
  const t = frameCount * 0.06;

  for (const s of subV) {
    const a = 180 * s.alpha * alpha;

    const ang = (s.phase + sin(t * 0.6) * 0.15) * dir;
    const rx = (coreW * 0.35) + s.rad;
    const x0 = cx + cos(ang) * rx;
    const y0 = baseY + sin(ang) * (rx * 0.18);

    const segs = 18;
    stroke(255, a * 0.30);
    strokeWeight(s.thickness);
    noFill();
    beginShape();
    for (let i = 0; i <= segs; i++) {
      const p = i / segs;
      const curl = sin((p * PI * 1.6) + s.phase * s.twist) * (1 - p);
      const ax = x0 + cos(ang + curl) * (s.length * p);
      const ay = y0 + sin(ang + curl) * (s.length * p) * 0.28 + p * 10;
      curveVertex(ax, ay);
    }
    endShape();

    stroke(40, a * 0.38);
    strokeWeight(max(2, s.thickness * 0.48));
    beginShape();
    for (let i = 0; i <= segs; i++) {
      const p = i / segs;
      const curl = sin((p * PI * 1.6) + s.phase * s.twist) * (1 - p);
      const ax = x0 + cos(ang + curl) * (s.length * p);
      const ay = y0 + sin(ang + curl) * (s.length * p) * 0.28 + p * 10;
      curveVertex(ax, ay);
    }
    endShape();
    noStroke();

    // little fat core at base
    fill(235, 120 * s.alpha * alpha);
    ellipse(x0, y0, s.thickness * 1.4, s.thickness * 1.0);
  }
}

// =====================================================
// MINIMAP CITY (emoji) + damage
// =====================================================
function buildCity() {
  entities = [];
  track = [];

  // simple road grid
  city = {
    roads: [
      { x1: 0.08, y1: 0.28, x2: 0.92, y2: 0.28 },
      { x1: 0.08, y1: 0.55, x2: 0.92, y2: 0.55 },
      { x1: 0.08, y1: 0.80, x2: 0.92, y2: 0.80 },
      { x1: 0.25, y1: 0.08, x2: 0.25, y2: 0.92 },
      { x1: 0.50, y1: 0.08, x2: 0.50, y2: 0.92 },
      { x1: 0.75, y1: 0.08, x2: 0.75, y2: 0.92 },
    ]
  };

  // buildings + trees
  for (let i = 0; i < 10; i++) entities.push(makeEntity("🏢", "building", random(0.12, 0.88), random(0.12, 0.88)));
  for (let i = 0; i < 10; i++) entities.push(makeEntity("🌳", "tree", random(0.12, 0.88), random(0.12, 0.88)));

  // cars move on lanes
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
    char, kind, x, y,
    hit: false,
    state: "ok",
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
  const r = 0.06; // minimap hit radius feel

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

  // impacts (simple but stable)
  for (const e of entities) {
    const d = dist(storm.mx, storm.my, e.x, e.y);

    if (!e.hit && d < r * 1.6) {
      if (e.kind === "building") e.rot = (noise(frameCount * 0.03, e.x * 9) - 0.5) * 0.35;
      if (e.kind === "tree") e.rot = (noise(frameCount * 0.04, e.y * 9) - 0.5) * 0.55;
    }

    if (!e.hit && d < r) {
      e.hit = true;
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

    if (e.state !== "ok") {
      e.x = constrain(e.x + e.vx * dt, 0.02, 0.98);
      e.y = constrain(e.y + e.vy * dt, 0.02, 0.98);
      e.vx *= 0.92;
      e.vy *= 0.92;
      if (e.state === "destroyed") e.fade = max(0.35, e.fade - dt * 0.5);
    }
  }
}

function drawMiniMap(v) {
  const mw = 270, mh = 185;
  const mx = v.x + v.w - mw - 12;
  const my = height - mh - 12;

  noStroke();
  fill(0, 175);
  rect(mx, my, mw, mh, 14);

  fill(235);
  textAlign(LEFT, CENTER);
  textSize(12);
  text("Mini map", mx + 12, my + 18);

  const ix = mx + 12, iy = my + 30, iw = mw - 24, ih = mh - 42;

  fill(18);
  rect(ix, iy, iw, ih, 10);

  // roads
  stroke(150, 140);
  strokeWeight(2);
  for (const r of city.roads) {
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

  // tornado marker
  fill(255);
  circle(ix + storm.mx * iw, iy + storm.my * ih, 10);
}

// =====================================================
// RAIN
// =====================================================
function initRain() {
  rain = [];
  for (let i = 0; i < MAX_RAIN; i++) rain.push(makeDrop());
}
function makeDrop() {
  return { x: random(width), y: random(height), vy: random(700, 1100), len: random(8, 16), drift: random(-40, 40) };
}
function updateRain(v) {
  if (!storm.rainOn) return;
  const dt = deltaTime / 1000;
  for (const d of rain) {
    d.x += d.drift * dt;
    d.y += d.vy * dt;
    if (d.y > height + 20) { d.y = -20; d.x = random(v.x, v.x + v.w); }
    if (d.x < v.x - 50) d.x = v.x + v.w + 50;
    if (d.x > v.x + v.w + 50) d.x = v.x - 50;
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
// LIGHTNING
// =====================================================
function updateLightning(v) {
  if (!storm.lightningOn) return;
  if (random() < 0.012 && bolts.length < MAX_BOLTS) bolts.push(makeBolt(v));
  const dt = deltaTime / 1000;
  for (const b of bolts) b.ttl -= dt;
  bolts = bolts.filter(b => b.ttl > 0);
}
function makeBolt(v) {
  const x0 = random(v.x + 30, v.x + v.w - 30);
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
    noStroke();
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
// HUD — shows “how much of it” like you asked
// =====================================================
function drawHUD(v) {
  fill(255);
  textAlign(LEFT, TOP);
  textSize(13);

  const ageS = (millis() - storm.bornMs) / 1000;
  const rp = ropeProgress();
  const alpha = dissipateAlpha();

  // progress text (clear)
  text(`Age: ${ageS.toFixed(1)}s`, v.x + 16, 16);

  // life progress bar
  drawBar(v.x + 16, 34, 260, 10, constrain(ageS / max(1, storm.lifeS), 0, 1), "Life");

  // rope progress bar
  drawBar(v.x + 16, 52, 260, 10, rp, "Rope-out");

  // dissipate bar
  const diss = (storm.phase === "dissipated") ? (1 - alpha) : 0;
  drawBar(v.x + 16, 70, 260, 10, diss, "Dissipate");

  const rotTxt = (storm.spinDir === -1) ? "Anti-cyclonic" : "Cyclonic";
  text(`${storm.type} | ${rotTxt} | Phase: ${storm.phase}`, v.x + 16, 90);
}

function drawBar(x, y, w, h, p, label) {
  noStroke();
  fill(255, 40);
  rect(x, y, w, h, 6);
  fill(255, 160);
  rect(x, y, w * p, h, 6);
  fill(255);
  textSize(11);
  text(`${label}: ${(p * 100).toFixed(0)}%`, x + w + 8, y - 2);
}

// =====================================================
// HELPERS
// =====================================================
function smoothstep(a, b, x) {
  x = constrain((x - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}
