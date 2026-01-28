// ===============================
// TORNADO SIMULATOR — STABLE + ROPE-OUT
// Single-file p5.js sketch.js
// ===============================

let ui = {};
let storm;
let entities = [];
let track = [];
let allowRopeOut = true;

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  textFont("system-ui");
  noStroke();

  // STOP arrow keys from scrolling the page (Chromebook fix)
  window.addEventListener("keydown", (e) => {
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) {
      e.preventDefault();
    }
  });

  buildUI();
  resetStorm(true);
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  ui.panel.size(300, height - 20);
}

function draw() {
  background(15);
  const view = { x: 320, w: width - 320, h: height };

  drawBackground(view);

  updateStorm();
  updateEntities();

  drawTornado(view);
  drawMiniMap(view);
  drawHUD(view);
}

// ================= UI =================
function buildUI() {
  document.body.style.overflow = "hidden";

  ui.panel = createDiv("");
  ui.panel.position(10, 10);
  ui.panel.size(300, height - 20);
  ui.panel.style("background", "rgba(0,0,0,0.65)");
  ui.panel.style("padding", "12px");
  ui.panel.style("border-radius", "14px");
  ui.panel.style("color", "#eee");
  ui.panel.style("overflow-y", "auto");

  title("🌪️ Tornado Simulator");

  button("🎲 Random Storm", randomizeStorm);
  button("🔄 Reset Storm", () => resetStorm(true));
  ui.ropeBtn = button("🧵 Rope-Out: ON", toggleRope);

  hr();

  label("EF Scale");
  ui.ef = select(["EF0", "EF1", "EF2", "EF3", "EF4", "EF5"], "EF3");

  label("Tornado Type");
  ui.type = select(["cone", "wedge", "rope", "needle", "segmented", "loop"], "wedge");

  label("Lifetime before rope-out (s)");
  ui.life = slider(5, 40, 14);

  label("Rope-out duration (s)");
  ui.ropeDur = slider(3, 25, 10);

  small("Tip: Click the canvas once if keys don't respond.", 12);

  function title(t) {
    createDiv(t).parent(ui.panel).style("font-size", "18px").style("font-weight", "800");
  }
  function label(t) {
    createDiv(t).parent(ui.panel).style("margin-top", "10px").style("font-size", "13px").style("font-weight", "700");
  }
  function small(t, sz) {
    createDiv(t).parent(ui.panel).style("margin-top", "10px").style("font-size", sz + "px").style("opacity", "0.9");
  }
  function hr() {
    createDiv("")
      .parent(ui.panel)
      .style("height", "1px")
      .style("background", "rgba(255,255,255,0.15)")
      .style("margin", "10px 0");
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
  function slider(a, b, v) {
    const s = createSlider(a, b, v, 1);
    s.parent(ui.panel);
    s.style("width", "100%");
    return s;
  }
  function select(opts, val) {
    const s = createSelect();
    opts.forEach((o) => s.option(o));
    s.selected(val);
    s.parent(ui.panel);
    s.style("width", "100%");
    return s;
  }
}

// ================= STORM =================
function resetStorm(resetEntities) {
  storm = {
    mx: 0.5,
    my: 0.55,
    born: millis(),

    rope: false,
    ropeStart: 0,
    ropeProg: 0, // 0..1 progress

    score: 0,
  };

  track = [];

  if (resetEntities) spawnEntities();
}

function randomizeStorm() {
  const types = ["cone", "wedge", "rope", "needle", "segmented", "loop"];
  const efs = ["EF0", "EF1", "EF2", "EF3", "EF4", "EF5"];
  ui.type.selected(random(types));
  ui.ef.selected(random(efs));
  resetStorm(true);
}

function toggleRope() {
  allowRopeOut = !allowRopeOut;
  ui.ropeBtn.html(`🧵 Rope-Out: ${allowRopeOut ? "ON" : "OFF"}`);
  // If turning OFF, cancel rope-out immediately
  if (!allowRopeOut) {
    storm.rope = false;
    storm.ropeProg = 0;
  }
}

// ================= UPDATE =================
function updateStorm() {
  const dt = deltaTime / 1000;
  const speed = 0.25 * dt;

  if (keyIsDown(LEFT_ARROW)) storm.mx -= speed;
  if (keyIsDown(RIGHT_ARROW)) storm.mx += speed;
  if (keyIsDown(UP_ARROW)) storm.my -= speed;
  if (keyIsDown(DOWN_ARROW)) storm.my += speed;

  storm.mx = constrain(storm.mx, 0.05, 0.95);
  storm.my = constrain(storm.my, 0.05, 0.95);

  const age = (millis() - storm.born) / 1000;
  const lifeS = ui.life.value();

  // Start rope-out once
  if (allowRopeOut && !storm.rope && age > lifeS) {
    storm.rope = true;
    storm.ropeStart = millis();
  }

  // Rope-out progress 0..1 over ui.ropeDur seconds
  if (storm.rope) {
    const ropeSeconds = max(1, ui.ropeDur.value());
    storm.ropeProg = constrain(((millis() - storm.ropeStart) / 1000) / ropeSeconds, 0, 1);
  } else {
    storm.ropeProg = 0;
  }

  // trail
  track.push({ x: storm.mx, y: storm.my });
  if (track.length > 140) track.shift();
}

// ================= ENTITIES =================
function spawnEntities() {
  entities = [];
  for (let i = 0; i < 8; i++) entities.push(makeEntity("🏢", "building"));
  for (let i = 0; i < 8; i++) entities.push(makeEntity("🌳", "tree"));
  for (let i = 0; i < 6; i++) entities.push(makeEntity("🚗", "car"));
}

function makeEntity(char, type) {
  return {
    char,
    type,
    x: random(0.1, 0.9),
    y: random(0.1, 0.9),
    hit: false,
    vx: 0,
    vy: 0,
    rot: 0,
    flip: false,
    fade: 1,
  };
}

function updateEntities() {
  const r = efRadius(ui.ef.value());
  const dmg = efDamage(ui.ef.value());
  for (let e of entities) {
    if (!e.hit && dist(e.x, e.y, storm.mx, storm.my) < r) {
      e.hit = true;
      const a = atan2(e.y - storm.my, e.x - storm.mx);

      // fling strength by type
      if (e.type === "car") {
        e.vx = cos(a) * 0.55;
        e.vy = sin(a) * 0.55;
        e.flip = true;
        e.rot = (random() < 0.5 ? -1 : 1) * 0.6;
      } else if (e.type === "tree") {
        e.vx = cos(a) * 0.28;
        e.vy = sin(a) * 0.28;
        e.rot = (random() < 0.5 ? -1 : 1) * HALF_PI;
      } else {
        e.vx = cos(a) * 0.18;
        e.vy = sin(a) * 0.18;
        e.rot = (random() < 0.5 ? -1 : 1) * (PI / 2.3);
      }

      storm.score += dmg;
    }

    // apply motion + fade for destroyed objects
    if (e.hit) {
      e.x = constrain(e.x + e.vx * 0.02, 0.02, 0.98);
      e.y = constrain(e.y + e.vy * 0.02, 0.02, 0.98);
      e.vx *= 0.95;
      e.vy *= 0.95;
      if (e.type === "car") e.fade = max(0.35, e.fade - 0.003);
    }
  }
}

function efRadius(ef) {
  return { EF0: 0.03, EF1: 0.04, EF2: 0.05, EF3: 0.06, EF4: 0.08, EF5: 0.1 }[ef] || 0.06;
}
function efDamage(ef) {
  return { EF0: 20, EF1: 40, EF2: 70, EF3: 110, EF4: 170, EF5: 250 }[ef] || 110;
}

// ================= DRAW =================
function drawBackground(v) {
  fill(18);
  rect(v.x, 0, v.w, height);

  // ground
  fill(24);
  rect(v.x, height * 0.75, v.w, height);

  // cloud base hint
  fill(14);
  ellipse(v.x + v.w * 0.62, height * 0.18, v.w * 0.9, 130);
}

function drawTornado(v) {
  const cx = v.x + storm.mx * v.w;
  const topY = height * 0.18;
  const botY = height * 0.75;
  const steps = 140;

  // base widths by type
  let topW = 220,
    baseW = 120;
  const type = ui.type.value();

  if (type === "wedge") {
    topW = 430;
    baseW = 220;
  }
  if (type === "cone") {
    topW = 260;
    baseW = 120;
  }
  if (type === "rope") {
    topW = 110;
    baseW = 55;
  }
  if (type === "needle") {
    topW = 120;
    baseW = 38;
  }
  if (type === "segmented") {
    topW = 260;
    baseW = 140;
  }
  if (type === "loop") {
    topW = 160;
    baseW = 60;
  }

  // scale with EF a bit
  const efScale = map(efRadius(ui.ef.value()), 0.03, 0.1, 0.8, 1.35);
  topW *= efScale;
  baseW *= efScale;

  // ROPE-OUT: thin tube that whips more
  const thin = lerp(1.0, 0.18, smoothstep(0.05, 0.85, storm.ropeProg));
  topW *= thin;
  baseW *= thin;

  // debris ring
  fill(140, 85);
  ellipse(cx, botY + 18, baseW * 2.0, baseW * 0.5);

  // funnel
  for (let i = 0; i <= steps; i++) {
    const p = i / steps; // 0..1
    const y = lerp(topY, botY, p);

    let w = widthAt(p, topW, baseW, type);

    // segmented effect
    if (type === "segmented") {
      const seg = 0.78 + 0.35 * pow(max(0, sin(PI * 12 * p + frameCount * 0.03)), 2);
      w *= seg;
    }

    // clearer spin + rope whip
    const t = frameCount * 0.06;
    const spin = sin(t * 3 + p * 12) * w * 0.22;
    const whip = storm.rope ? (storm.ropeProg * 40 * pow(p, 1.4) * sin(t * 6 + p * 12)) : 0;

    fill(225, 150);
    ellipse(cx + spin + whip, y, w, 12);
  }

  // loop type loop
  if (type === "loop" && storm.ropeProg < 0.95) {
    const lp = 0.88;
    const y = lerp(topY, botY, lp);
    const w = widthAt(lp, topW, baseW, type);
    const loopX = cx + sin(frameCount * 0.05) * (w * 0.7);
    stroke(255, 120);
    strokeWeight(3);
    noFill();
    ellipse(loopX, y, w * 1.2, w * 0.45);
    noStroke();
  }
}

function widthAt(p, topW, baseW, type) {
  if (type === "wedge") return lerp(topW, baseW, pow(p, 0.55)); // TOP wider than bottom
  if (type === "rope") return lerp(topW * 0.35, baseW * 0.25, pow(p, 1.2));
  if (type === "needle") return lerp(topW * 0.30, baseW * 0.15, pow(p, 1.35));
  if (type === "loop") return lerp(topW * 0.42, baseW * 0.22, pow(p, 1.05));
  return lerp(topW, baseW, pow(p, 0.95));
}

function drawMiniMap(v) {
  const mx = v.x + v.w - 220,
    my = height - 160,
    w = 200,
    h = 140;

  fill(0, 180);
  rect(mx, my, w, h, 10);

  // trail
  for (let t of track) {
    fill(255, 70);
    circle(mx + t.x * w, my + t.y * h, 4);
  }

  // entities
  textAlign(CENTER, CENTER);
  textSize(16);
  for (let e of entities) {
    push();
    translate(mx + e.x * w, my + e.y * h);
    rotate(e.rot);
    if (e.flip) scale(1, -1);
    fill(255, 255 * e.fade);
    text(e.char, 0, 0);
    pop();
  }

  // tornado marker + radius ring
  const tx = mx + storm.mx * w;
  const ty = my + storm.my * h;
  fill(255);
  circle(tx, ty, 8);

  fill(255, 40);
  circle(tx, ty, efRadius(ui.ef.value()) * w * 2);
}

function drawHUD(v) {
  fill(255);
  textSize(14);
  textAlign(LEFT, TOP);

  const ageS = (millis() - storm.born) / 1000;
  const phase = ageS < 3 ? "Forming" : storm.rope ? "Rope-out" : "Mature";

  text(`EF: ${ui.ef.value()}   Type: ${ui.type.value()}`, v.x + 16, 16);
  text(`Phase: ${phase}`, v.x + 16, 34);
  text(`Rope-Out: ${allowRopeOut ? "ON" : "OFF"}   (starts after ${ui.life.value()}s)`, v.x + 16, 52);
  text(`Damage: ${storm.score}`, v.x + 16, 70);
}

// ================= helpers =================
function smoothstep(a, b, x) {
  x = constrain((x - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}
