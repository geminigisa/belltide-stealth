// BELLTIDE main: game loop, player, gadgets, bell masking, noise, scoring.
// The flooded lighthouse, four heists, one ghost rating per level.
import { LEVELS, TILE, buildWorld, collide, isSolid } from './levels.js';
import { wallSegments, visibilityPolygon } from './raycast.js';
import { pointInPoly, drawWorld } from './render.js';
import { Guard, GUARD_STATE } from './guards.js';
import { BellAudio } from './audio.js';
import { Input } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const audio = new BellAudio();
const input = new Input(canvas);

const G = {
  state: 'title', // title | playing | clear | caught | done
  levelIndex: 0,
  world: null,
  guards: [],
  segs: [],
  lanternPolys: [],
  player: null,
  ripples: [],
  rain: [],
  time: 0,
  levelTime: 0,
  bellTimer: 18,
  bellMasked: false,
  bellMaskLeft: 0,
  bellWave: 0,
  noise: 0,
  noiseCooldown: 0,
  stepTimer: 0,
  selectedGadget: null,
  aiming: null,
  gadgets: { chime: 3, snuff: 2, smoke: 2 },
  relicTaken: false,
  lootGot: 0,
  lootTotal: 0,
  maxDetect: 0,
  everAlert: false,
  ghostStreak: 0,
  totals: { time: 0, loot: 0, lootTotal: 0, ghosts: 0 },
  darkCanvas: document.createElement('canvas'),
  chimeProjectiles: [],
  smokeLeft: 0,
};
G.darkCanvas.width = 960;
G.darkCanvas.height = 640;

const FLOOR_NOISE = { '.': 0.25, ',': 0.1, '~': 1.0, w: 0.7, g: 1.4, P: 0.25, R: 0.25, L: 0.25, E: 0.25, S: 0.25, l: 0.25 };
const FLOOR_NAME = { '.': 'stone', ',': 'carpet', '~': 'flooded water', w: 'creaky timber', g: 'glass', P: 'stone', R: 'stone', L: 'stone', E: 'stone', S: 'stone', l: 'stone' };

function loadLevel(i) {
  const level = LEVELS[i];
  G.world = buildWorld(level);
  G.segs = wallSegments(G.world);
  G.lanternPolys = G.world.lanterns.map((L) => visibilityPolygon(L.x, L.y, G.segs, 170));
  G.guards = level.guards.map((d) => new Guard(d, G.world));
  G.player = {
    x: G.world.player.x, y: G.world.player.y, r: 13,
    dir: 0, hiddenBySmoke: false, light: 0,
  };
  G.ripples = [];
  G.chimeProjectiles = [];
  G.levelTime = 0;
  G.relicTaken = false;
  G.lootGot = 0;
  G.lootTotal = G.world.loots.length;
  G.maxDetect = 0;
  G.everAlert = false;
  G.selectedGadget = null;
  G.aiming = null;
  G.gadgets = { ...level.gadgets };
  G.bellTimer = 18;
  G.bellMasked = false;
  G.smokeLeft = 0;
  updateHud();
}

function lightAt(x, y) {
  let light = 0;
  for (let i = 0; i < G.world.lanterns.length; i++) {
    const L = G.world.lanterns[i];
    if (L.offUntil > G.time) continue;
    const poly = G.lanternPolys[i];
    if (!poly) continue;
    const d = Math.hypot(x - L.x, y - L.y);
    if (d < 175 && pointInPoly(x, y, poly)) {
      light = Math.max(light, 1 - d / 175);
    }
  }
  return light;
}

function emitRipple(x, y, maxR, color, life = 1.1) {
  G.ripples.push({ x, y, born: G.time, life, maxR, color });
}

function toast(msg, ms = 2200) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { el.textContent = ''; }, ms);
}

function updateHud() {
  const level = LEVELS[G.levelIndex];
  document.getElementById('hudLevel').textContent = level.name;
  document.getElementById('hudObj').textContent =
    '⬢ Relic ' + (G.relicTaken ? 1 : 0) + '/1 \u00A0 ◆ Loot ' + G.lootGot + '/' + G.lootTotal;
  const t = Math.floor(G.levelTime);
  document.getElementById('hudTime').textContent =
    String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  document.getElementById('hudStreak').textContent = '👻 streak ' + G.ghostStreak;
  document.getElementById('c1').textContent = G.gadgets.chime;
  document.getElementById('c2').textContent = G.gadgets.snuff;
  document.getElementById('c3').textContent = G.gadgets.smoke;
  for (const [n, id] of [[1, 'slot1'], [2, 'slot2'], [3, 'slot3']]) {
    const el = document.getElementById(id);
    const key = n === 1 ? 'chime' : n === 2 ? 'snuff' : 'smoke';
    el.classList.toggle('empty', G.gadgets[key] <= 0);
    el.style.borderColor = G.selectedGadget === n ? '#ffd76a' : '#55648f';
  }
  const eye = document.getElementById('eye');
  const label = document.getElementById('eyeLabel');
  const lit = G.player ? G.player.light : 0;
  if (G.player && G.player.hiddenBySmoke) {
    eye.className = 'hidden'; label.textContent = 'SMOKED';
  } else if (lit < 0.35) {
    eye.className = 'hidden'; label.textContent = 'HIDDEN';
  } else if (lit < 0.7) {
    eye.className = ''; label.textContent = 'DIM';
  } else {
    eye.className = 'exposed'; label.textContent = 'EXPOSED';
  }
  document.getElementById('noiseFill').style.width = Math.round(Math.min(1, G.noise) * 100) + '%';
  document.getElementById('bell').style.display = G.bellMasked ? 'block' : 'none';
}

function showTitle() {
  G.state = 'title';
  overlay.style.display = 'flex';
  overlay.innerHTML =
    '<div class="panel"><h1>BELLTIDE</h1><h2>THE FLOODED LIGHTHOUSE</h2>' +
    '<p>Midnight rain. A drowned lighthouse. Four relics, four guards who never sleep — ' +
    'and one bell that, when it tolls, swallows every sound you make.</p>' +
    '<p class="keys"><b>WASD / Arrows</b> move &nbsp;·&nbsp; <b>Shift</b> sneak (silent, slow) &nbsp;·&nbsp; <b>Space</b> sprint (fast, loud)<br>' +
    '<b>1</b> Chime lure &nbsp;·&nbsp; <b>2</b> Snuff dart (kill a lantern) &nbsp;·&nbsp; <b>3</b> Smoke veil<br>' +
    'Aim with the mouse, click to throw. <b>R</b> restart level &nbsp;·&nbsp; <b>M</b> mute</p>' +
    '<p>Stay in shadow. Watch the cones. When the bell tolls — run.</p>' +
    '<p class="go">— CLICK OR PRESS ENTER TO BEGIN THE FIRST HEIST —</p></div>';
}

function showClear(rating) {
  G.state = 'clear';
  const t = Math.floor(G.levelTime);
  const ts = String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  const cls = rating === 'GHOST' ? 'ghost' : rating === 'SHADOW' ? 'shadow' : 'spotted';
  overlay.style.display = 'flex';
  overlay.innerHTML =
    '<div class="panel"><h2>LEVEL CLEAR — ' + LEVELS[G.levelIndex].name + '</h2>' +
    '<div class="rank ' + cls + '">' + rating + '</div>' +
    '<p>Time ' + ts + ' &nbsp;·&nbsp; Loot ' + G.lootGot + '/' + G.lootTotal +
    ' &nbsp;·&nbsp; Ghost streak ' + G.ghostStreak + '</p>' +
    '<p class="go">— PRESS ENTER FOR THE NEXT HEIST —</p></div>';
}

function showCaught() {
  G.state = 'caught';
  overlay.style.display = 'flex';
  overlay.innerHTML =
    '<div class="panel"><h2 style="color:#ff5a4d">CAUGHT IN THE LAMPLIGHT</h2>' +
    '<p>The keeper\'s lantern found you. The tide keeps the relic — this time.</p>' +
    '<p class="go">— PRESS R TO TRY AGAIN —</p></div>';
}

function showDone() {
  G.state = 'done';
  const t = Math.floor(G.totals.time);
  const ts = String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  const rank = G.totals.ghosts === 4 ? 'TRUE GHOST' : G.totals.ghosts >= 2 ? 'MASTER THIEF' : 'LIGHTHOUSE THIEF';
  overlay.style.display = 'flex';
  overlay.innerHTML =
    '<div class="panel"><h1 style="font-size:30px">ALL FOUR RELICS YOURS</h1>' +
    '<div class="rank ghost" style="font-size:34px">' + rank + '</div>' +
    '<p>Total time ' + ts + ' &nbsp;·&nbsp; Loot ' + G.totals.loot + '/' + G.totals.lootTotal +
    ' &nbsp;·&nbsp; Ghost levels ' + G.totals.ghosts + '/4</p>' +
    '<p class="go">— PRESS ENTER TO PLAY AGAIN —</p></div>';
}

function startGame() {
  audio.ensure();
  overlay.style.display = 'none';
  overlay.innerHTML = '';
  G.state = 'playing';
  G.totals = { time: 0, loot: 0, lootTotal: 0, ghosts: 0 };
  loadLevel(0);
}

function nextLevel() {
  overlay.style.display = 'none';
  overlay.innerHTML = '';
  G.levelIndex++;
  if (G.levelIndex >= LEVELS.length) { showDone(); return; }
  loadLevel(G.levelIndex);
  G.state = 'playing';
}

function throwGadget(kind, tx, ty) {
  const p = G.player;
  if (kind === 1) {
    if (G.gadgets.chime <= 0) return;
    G.gadgets.chime--;
    G.chimeProjectiles.push({ x: p.x, y: p.y, tx, ty, t: 0, dur: 0.35 });
    audio.chime();
  } else if (kind === 2) {
    if (G.gadgets.snuff <= 0) return;
    // Snuff the lantern nearest the clicked point, within reach.
    let best = null, bd = 260;
    for (const L of G.world.lanterns) {
      const d = Math.hypot(L.x - tx, L.y - ty);
      if (d < bd) { bd = d; best = L; }
    }
    if (!best) { toast('No lantern in reach — aim closer'); return; }
    G.gadgets.snuff--;
    best.offUntil = G.time + 14;
    emitRipple(best.x, best.y, 60, '#7fa8ff', 0.8);
    audio.snuff();
    toast('Lantern snuffed — new shadow path for 14s');
  } else if (kind === 3) {
    if (G.gadgets.smoke <= 0) return;
    G.gadgets.smoke--;
    G.smokeLeft = 4;
    p.hiddenBySmoke = true;
    for (const g of G.guards) { g.detect = Math.max(0, g.detect - 0.7); if (g.state === GUARD_STATE.ALERT) { g.state = GUARD_STATE.INVESTIGATE; g.stateTime = 0; } }
    emitRipple(p.x, p.y, 90, '#c9d4ff', 1.2);
    audio.smoke();
    toast('Smoke veil — unseen for 4s');
  }
  updateHud();
}

function updatePlaying(dt) {
  const p = G.player;
  const world = G.world;
  G.levelTime += dt;

  // ---- bell cycle: tolls every 24s, masks sound for 3s ----
  G.bellTimer -= dt;
  if (G.bellTimer <= 0) {
    G.bellTimer = 24;
    G.bellMasked = true;
    G.bellMaskLeft = 3;
    G.bellWave = 1;
    audio.bell();
    toast('🔔 The bell tolls — footsteps masked!');
  }
  if (G.bellMasked) {
    G.bellMaskLeft -= dt;
    if (G.bellMaskLeft <= 0) G.bellMasked = false;
  }
  G.bellWave = Math.max(0, G.bellWave - dt * 0.5);

  // ---- movement ----
  const ax = input.axis();
  const sneak = input.sneak;
  const sprint = input.sprint;
  const speed = sneak ? 55 : sprint ? 155 : 98;
  const moving = ax.x !== 0 || ax.y !== 0;
  let nx = p.x + ax.x * speed * dt;
  let ny = p.y + ax.y * speed * dt;
  const fixed = collide(world, nx, ny, p.r);
  nx = fixed.x; ny = fixed.y;
  const moved = Math.hypot(nx - p.x, ny - p.y);
  if (moved > 0.5) p.dir = Math.atan2(ny - p.y, nx - p.x);
  p.x = nx; p.y = ny;

  // ---- floor + noise ----
  const tx = Math.floor(p.x / TILE), ty = Math.floor(p.y / TILE);
  const tile = (world.floors[ty] && world.floors[ty][tx]) || '#';
  const loud = FLOOR_NOISE[tile] ?? 0.25;
  const moveNoise = moving ? (sneak ? 0.04 : sprint ? 1.0 : 0.5) * loud : 0;
  G.noise = Math.max(0, G.noise - dt * 1.6);
  if (moving && !G.bellMasked) {
    G.noise = Math.min(1, G.noise + moveNoise * dt * 2.2);
    G.noiseCooldown -= dt;
    if (G.noiseCooldown <= 0 && moveNoise > 0.25) {
      G.noiseCooldown = sprint ? 0.22 : 0.4;
      emitRipple(p.x, p.y, 26 + moveNoise * 60, loud > 0.9 ? '#8fb8ff' : 'rgba(200,220,255,0.8)', 0.9);
      for (const g of G.guards) g.hearNoise(p.x, p.y, moveNoise * (G.bellMasked ? 0 : 1));
    }
    G.stepTimer -= dt;
    if (G.stepTimer <= 0) {
      G.stepTimer = sneak ? 0.55 : sprint ? 0.26 : 0.38;
      audio.footstep(tile);
    }
  }

  // ---- smoke timer ----
  if (G.smokeLeft > 0) {
    G.smokeLeft -= dt;
    if (G.smokeLeft <= 0) p.hiddenBySmoke = false;
  }

  // ---- chime projectiles ----
  for (let i = G.chimeProjectiles.length - 1; i >= 0; i--) {
    const pr = G.chimeProjectiles[i];
    pr.t += dt / pr.dur;
    if (pr.t >= 1) {
      G.chimeProjectiles.splice(i, 1);
      emitRipple(pr.tx, pr.ty, 120, '#ffd76a', 1.4);
      for (const g of G.guards) g.hearNoise(pr.tx, pr.ty, 1.4);
      // keep ringing for a while so guards walk over
      G.ripples.push({ x: pr.tx, y: pr.ty, born: G.time, life: 3.2, maxR: 150, color: '#ffd76a' });
    } else {
      pr.x = pr.x + (pr.tx - pr.x) * 0.25;
      pr.y = pr.y + (pr.ty - pr.y) * 0.25;
    }
  }

  // ---- light level + guards ----
  p.light = lightAt(p.x, p.y);
  let anyAlert = false;
  for (const g of G.guards) {
    g.update(dt, p, p.light, G.segs, G.bellMasked);
    G.maxDetect = Math.max(G.maxDetect, g.detect);
    if (g.state === GUARD_STATE.ALERT) { anyAlert = true; G.everAlert = true; }
    if (g.state === GUARD_STATE.SUSPICIOUS && g.stateTime < dt * 1.5) audio.suspicious();
    if (g.state === GUARD_STATE.ALERT && g.stateTime < dt * 1.5) audio.alert();
    // caught: an alerted guard touches the player
    if (g.state === GUARD_STATE.ALERT && Math.hypot(g.x - p.x, g.y - p.y) < 26 && !p.hiddenBySmoke) {
      audio.caught();
      showCaught();
      return;
    }
  }

  // ---- switches, doors ----
  for (const s of world.switches) {
    if (!s.on && Math.hypot(p.x - (s.x * TILE + 16), p.y - (s.y * TILE + 16)) < 20) {
      s.on = true;
      world.doorsOpen = true;
      G.lanternPolys = G.world.lanterns.map((L) => visibilityPolygon(L.x, L.y, G.segs, 170));
      audio.door();
      toast('Switch pressed — the locked door swings open');
    }
  }

  // ---- relic / loot / exit ----
  if (world.relic && !world.relic.taken && Math.hypot(p.x - world.relic.x, p.y - world.relic.y) < 24) {
    world.relic.taken = true;
    G.relicTaken = true;
    audio.relic();
    toast('⬢ Relic taken — reach the glowing EXIT');
    updateHud();
  }
  for (const L of world.loots) {
    if (!L.taken && Math.hypot(p.x - L.x, p.y - L.y) < 22) {
      L.taken = true;
      G.lootGot++;
      audio.pickup();
      updateHud();
    }
  }
  if (world.exit && world.relic && world.relic.taken &&
      Math.hypot(p.x - world.exit.x, p.y - world.exit.y) < 24) {
    const rating = !G.everAlert && G.maxDetect < 0.35 ? 'GHOST' : !G.everAlert ? 'SHADOW' : 'SPOTTED';
    if (rating === 'GHOST') G.ghostStreak++;
    G.totals.time += G.levelTime;
    G.totals.loot += G.lootGot;
    G.totals.lootTotal += G.lootTotal;
    if (rating === 'GHOST') G.totals.ghosts++;
    audio.clear();
    showClear(rating);
    return;
  }

  // ---- gadgets: select + aim + throw ----
  if (input.wasPressed('1')) G.selectedGadget = G.selectedGadget === 1 ? null : 1;
  if (input.wasPressed('2')) G.selectedGadget = G.selectedGadget === 2 ? null : 2;
  if (input.wasPressed('3')) G.selectedGadget = G.selectedGadget === 3 ? null : 3;
  if (input.wasPressed('escape')) G.selectedGadget = null;
  G.aiming = G.selectedGadget ? { x: input.mouse.x, y: input.mouse.y } : null;
  if (G.selectedGadget && input.mouse.clicked) {
    throwGadget(G.selectedGadget, input.mouse.x, input.mouse.y);
    if (G.selectedGadget === 3) G.selectedGadget = null;
  }

  // ---- rain ----
  for (const d of G.rain) {
    d.y += d.v * dt;
    d.x -= d.v * dt * 0.12;
    if (d.y > 640) { d.y = -12; d.x = Math.random() * 1000; }
  }

  updateHud();
}

function updateTitle(dt) {
  // Attract mode: guards patrol the live level behind the title panel.
  const p = G.player;
  p.light = lightAt(p.x, p.y);
  for (const g of G.guards) g.update(dt, p, p.light, G.segs, false);
  G.bellTimer -= dt;
  if (G.bellTimer <= 0) {
    G.bellTimer = 24;
    G.bellWave = 1;
    audio.bell();
  }
  G.bellWave = Math.max(0, G.bellWave - dt * 0.5);
  for (const d of G.rain) {
    d.y += d.v * dt;
    d.x -= d.v * dt * 0.12;
    if (d.y > 640) { d.y = -12; d.x = Math.random() * 1000; }
  }
}

// ---- boot ----
for (let i = 0; i < 42; i++) G.rain.push({ x: Math.random() * 960, y: Math.random() * 640, v: 260 + Math.random() * 160 });
loadLevel(0);
showTitle();

overlay.addEventListener('click', () => {
  if (G.state === 'title') startGame();
  else if (G.state === 'clear') nextLevel();
  else if (G.state === 'done') { G.levelIndex = 0; startGame(); }
});

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  G.time += dt;

  if (input.wasPressed('enter')) {
    if (G.state === 'title') startGame();
    else if (G.state === 'clear') nextLevel();
    else if (G.state === 'done') { G.levelIndex = 0; startGame(); }
  }
  if (input.wasPressed('m')) {
    audio.ensure();
    toast(audio.toggleMute() ? 'Sound muted' : 'Sound on');
  }
  if (input.wasPressed('r') && (G.state === 'playing' || G.state === 'caught')) {
    loadLevel(G.levelIndex);
    G.state = 'playing';
    overlay.style.display = 'none';
    overlay.innerHTML = '';
  }
  if (G.state === 'playing') updatePlaying(dt);
  else if (G.state === 'title') updateTitle(dt);

  drawWorld(ctx, G);
  input.endFrame();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// QA / screenshot hook: real game state, no cheats in the shipped loop.
window.__bt = {
  state: () => G.state,
  level: () => G.levelIndex,
  start: () => startGame(),
  winLevel: () => {
    if (G.state !== 'playing') return false;
    if (G.world.relic) { G.world.relic.taken = true; G.relicTaken = true; }
    G.player.x = G.world.exit.x;
    G.player.y = G.world.exit.y;
    return true;
  },
  alertOne: () => {
    if (!G.guards[0]) return false;
    G.guards[0].state = GUARD_STATE.ALERT;
    G.guards[0].detect = 1;
    G.guards[0].lastSeen = { x: G.player.x, y: G.player.y };
    return true;
  },
  ripple: (x, y) => emitRipple(x, y, 120, '#ffd76a', 1.4),
  player: () => ({ x: G.player.x, y: G.player.y, light: G.player.light }),
  guards: () => G.guards.map((g) => ({ x: g.x, y: g.y, state: g.state, detect: g.detect })),
};
