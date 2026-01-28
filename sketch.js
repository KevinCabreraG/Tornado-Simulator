// ===============================
// TORNADO SIMULATOR — STABLE BASE
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
  window.addEventListener("keydown", e => {
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)) {
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
  ui.panel.style("background","rgba(0,0,0,0.65)");
  ui.panel.style("padding","12px");
  ui.panel.style("border-radius","14px");
  ui.panel.style("color","#eee");
  ui.panel.style("overflow-y","auto");

  title("🌪️ Tornado Simulator");

  button("🎲 Random Storm", randomizeStorm);
  button("🔄 Reset Storm", () => resetStorm(true));
  ui.ropeBtn = button("🧵 Rope-Out: ON", toggleRope);

  hr();

  label("EF Scale");
  ui.ef = select(["EF0","EF1","EF2","EF3","EF4","EF5"], "EF3");

  label("Tornado Type");
  ui.type = select(
    ["cone","wedge","rope","needle","segmented","loop"],
    "wedge"
  );

  label("Lifetime (s)");
  ui.life = slider(5, 40, 14);

  function title(t){ createDiv(t).parent(ui.panel).style("font-size","18px").style("font-weight","800"); }
  function label(t){ createDiv(t).parent(ui.panel).style("margin-top","8px"); }
  function hr(){ createDiv("").parent(ui.panel).style("height","1px").style("background","rgba(255,255,255,0.15)").style("margin","10px 0"); }
  function button(t, fn){
    const b = createButton(t);
    b.parent(ui.panel);
    b.style("width","100%");
    b.style("margin","6px 0");
    b.mousePressed(fn);
    return b;
  }
  function slider(a,b,v){
    const s = createSlider(a,b,v,1);
    s.parent(ui.panel);
    s.style("width","100%");
    return s;
  }
  function select(opts,val){
    const s = createSelect();
    opts.forEach(o=>s.option(o));
    s.selected(val);
    s.parent(ui.panel);
    s.style("width","100%");
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
    score: 0
  };
  track = [];

  if (resetEntities) spawnEntities();
}

function randomizeStorm() {
  const types = ["cone","wedge","rope","needle","segmented","loop"];
  const efs = ["EF0","EF1","EF2","EF3","EF4","EF5"];
  ui.type.selected(random(types));
  ui.ef.selected(random(efs));
  resetStorm(true);
}

function toggleRope() {
  allowRopeOut = !allowRopeOut;
  ui.ropeBtn.html(`🧵 Rope-Out: ${allowRopeOut?"ON":"OFF"}`);
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

  const age = (millis() - storm.born)/1000;
  if (allowRopeOut && age > ui.life.value()) storm.rope = true;

  track.push({x:storm.mx,y:storm.my});
  if (track.length > 120) track.shift();
}

// ================= ENTITIES =================
function spawnEntities() {
  entities = [];

  for (let i=0;i<8;i++) entities.push(makeEntity("🏢","building"));
  for (let i=0;i<8;i++) entities.push(makeEntity("🌳","tree"));
  for (let i=0;i<6;i++) entities.push(makeEntity("🚗","car"));
}

function makeEntity(char,type) {
  return {
    char, type,
    x: random(0.1,0.9),
    y: random(0.1,0.9),
    hit:false,
    vx:0, vy:0,
    rot:0, flip:false
  };
}

function updateEntities() {
  const r = efRadius(ui.ef.value());
  for (let e of entities) {
    if (!e.hit && dist(e.x,e.y,storm.mx,storm.my) < r) {
      e.hit = true;
      const a = atan2(e.y-storm.my,e.x-storm.mx);
      e.vx = cos(a)*0.3;
      e.vy = sin(a)*0.3;
      e.rot = PI/2;
      e.flip = (e.type==="car");
      storm.score += 50;
    }
    if (e.hit) {
      e.x += e.vx*0.02;
      e.y += e.vy*0.02;
    }
  }
}

function efRadius(ef){
  return {EF0:.03,EF1:.04,EF2:.05,EF3:.06,EF4:.08,EF5:.1}[ef];
}

// ================= DRAW =================
function drawBackground(v) {
  fill(18); rect(v.x,0,v.w,height);
  fill(25); rect(v.x,height*0.75,v.w,height);
}

function drawTornado(v) {
  const cx = v.x + storm.mx*v.w;
  const top = height*0.18;
  const bot = height*0.75;
  const steps = 120;

  let tw = 200, bw = 100;
  if (ui.type.value()==="wedge"){tw=420;bw=220;}
  if (ui.type.value()==="rope"){tw=100;bw=40;}

  if (storm.rope) { tw*=0.3; bw*=0.25; }

  for (let i=0;i<steps;i++){
    const p=i/steps;
    const y=lerp(top,bot,p);
    const w=lerp(tw,bw,p);
    fill(220,140);
    ellipse(cx+sin(frameCount*0.1+p*10)*w*0.15,y,w,12);
  }
}

function drawMiniMap(v) {
  const mx=v.x+v.w-220,my=height-160,w=200,h=140;
  fill(0,180); rect(mx,my,w,h,10);

  for (let t of track){
    fill(255,80);
    circle(mx+t.x*w,my+t.y*h,4);
  }

  for (let e of entities){
    push();
    translate(mx+e.x*w,my+e.y*h);
    rotate(e.rot);
    if (e.flip) scale(1,-1);
    textSize(16);
    fill(255);
    text(e.char,0,0);
    pop();
  }

  fill(255);
  circle(mx+storm.mx*w,my+storm.my*h,8);
}

function drawHUD(v){
  fill(255);
  textSize(14);
  text(`EF: ${ui.ef.value()}  Type: ${ui.type.value()}`,v.x+16,16);
  text(`Damage: ${storm.score}`,v.x+16,34);
}
