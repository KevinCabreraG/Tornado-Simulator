// Tornado Simulator — Stable Build (p5.js)
// Works in p5 editor + GitHub Pages
// Features: mini map with emoji city + moving cars, arrow-key control, EF scale, tornado types, rope-out.

let ui = {};
let view;
let storm;
let city;
let entities = [];
let track = [];

function setup() {
  createCanvas(windowWidth, windowHeight);
  pixelDensity(1);
  textFont("system-ui, sans-serif");
  noStroke();

  // Prevent arrow keys from scrolling the page (critical on Chromebook + GitHub)
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
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  if (ui.panel) ui.panel.size(320, windowHeight - 20);
}

function draw() {
  view = getView();
  drawScene(view);

  // live settings
  storm.type = ui.type.value();
  storm.ef = ui.ef.value();
  storm.keep = ui.keep.checked();

  // update
  updateStorm();
  updateEntities();

  // draw
  drawTornado(view);
  drawMiniMap(view);
  drawHUD(view);
}

// ---------------- UI ----------------
function buildUI() {
  document.documentElement.style.overflow = "hidden";
  document.body.style.overflow = "hidden";
  document.body.style.margin = "0";

  ui.panel = createDiv("");
  ui.panel.position(10, 10);
  ui.panel.size(320, windowHeight - 20);
  ui.panel.style("overflow-y", "auto");
  ui.panel.style("padding", "12px");
  ui.panel.style("border-radius", "16px");
  ui.panel.style("background", "rgba(0,0,0,0.65)");
  ui.panel.style("color", "#eee");
  ui.panel.style("box-sizing", "border-box");

  title("🌪️ Tornado Simulator (Stable)", 18);
  small("Arrow keys steer the tornado on the mini map.", 12);

  ui.btnNew = button("🌩️ New storm", () => resetAll(true));
  ui.btnDamage = button("🧹 Reset damage", () => resetAll(false));

  hr();

  label("EF Scale");
  ui.ef = createSelect();
  ["EF0","EF1","EF2","EF3","EF4","EF5"].forEach(v => ui.ef.option(v));
  ui.ef.selected("EF3");
  ui.ef.parent(ui.panel);
  ui.ef.style("width","100%");
  ui.ef.style("margin-bottom","8px");

  label("Tornado Type");
  ui.type = createSelect();
  ["cone","wedge","rope","needle","segmented","sheathed","loop"].forEach(v => ui.type.option(v));
  ui.type.selected("wedge");
  ui.type.parent(ui.panel);
  ui.type.style("width","100%");
  ui.type.style("margin-bottom","8px");

  ui.keep = createCheckbox("Keep tornado (no rope-out vanish)", true);
  ui.keep.parent(ui.panel);
  ui.keep.style("color","#eee");
  ui.keep.style("margin","6px 0 8px 0");

  hr();

  label("Rope-out timing");
  ui.lifeS = slider("Mature seconds", 4, 40, 14, 1);
  ui.ropeS = slider("Rope-out seconds", 3, 30, 10, 1);

  hr();
  small("If controls still don't work, click the canvas once.", 12);

  function title(t, sz){ const d=createDiv(t); d.parent(ui.panel); d.style("font-size",sz+"px"); d.style("font-weight","800"); d.style("margin","0 0 6px 0");}
  function small(t, sz){ const d=createDiv(t); d.parent(ui.panel); d.style("font-size",sz+"px"); d.style("opacity","0.9"); d.style("margin","0 0 8px 0");}
  function label(t){ const d=createDiv(t); d.parent(ui.panel); d.style("font-size","13px"); d.style("font-weight","700"); d.style("margin","10px 0 6px 0");}
  function hr(){ const d=createDiv(""); d.parent(ui.panel); d.style("height","1px"); d.style("background","rgba(255,255,255,0.14)"); d.style("margin","10px 0");}
  function button(t, fn){ const b=createButton(t); b.parent(ui.panel); b.style("width","100%"); b.style("padding","10px"); b.style("margin","6px 0"); b.style("border","none"); b.style("border-radius","12px"); b.style("background","#222"); b.style("color","#eee"); b.style("font-size","14px"); b.style("cursor","pointer"); b.mousePressed(fn); return b;}
  function slider(name, a,b,v,step){
    const wrap=createDiv(""); wrap.parent(ui.panel); wrap.style("margin","6px 0 8px 0");
    const lab=createDiv(`${name}: <b>${v}</b>`); lab.parent(wrap); lab.style("font-size","12px"); lab.style("opacity","0.9");
    const s=createSlider(a,b,v,step); s.parent(wrap); s.style("width","100%");
    s.input(()=>lab.html(`${name}: <b>${s.value()}</b>`));
    return s;
  }
}

// ---------------- Reset / Setup ----------------
function resetAll(resetCityToo) {
  storm = {
    mx: 0.50,
    my: 0.55,
    bornMs: millis(),
    type: ui.type ? ui.type.value() : "wedge",
    ef: ui.ef ? ui.ef.value() : "EF3",
    keep: true,
    rope: false,
    score: 0
  };

  if (resetCityToo) {
    city = makeCity();
    entities = makeEntities(city);
  } else {
    // reset damage only
    for (const e of entities) {
      e.state = "ok";
      e.hit = false;
      e.flip = false;
      e.rot = 0;
      e.vx = 0;
      e.vy = 0;
      e.fade = 1;
    }
  }

  track = [];
  storm.bornMs = millis();
}

// ---------------- Scene ----------------
function getView() {
  const panelW = 340;
  return { x: panelW, y: 0, w: width - panelW, h: height };
}

function drawScene(v) {
  // background
  background(14);

  // main view sky/ground
  noStroke();
  fill(18);
  rect(v.x, 0, v.w, v.h);

  const cloudY = v.h * 0.18;
  const groundY = v.h * 0.78;

  fill(16);
  ellipse(v.x + v.w * 0.62, cloudY + 18, v.w * 1.05, 170);
  fill(13);
  ellipse(v.x + v.w * 0.62, cloudY + 34, v.w * 0.75, 120);

  fill(24);
  rect(v.x, groundY, v.w, v.h - groundY);

  // simple town silhouette
  fill(0, 95);
  for (let i = 0; i < 28; i++) {
    const x = v.x + (i / 27) * v.w;
    const w = 12 + noise(i * 0.6 + 10) * 44;
    const h = 12 + noise(i * 0.55 + 50) * 50;
    rect(x, groundY - h, w, h, 2);
  }
}

// ---------------- Storm Update ----------------
function updateStorm() {
  // arrow key steering
  const dt = deltaTime / 1000;
  const speed = 0.28 * dt; // map units per second feel

  let dx = 0, dy = 0;
  if (keyIsDown(LEFT_ARROW)) dx -= speed;
  if (keyIsDown(RIGHT_ARROW)) dx += speed;
  if (keyIsDown(UP_ARROW)) dy -= speed;
  if (keyIsDown(DOWN_ARROW)) dy += speed;

  storm.mx = constrain(storm.mx + dx, 0.02, 0.98);
  storm.my = constrain(storm.my + dy, 0.02, 0.98);

  // rope-out timing
  const ageS = (millis() - storm.bornMs) / 1000;
  const lifeS = ui.lifeS ? ui.lifeS.value() : 14;
  storm.rope = (!storm.keep && ageS > lifeS) ? true : storm.rope;

  // trail
  track.push({ mx: storm.mx, my: storm.my });
  if (track.length > 160) track.shift();
}

function efRadius(ef) {
  switch (ef) {
    case "EF0": return 0.028;
    case "EF1": return 0.034;
    case "EF2": return 0.043;
    case "EF3": return 0.056;
    case "EF4": return 0.072;
    case "EF5": return 0.088;
    default: return 0.056;
  }
}

function efDamage(ef) {
  switch (ef) {
    case "EF0": return 25;
    case "EF1": return 45;
    case "EF2": return 75;
    case "EF3": return 115;
    case "EF4": return 170;
    case "EF5": return 250;
    default: return 115;
  }
}

// ---------------- Entities ----------------
function makeCity() {
  // road lanes for cars
  const roads = [
    { kind:"h", y:0.28 }, { kind:"h", y:0.55 }, { kind:"h", y:0.80 },
    { kind:"v", x:0.25 }, { kind:"v", x:0.50 }, { kind:"v", x:0.75 }
  ];
  return { roads };
}

function makeEntities(city) {
  const arr = [];

  // buildings
  for (let i=0;i<10;i++) arr.push(makeE("🏢","building", random(0.12,0.88), random(0.12,0.88)));
  // trees
  for (let i=0;i<10;i++) arr.push(makeE("🌳","tree", random(0.12,0.88), random(0.12,0.88)));

  // cars on roads
  for (let i=0;i<9;i++) {
    const lane = random(city.roads);
    const e = makeE("🚗","car", 0.25, 0.28);
    e.lane = lane;
    e.t = random(0,1);
    e.dir = random([-1,1]);
    e.speed = 0.25 * random(0.7,1.3); // lane speed
    arr.push(e);
  }

  return arr;
}

function makeE(char, kind, x, y) {
  return {
    char, kind, x, y,
    state:"ok", hit:false,
    rot:0, flip:false,
    vx:0, vy:0,
    fade:1,
    lane:null, t:0, dir:1, speed:0
  };
}

function updateEntities() {
  const dt = deltaTime / 1000;
  const r = efRadius(storm.ef);
  const dmg = efDamage(storm.ef);

  // cars move along lanes if not destroyed
  for (const e of entities) {
    if (e.kind === "car" && e.state === "ok") {
      e.t += e.dir * e.speed * dt;
      if (e.t < 0) { e.t=0; e.dir*=-1; }
      if (e.t > 1) { e.t=1; e.dir*=-1; }

      if (e.lane.kind === "h") {
        e.x = lerp(0.10, 0.90, e.t);
        e.y = e.lane.y;
        e.rot = (e.dir>0) ? 0 : PI;
      } else {
        e.x = e.lane.x;
        e.y = lerp(0.10, 0.90, e.t);
        e.rot = (e.dir>0) ? HALF_PI : -HALF_PI;
      }
    }
  }

  // impacts
  for (const e of entities) {
    const d = dist(storm.mx, storm.my, e.x, e.y);

    // near wobble/tilt
    if (!e.hit && d < r*1.6) {
      if (e.kind === "building") e.rot = (noise(frameCount*0.03, e.x*8)-0.5)*0.35;
      if (e.kind === "tree") e.rot = (noise(frameCount*0.04, e.y*8)-0.5)*0.55;
    }

    // direct hit
    if (!e.hit && d < r) {
      e.hit = true;

      storm.score += dmg;

      const ang = atan2(e.y - storm.my, e.x - storm.mx);
      if (e.kind === "car") {
        e.state = "destroyed";
        e.flip = true;               // upside down
        e.vx = cos(ang) * 0.45;      // flung
        e.vy = sin(ang) * 0.45;
        e.rot += (random()<0.5?-1:1)*0.6;
      } else if (e.kind === "tree") {
        e.state = "destroyed";
        e.vx = cos(ang) * 0.22;
        e.vy = sin(ang) * 0.22;
        e.rot = (random()<0.5?-1:1)*HALF_PI;
      } else if (e.kind === "building") {
        e.state = "damaged";
        e.vx = cos(ang) * 0.14;
        e.vy = sin(ang) * 0.14;
        e.rot = (random()<0.5?-1:1)*(PI/2.3);
      }
    }

    // apply fling drift
    if (e.state !== "ok") {
      e.x = constrain(e.x + e.vx * dt, 0.02, 0.98);
      e.y = constrain(e.y + e.vy * dt, 0.02, 0.98);
      e.vx *= 0.92;
      e.vy *= 0.92;
      if (e.state === "destroyed") e.fade = max(0.35, e.fade - dt*0.4);
    }
  }
}

// ---------------- Tornado Draw ----------------
function drawTornado(v) {
  const cloudY = v.h * 0.18 + 16;
  const groundY = v.h * 0.78;
  const cx = v.x + storm.mx * v.w;

  const ageS = (millis() - storm.bornMs) / 1000;
  const formS = 3.0;
  const form = constrain(ageS / formS, 0, 1);

  const yTop = cloudY;
  const yBot = lerp(cloudY + 40, groundY, smoothstep(0,1,form));

  // rope-out morph (when not keep)
  let ropeProg = 0;
  if (storm.rope) {
    const rs = ui.ropeS ? ui.ropeS.value() : 10;
    ropeProg = constrain((ageS - (ui.lifeS.value())) / max(1, rs), 0, 1);
  }

  const spin = 1.9;
  const steps = 170;

  // base widths by type
  let topW = 220, baseW = 120;
  if (storm.type === "wedge") { topW = 430; baseW = 220; }
  if (storm.type === "cone")  { topW = 260; baseW = 120; }
  if (storm.type === "rope")  { topW = 110; baseW = 55; }
  if (storm.type === "needle"){ topW = 120; baseW = 38; }
  if (storm.type === "segmented") { topW = 260; baseW = 140; }
  if (storm.type === "sheathed")  { topW = 300; baseW = 130; }
  if (storm.type === "loop")      { topW = 160; baseW = 60; }

  // scale a bit with EF
  const efScale = map(efRadius(storm.ef), 0.028, 0.088, 0.75, 1.35);
  topW *= efScale;
  baseW *= efScale;

  // rope-out thin tube
  const thinMult = storm.rope ? lerp(1.0, 0.22, smoothstep(0.05, 0.85, ropeProg)) : 1.0;

  // debris ring
  fill(140, 90);
  ellipse(cx, groundY + 18, baseW*thinMult*1.8, baseW*thinMult*0.45);

  for (let i=0;i<=steps;i++) {
    const p = i/steps; // 0 top -> 1 bottom
    const y = lerp(yTop, yBot, p);

    let w = widthAt(p, topW, baseW, storm.type) * thinMult;

    // segmented effect
    if (storm.type === "segmented") {
      const seg = 0.75 + 0.35 * pow(max(0, sin(PI*12*p + ageS*2.2)), 2);
      w *= seg;
    }

    // sheathed: fatter near top (veil)
    if (storm.type === "sheathed") {
      const veil = 1.0 + 0.70 * smoothstep(0.0, 0.22, 1 - p);
      w *= veil;
    }

    // bend + rope whip
    const bend = (noise(p*2.2, ageS*0.2)-0.5)*14 + sin(ageS*10 + p*14) * (smoothstep(0.15,1.0, ropeProg)*55) * pow(p,1.3);

    // smoky body
    const a = (165 + 60*(1-p)) * (0.2 + 0.8*form) * (1 - 0.55*smoothstep(0.1,1,ropeProg));
    fill(225, a);
    ellipse(cx + bend, y, w, lerp(8, 30, 1-p));

    // clear spin bands
    const phase = ageS*9.0*spin + p*22.0;
    const b = sin(phase);
    const b2 = sin(phase + 2.15);

    const k = 0.22 + 0.14*(1-p);
    const x1 = (cx + bend) - w*(0.42 + 0.12*b);
    const x2 = (cx + bend) + w*(0.42 + 0.12*b);

    stroke(40, a*0.50);
    strokeWeight(max(1.1, w*0.014));
    line(x1, y - w*k, x2, y + w*k);

    stroke(255, a*0.25*(0.6 + 0.4*(0.5+0.5*b2)));
    strokeWeight(max(0.9, w*0.011));
    line(x1, y + w*k*0.55, x2, y - w*k*0.55);
    noStroke();
  }

  // true loop for loop type
  if (storm.type === "loop" && form > 0.9) {
    const lp = 0.88;
    const y = lerp(yTop, yBot, lp);
    const w = widthAt(lp, topW, baseW, storm.type) * thinMult;
    const bend = (noise(lp*2.2, ageS*0.2)-0.5)*14;

    const loopX = cx + bend + sin(ageS*3.2) * (w*0.35);
    const rx = w*0.55;
    const ry = w*0.22;

    stroke(255, 120*form);
    strokeWeight(3);
    noFill();
    ellipse(loopX, y, rx*2, ry*2);

    stroke(255, 55*form);
    strokeWeight(8);
    arc(loopX, y, rx*2, ry*2, PI*0.10, PI*1.25);
    noStroke();
  }
}

function widthAt(p, topW, baseW, type) {
  // p: 0 top -> 1 bottom
  if (type === "wedge") return lerp(topW, baseW, pow(p, 0.55));     // TOP wider than bottom
  if (type === "rope")  return lerp(topW*0.35, baseW*0.25, pow(p,1.2));
  if (type === "needle")return lerp(topW*0.30, baseW*0.15, pow(p,1.35));
  if (type === "loop")  return lerp(topW*0.42, baseW*0.22, pow(p,1.05));
  return lerp(topW, baseW, pow(p, 0.95)); // cone-ish default
}

// ---------------- Mini Map Draw ----------------
function drawMiniMap(v) {
  const mw = 270, mh = 185;
  const mx = v.x + v.w - mw - 12;
  const my = height - mh - 12;

  fill(0, 175);
  rect(mx, my, mw, mh, 14);

  fill(235);
  textAlign(LEFT, CENTER);
  textSize(12);
  text("Mini Map", mx + 12, my + 18);

  const ix = mx + 12, iy = my + 30, iw = mw - 24, ih = mh - 42;

  fill(18);
  rect(ix, iy, iw, ih, 10);

  // roads grid
  stroke(150, 140);
  strokeWeight(2);

  // draw the same roads used for cars (visual)
  // horizontals
  line(ix + 0.08*iw, iy + 0.28*ih, ix + 0.92*iw, iy + 0.28*ih);
  line(ix + 0.08*iw, iy + 0.55*ih, ix + 0.92*iw, iy + 0.55*ih);
  line(ix + 0.08*iw, iy + 0.80*ih, ix + 0.92*iw, iy + 0.80*ih);
  // verticals
  line(ix + 0.25*iw, iy + 0.08*ih, ix + 0.25*iw, iy + 0.92*ih);
  line(ix + 0.50*iw, iy + 0.08*ih, ix + 0.50*iw, iy + 0.92*ih);
  line(ix + 0.75*iw, iy + 0.08*ih, ix + 0.75*iw, iy + 0.92*ih);

  noStroke();

  // trail
  if (track.length > 1) {
    stroke(255, 70);
    strokeWeight(6);
    for (let i = 1; i < track.length; i++) {
      const a = track[i-1], b = track[i];
      line(ix + a.mx*iw, iy + a.my*ih, ix + b.mx*iw, iy + b.my*ih);
    }
    stroke(255, 200);
    strokeWeight(2);
    for (let i = 1; i < track.length; i++) {
      const a = track[i-1], b = track[i];
      line(ix + a.mx*iw, iy + a.my*ih, ix + b.mx*iw, iy + b.my*ih);
    }
    noStroke();
  }

  // entities
  textAlign(CENTER, CENTER);
  textSize(16);
  for (const e of entities) {
    push();
    translate(ix + e.x*iw, iy + e.y*ih);

    // little shake near tornado
    const d = dist(storm.mx, storm.my, e.x, e.y);
    if (!e.hit && d < efRadius(storm.ef)*1.7) {
      translate((noise(frameCount*0.05, e.x*10)-0.5)*2, (noise(frameCount*0.05, e.y*10)-0.5)*2);
    }

    rotate(e.rot || 0);
    if (e.flip) scale(1, -1);
    fill(255, 255*(e.fade ?? 1));
    text(e.char, 0, 0);
    pop();
  }

  // tornado marker + impact ring
  const tx = ix + storm.mx*iw;
  const ty = iy + storm.my*ih;
  fill(255);
  circle(tx, ty, 10);

  fill(255, 50);
  circle(tx, ty, efRadius(storm.ef)*iw*2);
}

// ---------------- HUD ----------------
function drawHUD(v) {
  fill(255);
  textAlign(LEFT, TOP);
  textSize(13);
  const ageS = (millis() - storm.bornMs) / 1000;
  const phase = (ageS < 3) ? "Forming" : (storm.rope ? "Rope-out" : "Mature");
  text(`EF: ${storm.ef}   Type: ${storm.type}   Phase: ${phase}`, v.x + 16, 16);
  text(`Damage score: ${storm.score}`, v.x + 16, 34);
}

// ---------------- helpers ----------------
function smoothstep(a,b,x){
  x = constrain((x-a)/(b-a), 0, 1);
  return x*x*(3-2*x);
}
