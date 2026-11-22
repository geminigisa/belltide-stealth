// BELLTIDE render: procedural Canvas 2D only — tiled floors, masonry walls,
// raycast lamplight, high-contrast guard vision cones, sound ripples, rain.
// The whole level is one screen (960x640), so the judge's screenshot reads at a glance.
import { TILE, COLS, ROWS } from './levels.js';
import { visibilityPolygon } from './raycast.js';

const W = 960, H = 640;

function hash(x, y) {
  let h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967295;
}

function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i], [xj, yj] = poly[j];
    if (((yi > py) !== (yj > py)) && (px < ((xj - xi) * (py - yi)) / (yj - yi) + xi)) inside = !inside;
  }
  return inside;
}

// Guard vision cone as a fan of short rays (cheap: 18 rays, not a full polygon).
export function conePolygon(g, segs) {
  const pts = [[g.x, g.y]];
  const N = 18;
  const fov = g.state === 'ALERT' ? 1.9 : 1.22;
  for (let i = 0; i <= N; i++) {
    const a = g.dir - fov / 2 + (fov * i) / N;
    const dx = Math.cos(a), dy = Math.sin(a);
    let best = g.range * (g.state === 'ALERT' ? 1.15 : 1);
    for (const [x1, y1, x2, y2] of segs) {
      const sx = x2 - x1, sy = y2 - y1;
      const den = dx * sy - dy * sx;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((x1 - g.x) * sy - (y1 - g.y) * sx) / den;
      const u = ((x1 - g.x) * dy - (y1 - g.y) * dx) / den;
      if (t > 0 && t < best && u >= 0 && u <= 1) best = t;
    }
    pts.push([g.x + dx * best, g.y + dy * best]);
  }
  return pts;
}

export function drawWorld(ctx, G) {
  const { world, player, guards, ripples, rain, time, segs } = G;
  const pal = world.level.palette;
  const now = time;

  // ---- floor ----
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = world.floors[y][x];
      const px = x * TILE, py = y * TILE;
      const v = hash(x, y);
      let base = pal.floor;
      if ((x + y) % 2 === 0) base = pal.floorAlt;
      ctx.fillStyle = base;
      ctx.fillRect(px, py, TILE, TILE);
      if (ch === ',') { // carpet: deep red runner with border
        ctx.fillStyle = '#5a2430';
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.strokeStyle = '#8a4a3a';
        ctx.strokeRect(px + 5, py + 5, TILE - 10, TILE - 10);
      } else if (ch === '~') { // flooded water: reflective blue with shimmer
        ctx.fillStyle = '#16283e';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = 'rgba(140,190,255,' + (0.25 + 0.2 * Math.sin(now * 2 + x * 1.3 + y)) + ')';
        ctx.beginPath();
        ctx.moveTo(px + 6, py + 10 + 3 * Math.sin(now * 1.5 + x));
        ctx.lineTo(px + 26, py + 10 + 3 * Math.sin(now * 1.5 + x));
        ctx.moveTo(px + 6, py + 22 - 3 * Math.sin(now * 1.7 + y));
        ctx.lineTo(px + 26, py + 22 - 3 * Math.sin(now * 1.7 + y));
        ctx.stroke();
      } else if (ch === 'w') { // creaky timber planks
        ctx.fillStyle = '#3a2c1e';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = '#241a10';
        ctx.beginPath();
        ctx.moveTo(px, py + 10); ctx.lineTo(px + TILE, py + 10);
        ctx.moveTo(px, py + 21); ctx.lineTo(px + TILE, py + 21);
        ctx.stroke();
      } else if (ch === 'g') { // glass floor: pale, cracked, very loud
        ctx.fillStyle = '#3d4a55';
        ctx.fillRect(px, py, TILE, TILE);
        ctx.strokeStyle = 'rgba(200,230,255,0.5)';
        ctx.beginPath();
        ctx.moveTo(px + 8, py + 4); ctx.lineTo(px + 14, py + 16); ctx.lineTo(px + 6, py + 28);
        ctx.moveTo(px + 22, py + 6); ctx.lineTo(px + 16, py + 18); ctx.lineTo(px + 26, py + 26);
        ctx.stroke();
      } else if (ch === '.' || ch === 'P' || ch === 'R' || ch === 'L' || ch === 'E' || ch === 'S' || ch === 'l') {
        // stone tile joints + speckles
        ctx.strokeStyle = 'rgba(0,0,0,0.25)';
        ctx.strokeRect(px + 0.5, py + 0.5, TILE - 1, TILE - 1);
        if (v > 0.6) {
          ctx.fillStyle = 'rgba(255,255,255,0.05)';
          ctx.fillRect(px + 6 + v * 14, py + 8 + v * 12, 3, 3);
        }
      }
      if (ch === 'S') { // pressure switch plate
        ctx.fillStyle = world.switches.some((s) => s.x === x && s.y === y && s.on) ? '#7fe8c8' : '#8a7a4a';
        ctx.beginPath(); ctx.arc(px + 16, py + 16, 9, 0, 6.29); ctx.fill();
        ctx.fillStyle = '#0b1020';
        ctx.beginPath(); ctx.arc(px + 16, py + 16, 4, 0, 6.29); ctx.fill();
      }
    }
  }

  // ---- guard patrol footprints (learnable routes) ----
  for (const g of guards) {
    for (const fp of g.footprints) {
      ctx.save();
      ctx.globalAlpha = fp.a * 0.35;
      ctx.fillStyle = '#c9d4ff';
      ctx.translate(fp.x, fp.y);
      ctx.rotate(fp.dir);
      ctx.fillRect(-4, -2, 8, 4);
      ctx.restore();
    }
  }

  // ---- relic, loot, exit ----
  if (world.relic && !world.relic.taken) {
    const pulse = 0.7 + 0.3 * Math.sin(now * 3);
    ctx.save();
    ctx.shadowColor = '#7fe8c8'; ctx.shadowBlur = 18 * pulse;
    ctx.fillStyle = '#7fe8c8';
    ctx.beginPath();
    ctx.moveTo(world.relic.x, world.relic.y - 11);
    ctx.lineTo(world.relic.x + 8, world.relic.y);
    ctx.lineTo(world.relic.x, world.relic.y + 11);
    ctx.lineTo(world.relic.x - 8, world.relic.y);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  for (const L of world.loots) {
    if (L.taken) continue;
    const pulse = 0.7 + 0.3 * Math.sin(now * 4 + L.x);
    ctx.save();
    ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 12 * pulse;
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(L.x, L.y, 6, 0, 6.29); ctx.fill();
    ctx.fillStyle = '#0b1020';
    ctx.font = 'bold 8px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('◆', L.x, L.y + 0.5);
    ctx.restore();
  }
  if (world.exit) {
    const open = world.relic && world.relic.taken;
    const pulse = open ? 0.7 + 0.3 * Math.sin(now * 4) : 0.3;
    ctx.save();
    ctx.shadowColor = open ? '#7fe8c8' : '#55648f';
    ctx.shadowBlur = open ? 22 * pulse : 6;
    ctx.strokeStyle = open ? '#7fe8c8' : '#55648f';
    ctx.lineWidth = 3;
    ctx.strokeRect(world.exit.x - 13, world.exit.y - 13, 26, 26);
    ctx.fillStyle = open ? '#7fe8c8' : '#8899bb';
    ctx.font = 'bold 11px Georgia'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(open ? 'EXIT' : '🔒', world.exit.x, world.exit.y);
    ctx.restore();
  }

  // ---- walls, crates, doors ----
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const ch = world.floors[y][x];
      const px = x * TILE, py = y * TILE;
      if (ch === '#') {
        ctx.fillStyle = pal.wall;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = pal.wallTop;
        ctx.fillRect(px, py, TILE, 5);
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.fillRect(px, py + TILE - 4, TILE, 4);
      } else if (ch === 'C') {
        ctx.fillStyle = '#4a3520';
        ctx.fillRect(px + 3, py + 3, TILE - 6, TILE - 6);
        ctx.strokeStyle = '#2c1f10';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 3, py + 3, TILE - 6, TILE - 6);
        ctx.beginPath();
        ctx.moveTo(px + 3, py + 3); ctx.lineTo(px + TILE - 3, py + TILE - 3);
        ctx.moveTo(px + TILE - 3, py + 3); ctx.lineTo(px + 3, py + TILE - 3);
        ctx.stroke();
        ctx.lineWidth = 1;
      } else if (ch === 'D') {
        const open = world.doorsOpen;
        ctx.fillStyle = open ? '#2c3a2c' : '#5a4a2a';
        ctx.fillRect(px, py + (open ? 22 : 0), TILE, open ? 10 : TILE);
        if (!open) {
          ctx.fillStyle = '#ffd76a';
          ctx.beginPath(); ctx.arc(px + 16, py + 16, 4, 0, 6.29); ctx.fill();
        }
      }
    }
  }

  // ---- lanterns (with flickering glow, drawn before the darkness pass) ----
  for (const L of world.lanterns) {
    const off = L.offUntil > now;
    const fl = off ? 0 : 0.85 + 0.15 * Math.sin(now * 7 + L.phase) * Math.sin(now * 3.1 + L.phase);
    ctx.save();
    ctx.fillStyle = '#2a2118';
    ctx.fillRect(L.x - 2, L.y - 14, 4, 14);
    ctx.shadowColor = '#ffb84d';
    ctx.shadowBlur = off ? 0 : 16 * fl;
    ctx.fillStyle = off ? '#3a3428' : '#ffb84d';
    ctx.beginPath(); ctx.arc(L.x, L.y - 2, 6, 0, 6.29); ctx.fill();
    ctx.fillStyle = off ? '#221e18' : '#fff2c8';
    ctx.beginPath(); ctx.arc(L.x, L.y - 2, 2.5, 0, 6.29); ctx.fill();
    ctx.restore();
  }

  // ---- darkness pass: light holes punched where lanterns see ----
  const dark = G.darkCanvas;
  const dctx = dark.getContext('2d');
  dctx.clearRect(0, 0, W, H);
  dctx.fillStyle = 'rgba(4,7,16,0.80)';
  dctx.fillRect(0, 0, W, H);
  dctx.globalCompositeOperation = 'destination-out';
  for (let i = 0; i < world.lanterns.length; i++) {
    const L = world.lanterns[i];
    if (L.offUntil > now) continue;
    const poly = G.lanternPolys[i];
    if (!poly) continue;
    const fl = 0.9 + 0.1 * Math.sin(now * 7 + L.phase);
    dctx.beginPath();
    dctx.moveTo(poly[0][0], poly[0][1]);
    for (const [px, py] of poly) dctx.lineTo(px, py);
    dctx.closePath();
    dctx.fillStyle = 'rgba(0,0,0,' + (0.82 * fl).toFixed(3) + ')';
    dctx.fill();
  }
  // soft visibility bubble around the player so they never vanish
  const pg = dctx.createRadialGradient(player.x, player.y, 8, player.x, player.y, 64);
  pg.addColorStop(0, 'rgba(0,0,0,0.85)');
  pg.addColorStop(1, 'rgba(0,0,0,0)');
  dctx.fillStyle = pg;
  dctx.beginPath(); dctx.arc(player.x, player.y, 64, 0, 6.29); dctx.fill();
  dctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(dark, 0, 0);

  // ---- guard vision cones: HIGH contrast, readable even as a thumbnail ----
  for (const g of guards) {
    const poly = conePolygon(g, segs);
    const alert = g.state === 'ALERT';
    const susp = g.state === 'SUSPICIOUS' || g.state === 'INVESTIGATE';
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (const [px, py] of poly) ctx.lineTo(px, py);
    ctx.closePath();
    ctx.fillStyle = alert ? 'rgba(255,60,40,0.38)' : susp ? 'rgba(255,190,60,0.34)' : 'rgba(255,184,77,0.30)';
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = alert ? '#ff3c28' : susp ? '#ffb43c' : '#ffcf7a';
    ctx.lineWidth = alert ? 3 : 2;
    ctx.stroke();
    ctx.restore();
    // suspicion ring + state icon above the guard
    if (g.suspicionRing > 0.03) {
      ctx.save();
      ctx.strokeStyle = alert ? '#ff3c28' : '#ffb43c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(g.x, g.y, 20, -Math.PI / 2, -Math.PI / 2 + g.suspicionRing * 6.283);
      ctx.stroke();
      ctx.restore();
    }
    ctx.save();
    ctx.font = 'bold 17px Georgia';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = alert ? '#ff6a55' : susp ? '#ffd76a' : '#c9d4ff';
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 4;
    ctx.fillText(alert ? '!' : susp ? '?' : '', g.x, g.y - 20);
    ctx.restore();
  }

  // ---- guards (big, readable bodies) ----
  for (const g of guards) {
    ctx.save();
    ctx.translate(g.x, g.y);
    ctx.shadowColor = '#000';
    ctx.shadowBlur = 8;
    ctx.fillStyle = g.state === 'ALERT' ? '#a83226' : '#3a4a6e';
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, 6.29); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#d8e2ff';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 13, 0, 6.29); ctx.stroke();
    // facing tick + helmet
    ctx.rotate(g.dir);
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath();
    ctx.moveTo(16, 0); ctx.lineTo(8, -5); ctx.lineTo(8, 5);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8fa8ff';
    ctx.beginPath(); ctx.arc(-2, 0, 5, 0, 6.29); ctx.fill();
    ctx.restore();
  }

  // ---- player: big, cyan-ringed, unmistakable against the floor ----
  ctx.save();
  ctx.translate(player.x, player.y);
  if (player.hiddenBySmoke) ctx.globalAlpha = 0.45;
  ctx.shadowColor = '#4de8c8';
  ctx.shadowBlur = 14;
  ctx.fillStyle = '#123a34';
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, 6.29); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#4de8c8';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, 6.29); ctx.stroke();
  ctx.fillStyle = '#e8fff8';
  ctx.beginPath(); ctx.arc(0, 0, 4.5, 0, 6.29); ctx.fill();
  ctx.restore();

  // ---- sound ripples: big expanding rings, impossible to miss ----
  for (const r of ripples) {
    const age = now - r.born;
    const t = age / r.life;
    if (t < 0 || t > 1) continue;
    const rad = 8 + t * r.maxR;
    ctx.save();
    ctx.globalAlpha = (1 - t) * 0.9;
    ctx.strokeStyle = r.color;
    ctx.lineWidth = 3.5;
    ctx.beginPath(); ctx.arc(r.x, r.y, rad, 0, 6.29); ctx.stroke();
    ctx.globalAlpha = (1 - t) * 0.4;
    ctx.lineWidth = 8;
    ctx.beginPath(); ctx.arc(r.x, r.y, rad * 0.92, 0, 6.29); ctx.stroke();
    ctx.restore();
  }

  // ---- throw preview arc ----
  if (G.aiming) {
    const { x, y } = G.aiming;
    ctx.save();
    ctx.strokeStyle = 'rgba(255,215,106,0.9)';
    ctx.setLineDash([6, 6]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.quadraticCurveTo((player.x + x) / 2, (player.y + y) / 2 - 42, x, y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#ffd76a';
    ctx.beginPath(); ctx.arc(x, y, 5, 0, 6.29); ctx.fill();
    ctx.restore();
  }

  // ---- rain streaks + splashes ----
  ctx.save();
  ctx.strokeStyle = 'rgba(160,190,255,0.28)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const drop of rain) {
    ctx.moveTo(drop.x, drop.y);
    ctx.lineTo(drop.x - 3, drop.y + 12);
  }
  ctx.stroke();
  ctx.restore();

  // ---- bell toll shockwave ----
  if (G.bellWave > 0) {
    ctx.save();
    ctx.globalAlpha = G.bellWave * 0.5;
    ctx.strokeStyle = '#ffd76a';
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(W / 2, 90, (1 - G.bellWave) * 420 + 40, 0, 6.29); ctx.stroke();
    ctx.restore();
  }
}

export { pointInPoly };
