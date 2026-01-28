// Tornado Simulator — FINAL+ (p5.js)
// Features:
// - EF scale selector (EF0–EF5)
// - Damage score + hit log
// - Radar window
// - Mini map "city" with emoji entities (buildings/trees/cars) that react to tornado
// - Arrow keys + Touch joystick control
// - Tornado types + clearer spin + rope-out as thin tube/whip
// - Reset / New Storm button

let ui = {};
let storm, radar;
let entities = [];   // emoji entities on minimap
let roads = [];      // minimap road segments
let track = [];      // minimap tornado trail
let lastHitLog = [];
let touchJoy = { active: false, id: null, x: 0, y: 0, dx: 0, dy: 0 };

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  angleMode(RADIANS);
  textFont("system-ui, sans-serif");

  buildUI();
  newStorm(true);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

function draw() {
  background(16);

  const view = getViewRect();

  // background scene
  drawSkyAndGround(view);

  // update controls
  updateControls();

  // update storm life + rope-out
  updateStorm();

  // update entities and damage
  updateEntities();

  // draw main tornado view (right side)
  drawMainTornado(view);

  // draw mini map + radar
  drawMiniMap(view);
  drawRadar(view);

  // draw HUD
  drawHUD(view);

  // touch joystick (if used)
  drawTouchJoystick();
}

// ===================== UI =====================
function buildUI() {
  // lock page scroll
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  document.body.style.margin = "0";

  // Left panel container
  ui.panel = createDiv("");
  ui.panel.position(10, 10);
  ui.panel.size(320, windowHeight - 20);
  ui.panel.style("overflow-y", "auto");
  ui.panel.style("overflow-x", "hidden");
  ui.panel.style("padding", "12px");
  ui.panel.style("border-radius", "16px");
  ui.panel.style("background", "rgba(0,0,0,0.65)");
  ui.panel.style("color", "#eee");
  ui.panel.style("box-sizing", "border-box");

  makeTitle("🌪️ Tornado Simulator", ui.panel);

  ui.btnNew = makeButton("🌩️ New Storm", () => newStorm(true));
  ui.btnNew.parent(ui.panel);

  ui.btnResetDamage = makeButton("🧹 Reset Damage Only", () => resetDamage());
  ui.btnResetDamage.parent(ui.panel);

  makeHr(ui.panel);

  makeLabel("EF Scale", ui.panel);
  ui.ef = createSelect();
  ["EF0","EF1","EF2","EF3","EF4","EF5"].forEach(x => ui.ef.option(x));
  ui.ef.selected("EF3");
  ui.ef.parent(ui.panel);
  ui.ef.style("width","100%");
  ui.ef.changed(() => applyEF(ui.ef.value()));

  makeHr(ui.panel);

  makeLabel("Tornado Type", ui.panel);
  ui.type = createSelect();
  [
    "cone", "wedge", "rope", "needle",
    "segmented", "sheathed", "loop"
  ].forEach(x => ui.type.option(x));
  ui.type.selected("wedge");
  ui.type.parent(ui.panel);
  ui.type.style("width","100%");

  makeLabelSmall("Tip: try Wedge + EF4 for big damage.", ui.panel);

  makeHr(ui.panel);

  makeLabel("Controls", ui.panel);
  makeLabelSmall("Arrow keys steer tornado on the mini map.", ui.panel);
  makeLabelSmall("Touch: drag the on-screen joystick.", ui.panel);

  makeHr(ui.panel);

  makeLabel("Visual Tuning", ui.panel);
  ui.spin = makeSlider("Spin clarity", 0.6, 3.0, 1.8, 0.01, ui.panel);
  ui.tube = makeSlider("Rope-out thinness", 0.12, 0.45, 0.24, 0.01, ui.panel);
  ui.trail = makeSlider("Trail length", 40, 250, 140, 1, ui.panel);

  makeHr(ui.panel);

  makeLabel("Mini Map", ui.panel);
  ui.mmScale = makeSlider("Map size", 0.7, 1.6, 1.0, 0.01, ui.panel);
  ui.mmAlpha = makeSlider("Map opacity", 80, 235, 175, 1, ui.panel);

  makeHr(ui.panel);

  makeLabel("Science Fair Panel", ui.panel);
  ui.showInfo = createCheckbox("Show explanation panel", true);
  ui.showInfo.parent(ui.panel);
  ui.showInfo.style("color", "#eee");
}

function makeTitle(txt, parent) {
  const d = createDiv(txt);
  d.parent(parent);
  d.style("font-size","18px");
  d.style("font-weight","700");
  d.style("margin-bottom","10px");
}

function makeLabel(txt, parent) {
  const d = createDiv(txt);
  d.parent(parent);
  d.style("font-size","13px");
  d.style("font-weight","700");
  d.style("margin-top","8px");
  d.style("margin-bottom","6px");
}

function makeLabelSmall(txt, parent) {
  const d = createDiv(txt);
  d.parent(parent);
  d.style("font-size","12px");
  d.style("opacity","0.85");
  d.style("margin","4px 0");
}

function makeHr(parent) {
  const d = createDiv("");
  d.parent(parent);
  d.style("height","1px");
  d.style("background","rgba(255,255,255,0.12)");
  d.style("margin","12px 0");
}

function makeButton(txt, fn) {
  const b = createButton(txt);
  b.mousePressed(fn);
  b.style("width","100%");
  b.style("margin","6px 0");
  b.style("padding","10px");
  b.style("border-radius","12px");
  b.style("border","none");
  b.style("background","#222");
  b.style("color","#eee");
  b.style("font-size","14px");
  b.style("cursor","pointer");
  return b;
}

function makeSlider(name, minV, maxV, startV, stepV, parent) {
  const wrap = createDiv("");
  wrap.parent(parent);
  wrap.style("margin","6px 0 10px 0");

  const lab = createDiv(`${name}: <b>${fmt(startV)}</b>`);
  lab.parent(wrap);
  lab.style("font-size","12px");
  lab.style("opacity","0.92");

  const s = createSlider(minV, maxV, startV, stepV);
  s.parent(wrap);
  s.style("width","100%");
  s.input(() => lab.html(`${name}: <b>${fmt(s.value())}</b>`));
  return s;
}

function fmt(v) {
  return (Math.abs(v) < 10 && String(v).includes(".")) ? nf(v,1,2) : v;
}

// ===================== Storm / EF scale =====================
function newStorm(resetEntitiesAlso) {
  storm = {
    // minimap coordinates (0..1)
    mx: 0.50,
    my: 0.55,

    // tornado lifecycle
    born: millis(),
    formS: 3.5,
    lifeS: 18,
    ropeS: 10,

    // shape + visuals
    type: ui.type.value(),
    rope: false,

    // EF parameters (set by applyEF)
    ef: "EF3",
    hitRadius: 0.055,
    damagePerHit: 120,
    carSpeed: 0.08, // map units per second along roads
    gust: 1.0,

    // score
    score: 0
  };

  radar = {
    sweep: 0,
    blips: [] // {mx,my,ttl,kind}
  };

  applyEF(ui.ef.value());

  if (resetEntitiesAlso) {
    buildCity();
    track = [];
    lastHitLog = [];
  }
}

function applyEF(ef) {
  storm.ef = ef;

  // Simple tuned values (feel free to tweak)
  const map = {
    EF0: { hitRadius: 0.030, damagePerHit: 30,  gust: 0.55, carSpeed: 0.09 },
    EF1: { hitRadius: 0.036, damagePerHit: 55,  gust: 0.70, carSpeed: 0.09 },
    EF2: { hitRadius: 0.044, damagePerHit: 85,  gust: 0.85, carSpeed: 0.085 },
    EF3: { hitRadius: 0.055, damagePerHit: 120, gust: 1.00, carSpeed: 0.080 },
    EF4: { hitRadius: 0.070, damagePerHit: 170, gust: 1.20, carSpeed: 0.075 },
    EF5: { hitRadius: 0.085, damagePerHit: 240, gust: 1.45, carSpeed: 0.070 }
  };
  const v = map[ef] || map.EF3;
  storm.hitRadius = v.hitRadius;
  storm.damagePerHit = v.damagePerHit;
  storm.gust = v.gust;
  storm.carSpeed = v.carSpeed;
}

function resetDamage() {
  storm.score = 0;
  lastHitLog = [];
  for (const e of entities) {
    e.hit = false;
    e.state = "ok";
    e.rot = 0;
    e.flip = false;
    e.vx = 0;
    e.vy = 0;
    e.fade = 1;
    e.flingT = 0;
  }
}

// ===================== Layout =====================
function getViewRect() {
  const panelW = 340;
  return { x: panelW, y: 0, w: width - panelW, h: height };
}

function drawSkyAndGround(view) {
  // sky
  noStroke();
  fill(20);
  rect(view.x, 0, view.w, view.h);

  // cloud base region
  fill(16);
  const cloudY = view.h * 0.18;
  ellipse(view.x + view.w * 0.62, cloudY + 18, view.w * 1.05, 170);
  fill(13);
  ellipse(view.x + view.w * 0.62, cloudY + 34, view.w * 0.75, 120);

  // ground
  const gY = view.h * 0.78;
  fill(25);
  rect(view.x, gY, view.w, view.h - gY);

  // town silhouettes
  drawTown(view, gY);
}

function drawTown(view, groundY) {
  noStroke();
  fill(0, 80);
  rect(view.x, groundY + 8, view.w, height - (groundY + 8));
  const baseY = groundY + 6;
  const n = 34;
  for (let i = 0; i < n; i++) {
    const x = view.x + (i / (n - 1)) * view.w;
    const jitter = (noise(i * 0.22) - 0.5) * 60;
    const w = 12 + noise(i * 0.6 + 10) * 44;
    const h = 10 + noise(i * 0.55 + 50) * 44;
    fill(0, 110);
    rect(x + jitter, baseY - h, w, h, 2);
    fill(255, 14);
    rect(x + jitter + 3, baseY - h + 3, w - 6, 2);
  }
}

// ===================== Controls =====================
function updateControls() {
  // Arrow keys drive the minimap position
  const dt = deltaTime / 1000;
  const speed = 0.22 * dt; // map units/sec-ish feel

  let dx = 0, dy = 0;
  if (keyIsDown(LEFT_ARROW))  dx -= speed;
  if (keyIsDown(RIGHT_ARROW)) dx += speed;
  if (keyIsDown(UP_ARROW))    dy -= speed;
  if (keyIsDown(DOWN_ARROW))  dy += speed;

  // Touch joystick adds too
  if (touchJoy.active) {
    dx += touchJoy.dx * speed * 1.5;
    dy += touchJoy.dy * speed * 1.5;
  }

  storm.mx = constrain(storm.mx + dx, 0.02, 0.98);
  storm.my = constrain(storm.my + dy, 0.02, 0.98);

  // record trail
  track.push({ mx: storm.mx, my: storm.my });
  const maxTrail = ui.trail.value();
  if (track.length > maxTrail) track.shift();
}

function updateStorm() {
  // update type live from UI
  storm.type = ui.type.value();

  const age = (millis() - storm.born) / 1000;

  // rope-out after lifeS (formation excluded for simplicity)
  if (age > (storm.formS + storm.lifeS)) storm.rope = true;

  // If not "Keep tornado" (not included here), you could auto-new storm
  // but we keep it persistent for this build.
}

// ===================== Tornado drawing =====================
function drawMainTornado(view) {
  // map coords -> main scene x
  const cx = view.x + storm.mx * view.w;
  const cloudY = view.h * 0.18;
  const groundY = view.h * 0.78;

  // formation: funnel extends down
  const age = (millis() - storm.born) / 1000;
  const form = storm.formS <= 0 ? 1 : constrain(age / storm.formS, 0, 1);
  const yTop = cloudY + 16;
  const yBot = lerp(cloudY + 35, groundY, smoothstep(0.0, 1.0, form));

  // rope-out morph
  const ropeStart = storm.formS + storm.lifeS;
  const ropeProg = storm.ropeS <= 0 ? 1 : constrain((age - ropeStart) / storm.ropeS, 0, 1);
  const inRope = storm.rope ? 1 : 0;

  // width settings (depends on type)
  let topW = mapTypeTopW(storm.type);
  let baseW = mapTypeBaseW(storm.type);

  // EF changes size a bit
  const efScale = mapEFSize(storm.ef);
  topW *= efScale;
  baseW *= efScale;

  // rope-out becomes thin tube/whip
  const tubeThin = inRope ? smoothstep(0.05, 0.85, ropeProg) : 0;
  const thinMult = lerp(1.0, ui.tube.value(), tubeThin);

  // spin clarity
  const spin = ui.spin.value() * (storm.ef === "EF5" ? 1.15 : 1.0);
  const spinDir = 1;

  // debris at ground
  drawDebrisRing(cx, yBot, baseW * thinMult, form, tubeThin);

  // draw funnel as outline + bands
  const steps = 170;
  for (let i = 0; i <= steps; i++) {
    const p = i / steps;
    const y = lerp(yTop, yBot, p);

    let w = typeWidthAt(storm.type, p, baseW, topW) * thinMult;
    if (storm.type === "segmented") {
      const seg = 0.70 + 0.35 * pow(max(0, sin(PI * 12 * p + millis() * 0.002)), 2);
      w *= seg;
    }

    // bending + rope whip
    const bend = centerOffset(p, age, inRope ? ropeProg : 0);

    // smoky body
    const a = (165 + 60 * (1 - p)) * (0.18 + 0.82 * form) * (1 - 0.55 * tubeThin);
    noStroke();
    fill(220, a);
    ellipse(cx + bend, y, w, lerp(8, 30, 1 - p));

    // spin bands
    const bandPhase = age * 9.0 * spin * spinDir + p * 22.0;
    const b = sin(bandPhase);
    const b2 = sin(bandPhase + 2.15);

    const k = 0.22 + 0.14 * (1 - p);
    const x1 = (cx + bend) - w * (0.42 + 0.12 * b);
    const x2 = (cx + bend) + w * (0.42 + 0.12 * b);

    stroke(40, a * 0.50);
    strokeWeight(max(1.1, w * 0.014));
    line(x1, y - w * k, x2, y + w * k);

    stroke(255, a * 0.25 * (0.6 + 0.4 * (0.5 + 0.5 * b2)));
    strokeWeight(max(0.9, w * 0.011));
    line(x1, y + w * k * 0.55, x2, y - w * k * 0.55);
  }

  // loop type: draw a real loop near the bottom
  if (storm.type === "loop" && form > 0.9) {
    const lp = 0.88;
    const y = lerp(yTop, yBot, lp);
    const w = typeWidthAt(storm.type, lp, baseW, topW) * thinMult;
    const bend = centerOffset(lp, age, inRope ? ropeProg : 0);

    const loopX = cx + bend + sin(age * 3.2) * (w * 0.35);
    const rx = w * 0.55;
    const ry = w * 0.22;

    stroke(255, 120 * form);
    strokeWeight(3);
    noFill();
    ellipse(loopX, y, rx * 2, ry * 2);

    stroke(255, 55 * form);
    strokeWeight(8);
    arc(loopX, y, rx * 2, ry * 2, PI * 0.10, PI * 1.25);
  }

  noStroke();
}

function mapTypeTopW(type) {
  switch (type) {
    case "rope": return 90;
    case "needle": return 110;
    case "cone": return 220;
    case "wedge": return 420;
    case "segmented": return 220;
    case "sheathed": return 280;
    case "loop": return 120;
    default: return 220;
  }
}

function mapTypeBaseW(type) {
  switch (type) {
    case "rope": return 50;
    case "needle": return 40;
    case "cone": return 120;
    case "wedge": return 220;
    case "segmented": return 140;
    case "sheathed": return 130;
    case "loop": return 60;
    default: return 120;
  }
}

function mapEFSize(ef) {
  switch (ef) {
    case "EF0": return 0.65;
    case "EF1": return 0.78;
    case "EF2": return 0.92;
    case "EF3": return 1.05;
    case "EF4": return 1.22;
    case "EF5": return 1.38;
    default: return 1.0;
  }
}

function typeWidthAt(type, p, baseW, topW) {
  // p: 0 top -> 1 bottom
  switch (type) {
    case "rope":
      return lerp(topW * 0.35, baseW * 0.25, pow(p, 1.2));
    case "needle":
      return lerp(topW * 0.30, baseW * 0.15, pow(p, 1.35));
    case "cone":
      return lerp(topW, baseW, pow(p, 0.95));
    case "wedge":
      // TOP wider than bottom
      return lerp(topW, baseW, pow(p, 0.55));
    case "segmented":
      return lerp(topW, baseW, pow(p, 0.95));
    case "sheathed": {
      const base = lerp(topW, baseW, pow(p, 0.95));
      const sheath = 1.0 + 0.70 * smoothstep(0.0, 0.22, 1 - p);
      return base * sheath;
    }
    case "loop":
      return lerp(topW * 0.42, baseW * 0.22, pow(p, 1.05));
    default:
      return lerp(topW, baseW, pow(p, 0.95));
  }
}

function centerOffset(p, age, ropeProg) {
  // bend plus rope whip
  const bend = (noise(p * 2.2, age * 0.18) - 0.5) * 14 * (0.7 + 0.3 * storm.gust);
  const whip = sin(age * 11.0 + p * 14.0) * (smoothstep(0.15, 1.0, ropeProg) * 55) * pow(p, 1.3);
  return bend + whip;
}

function drawDebrisRing(cx, groundY, baseW, form, tubeThin) {
  const vis = (0.15 + 0.85 * form) * (1 - 0.75 * tubeThin);
  noStroke();
  fill(140, 110 * vis);
  ellipse(cx, groundY + 18, baseW * (1.05 + 1.1 * storm.gust), baseW * 0.30);

  // small debris specks
  const n = int(140 * storm.gust);
  for (let i = 0; i < n; i++) {
    const ang = (millis() * 0.002 * 4.6) + i * 0.22;
    const r = random(8, baseW * 0.55);
    const x = cx + cos(ang) * r;
    const y = groundY + 8 + sin(ang) * r * 0.22 - random(0, 48);
    fill(220, 70 * vis);
    rect(x, y, 2, 2);
  }
}

// ===================== Mini map city =====================
function buildCity() {
  entities = [];
  roads = [];
  track = [];

  // grid roads (minimap coords)
  // horizontal
  roads.push({ x1: 0.08, y1: 0.28, x2: 0.92, y2: 0.28 });
  roads.push({ x1: 0.08, y1: 0.55, x2: 0.92, y2: 0.55 });
  roads.push({ x1: 0.08, y1: 0.80, x2: 0.92, y2: 0.80 });
  // vertical
  roads.push({ x1: 0.25, y1: 0.08, x2: 0.25, y2: 0.92 });
  roads.push({ x1: 0.50, y1: 0.08, x2: 0.50, y2: 0.92 });
  roads.push({ x1: 0.75, y1: 0.08, x2: 0.75, y2: 0.92 });

  // Buildings 🏢
  for (let i = 0; i < 10; i++) {
    entities.push(makeEntity("🏢", "building", random(0.12, 0.88), random(0.12, 0.88)));
  }

  // Trees 🌳
  for (let i = 0; i < 10; i++) {
    entities.push(makeEntity("🌳", "tree", random(0.12, 0.88), random(0.12, 0.88)));
  }

  // Cars 🚗 (snap to roads)
  for (let i = 0; i < 8; i++) {
    const car = makeEntity("🚗", "car", 0.25, 0.28);
    // pick a road lane and direction
    const lanes = [
      { kind: "h", y: 0.28 }, { kind: "h", y: 0.55 }, { kind: "h", y: 0.80 },
      { kind: "v", x: 0.25 }, { kind: "v", x: 0.50 }, { kind: "v", x: 0.75 }
    ];
    const lane = random(lanes);
    car.lane = lane;
    car.t = random(0, 1);     // position along lane 0..1
    car.dir = random([ -1, 1 ]);
    car.speed = storm.carSpeed * random(0.7, 1.3);
    car.rot = 0;
    car.flip = false;
    entities.push(car);
  }
}

function makeEntity(char, kind, x, y) {
  return {
    char, kind,
    x, y,
    state: "ok",  // ok, damaged, destroyed
    hit: false,
    rot: 0,
    flip: false,
    vx: 0, vy: 0,
    fade: 1,
    flingT: 0,
    lane: null,
    t: 0,
    dir: 1,
    speed: 0
  };
}

function updateEntities() {
  const dt = deltaTime / 1000;

  // cars move on grid roads
  for (const e of entities) {
    if (e.kind === "car" && e.state === "ok") {
      e.t += e.dir * e.speed * dt;

      // bounce at ends
      if (e.t < 0) { e.t = 0; e.dir *= -1; }
      if (e.t > 1) { e.t = 1; e.dir *= -1; }

      if (e.lane.kind === "h") {
        e.x = lerp(0.10, 0.90, e.t);
        e.y = e.lane.y;
        e.rot = (e.dir > 0) ? 0 : PI; // face direction
      } else {
        e.x = e.lane.x;
        e.y = lerp(0.10, 0.90, e.t);
        e.rot = (e.dir > 0) ? HALF_PI : -HALF_PI;
      }
    }
  }

  // tornado impact on minimap
  for (const e of entities) {
    const d = dist(storm.mx, storm.my, e.x, e.y);

    // near effect (shake/tilt)
    if (!e.hit && d < storm.hitRadius * 1.6) {
      if (e.kind === "building") e.rot = (noise(frameCount * 0.03, e.x * 9) - 0.5) * 0.35;
      if (e.kind === "tree") e.rot = (noise(frameCount * 0.04, e.y * 9) - 0.5) * 0.55;
    }

    // direct hit: flip/fling/fall
    if (!e.hit && d < storm.hitRadius) {
      e.hit = true;

      // log + score
      storm.score += storm.damagePerHit;
      addHitLog(`${e.char} ${e.kind} hit`);

      // radar blip
      radar.blips.push({ mx: e.x, my: e.y, ttl: 2.0, kind: e.kind });

      if (e.kind === "car") {
        e.state = "destroyed";
        e.flip = true; // upside down
        e.flingT = 0.6;
        const ang = atan2(e.y - storm.my, e.x - storm.mx);
        e.vx = cos(ang) * 0.35;
        e.vy = sin(ang) * 0.35;
      } else if (e.kind === "tree") {
        e.state = "destroyed";
        e.flingT = 0.8;
        const ang = atan2(e.y - storm.my, e.x - storm.mx);
        e.vx = cos(ang) * 0.18;
        e.vy = sin(ang) * 0.18;
        e.rot = (random() < 0.5 ? -1 : 1) * HALF_PI;
      } else if (e.kind === "building") {
        e.state = "damaged";
        e.flingT = 0.5;
        const ang = atan2(e.y - storm.my, e.x - storm.mx);
        e.vx = cos(ang) * 0.12;
        e.vy = sin(ang) * 0.12;
        e.rot = (random() < 0.5 ? -1 : 1) * (PI / 2.2);
      }
    }

    // apply fling motion (map-space)
    if (e.flingT > 0) {
      e.flingT -= dt;
      e.x += e.vx * dt;
      e.y += e.vy * dt;

      // keep on map
      e.x = constrain(e.x, 0.02, 0.98);
      e.y = constrain(e.y, 0.02, 0.98);

      // fade a bit for destroyed
      if (e.state === "destroyed") e.fade = max(0.35, e.fade - dt * 0.5);
    }
  }

  // radar sweep
  radar.sweep += dt * 1.2;
  if (radar.sweep > TWO_PI) radar.sweep -= TWO_PI;

  // radar blips decay
  for (const b of radar.blips) b.ttl -= dt;
  radar.blips = radar.blips.filter(b => b.ttl > 0);
}

function addHitLog(msg) {
  lastHitLog.unshift(`${nf((millis()-storm.born)/1000,1,1)}s: ${msg}`);
  if (lastHitLog.length > 6) lastHitLog.pop();
}

// ===================== Mini map drawing =====================
function drawMiniMap(view) {
  const scale = ui.mmScale.value();
  const mw = 270 * scale;
  const mh = 185 * scale;
  const mx = view.x + view.w - mw - 12;
  const my = height - mh - 12;

  noStroke();
  fill(0, ui.mmAlpha.value());
  rect(mx, my, mw, mh, 14);

  fill(235);
  textSize(12);
  textAlign(LEFT, CENTER);
  text("Mini Map", mx + 12, my + 18);

  const ix = mx + 12;
  const iy = my + 30;
  const iw = mw - 24;
  const ih = mh - 42;

  // land
  noStroke();
  fill(18);
  rect(ix, iy, iw, ih, 10);

  // roads
  stroke(150, 140);
  strokeWeight(2);
  for (const r of roads) {
    line(ix + r.x1 * iw, iy + r.y1 * ih, ix + r.x2 * iw, iy + r.y2 * ih);
  }

  // track trail
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
  }

  // entities (emojis)
  textAlign(CENTER, CENTER);
  textSize(16 * scale);

  for (const e of entities) {
    push();
    translate(ix + e.x * iw, iy + e.y * ih);

    // small shake near tornado (only if not hit)
    if (!e.hit) {
      const d = dist(storm.mx, storm.my, e.x, e.y);
      if (d < storm.hitRadius * 1.7) {
        translate((noise(frameCount * 0.05, e.x * 10) - 0.5) * 2, (noise(frameCount * 0.05, e.y * 10) - 0.5) * 2);
      }
    }

    rotate(e.rot || 0);
    if (e.flip) scale(1, -1);

    // fade when destroyed
    const alpha = 255 * (e.fade ?? 1);
    fill(255, alpha);
    text(e.char, 0, 0);
    pop();
  }

  // tornado marker
  noStroke();
  fill(255);
  circle(ix + storm.mx * iw, iy + storm.my * ih, 10 * scale);

  fill(255, 70);
  circle(ix + storm.mx * iw, iy + storm.my * ih, (storm.hitRadius * iw) * 2);
}

// ===================== Radar window =====================
function drawRadar(view) {
  // top-right radar over main view
  const rw = 220;
  const rh = 220;
  const rx = view.x + view.w - rw - 14;
  const ry = 14;

  noStroke();
  fill(0, 170);
  rect(rx, ry, rw, rh, 16);

  // radar circle
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

  // tornado blip
  const tx = cx + (storm.mx - 0.5) * r * 2;
  const ty = cy + (storm.my - 0.5) * r * 2;
  noStroke();
  fill(255);
  circle(tx, ty, 6);

  // entity blips
  for (const b of radar.blips) {
    const bx = cx + (b.mx - 0.5) * r * 2;
    const by = cy + (b.my - 0.5) * r * 2;
    const a = 180 * constrain(b.ttl / 2.0, 0, 1);
    fill(255, a);
    circle(bx, by, 5);
  }

  // label
  noStroke();
  fill(230);
  textAlign(LEFT, CENTER);
  textSize(12);
  text("Radar", rx + 12, ry + 16);
}

// ===================== HUD / science panel =====================
function drawHUD(view) {
  // top-left info on main view
  const x = view.x + 18;
  const y = 18;

  fill(255);
  textAlign(LEFT, TOP);
  textSize(14);

  const age = (millis() - storm.born) / 1000;
  const phase = (age < storm.formS) ? "Forming" : (storm.rope ? "Rope-out" : "Mature");
  text(`EF: ${storm.ef}   Type: ${storm.type}`, x, y);
  text(`Phase: ${phase}   Score: ${storm.score}`, x, y + 20);
  text(`Hit radius: ${(storm.hitRadius*100).toFixed(1)}% of map`, x, y + 40);

  // hit log
  textSize(12);
  fill(240, 220);
  let yy = y + 68;
  text("Recent impacts:", x, yy);
  yy += 16;
  for (const line of lastHitLog) {
    text(`• ${line}`, x, yy);
    yy += 14;
  }

  // science fair explanation panel
  if (ui.showInfo.checked()) {
    const px = view.x + 18;
    const py = height - 170;
    const pw = min(520, view.w - 36);
    const ph = 150;

    noStroke();
    fill(0, 150);
    rect(px, py, pw, ph, 16);

    fill(240);
    textAlign(LEFT, TOP);
    textSize(12);

    const lines = [
      "Science Notes (what you're simulating):",
      "• Tornado 'type' changes how width varies from cloud base to ground (cone, wedge, rope, etc.).",
      "• EF scale here controls an impact radius + damage points (not real wind speeds).",
      "• Rope-out: tornado narrows into a thin tube and bends/whips more before weakening.",
      "• Mini map damage uses distance checks: close = shake, direct hit = flip/fall/fling.",
      "Try: EF4 + Wedge, then steer through the city with arrow keys."
    ];

    let ty = py + 10;
    for (const ln of lines) {
      text(ln, px + 12, ty);
      ty += 20;
    }
  }
}

// ===================== Touch joystick =====================
function touchStarted() {
  // Create joystick on left side of main view (not on UI panel)
  const panelW = 340;
  if (mouseX < panelW) return false;

  if (!touchJoy.active) {
    touchJoy.active = true;
    touchJoy.id = (touches && touches.length) ? touches[0].id : 0;
    touchJoy.x = mouseX;
    touchJoy.y = mouseY;
    touchJoy.dx = 0;
    touchJoy.dy = 0;
  }
  return false;
}

function touchMoved() {
  if (!touchJoy.active) return false;
  const tx = mouseX;
  const ty = mouseY;
  const dx = tx - touchJoy.x;
  const dy = ty - touchJoy.y;

  const maxR = 55;
  const mag = sqrt(dx*dx + dy*dy);
  const ndx = (mag > 0) ? dx / maxR : 0;
  const ndy = (mag > 0) ? dy / maxR : 0;

  touchJoy.dx = constrain(ndx, -1, 1);
  touchJoy.dy = constrain(ndy, -1, 1);
  return false;
}

function touchEnded() {
  touchJoy.active = false;
  touchJoy.id = null;
  touchJoy.dx = 0;
  touchJoy.dy = 0;
  return false;
}

function drawTouchJoystick() {
  if (!touchJoy.active) return;
  push();
  noFill();
  stroke(255, 120);
  strokeWeight(2);
  circle(touchJoy.x, touchJoy.y, 110);

  const knobX = touchJoy.x + touchJoy.dx * 55;
  const knobY = touchJoy.y + touchJoy.dy * 55;
  noStroke();
  fill(255, 160);
  circle(knobX, knobY, 30);
  pop();
}

// ===================== Math helpers =====================
function smoothstep(a, b, x) {
  x = constrain((x - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}
