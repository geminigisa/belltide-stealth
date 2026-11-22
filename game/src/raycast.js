// BELLTIDE raycast: true 2D visibility polygons, occluded by walls and crates.
// A visibility polygon is the set of points a light (or an eye) can see:
// cast a ray at every wall corner (+/- epsilon), keep the nearest hit, sort by angle.
import { TILE, COLS, ROWS } from './levels.js';

// Collect wall segments (edges of solid tiles) for a world.
export function wallSegments(world) {
  const segs = [];
  const solid = (x, y) => {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return true;
    return world.walls.has(x + ',' + y) || world.crates.has(x + ',' + y) ||
      (world.doors.has(x + ',' + y) && !world.doorsOpen);
  };
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!solid(x, y)) continue;
      if (!solid(x, y - 1)) segs.push([x * TILE, y * TILE, (x + 1) * TILE, y * TILE]);
      if (!solid(x, y + 1)) segs.push([x * TILE, (y + 1) * TILE, (x + 1) * TILE, (y + 1) * TILE]);
      if (!solid(x - 1, y)) segs.push([x * TILE, y * TILE, x * TILE, (y + 1) * TILE]);
      if (!solid(x + 1, y)) segs.push([(x + 1) * TILE, y * TILE, (x + 1) * TILE, (y + 1) * TILE]);
    }
  }
  return segs;
}

function rayHit(ox, oy, dx, dy, segs, maxDist) {
  let best = maxDist;
  for (let i = 0; i < segs.length; i++) {
    const [x1, y1, x2, y2] = segs[i];
    const sx = x2 - x1, sy = y2 - y1;
    const den = dx * sy - dy * sx;
    if (Math.abs(den) < 1e-9) continue;
    const t = ((x1 - ox) * sy - (y1 - oy) * sx) / den;
    const u = ((x1 - ox) * dy - (y1 - oy) * dx) / den;
    if (t > 0 && t < best && u >= 0 && u <= 1) best = t;
  }
  return best;
}

// Visibility polygon from (ox,oy), clipped to maxDist. Returns array of [x,y].
export function visibilityPolygon(ox, oy, segs, maxDist) {
  const pts = new Set();
  for (const [x1, y1, x2, y2] of segs) {
    pts.add(x1 + ',' + y1);
    pts.add(x2 + ',' + y2);
  }
  const hits = [];
  for (const key of pts) {
    const [px, py] = key.split(',').map(Number);
    const base = Math.atan2(py - oy, px - ox);
    for (const da of [-0.0004, 0, 0.0004]) {
      const a = base + da;
      const dx = Math.cos(a), dy = Math.sin(a);
      const t = rayHit(ox, oy, dx, dy, segs, maxDist);
      hits.push({ a, x: ox + dx * t, y: oy + dy * t });
    }
  }
  hits.sort((p, q) => p.a - q.a);
  return hits.map((h) => [h.x, h.y]);
}

// True line-of-sight: no wall segment between (x1,y1) and (x2,y2).
export function hasLineOfSight(x1, y1, x2, y2, segs) {
  const dx = x2 - x1, dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return true;
  const t = rayHit(x1, y1, dx / dist, dy / dist, segs, dist - 0.5);
  return t >= dist - 0.5;
}

// Distance from (x,y) to the nearest wall segment (used for the shadow meter).
export function nearestWallDist(x, y, segs) {
  let best = 1e9;
  for (const [x1, y1, x2, y2] of segs) {
    const dx = x2 - x1, dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    let t = len2 ? ((x - x1) * dx + (y - y1) * dy) / len2 : 0;
    t = Math.max(0, Math.min(1, t));
    const px = x1 + t * dx, py = y1 + t * dy;
    const d = Math.hypot(x - px, y - py);
    if (d < best) best = d;
  }
  return best;
}
