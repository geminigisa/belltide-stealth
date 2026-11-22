// BELLTIDE guard AI: PATROL -> SUSPICIOUS (?) -> INVESTIGATE -> ALERT (!, chase),
// with a recoverable cooldown: break line of sight, hide in shadow, and the
// guard gives up, searches, and returns to patrol. Patrol routes are learnable:
// faint footprints mark the route on the floor.
import { TILE } from './levels.js';
import { hasLineOfSight } from './raycast.js';

export const GUARD_STATE = { PATROL: 'PATROL', SUSPICIOUS: 'SUSPICIOUS', INVESTIGATE: 'INVESTIGATE', ALERT: 'ALERT' };

export class Guard {
  constructor(def, world) {
    this.world = world;
    this.path = def.path.map(([tx, ty]) => ({ x: tx * TILE + 16, y: ty * TILE + 16 }));
    this.x = this.path[0].x;
    this.y = this.path[0].y;
    this.speed = def.speed;
    this.range = def.range;
    this.wp = 1;
    this.dir = 0; // facing angle
    this.state = GUARD_STATE.PATROL;
    this.detect = 0; // 0..1 suspicion meter
    this.lastSeen = null;
    this.stateTime = 0;
    this.searchTime = 0;
    this.suspicionRing = 0;
    this.footprints = [];
    this.fpTimer = 0;
  }

  // How exposed the player is at their position: 0 = deep shadow, 1 = full lamplight.
  sensePlayer(player, lightLevel, segs, bellMasked, dt) {
    const dx = player.x - this.x, dy = player.y - this.y;
    const dist = Math.hypot(dx, dy);
    // Deep shadow shrinks the guard's effective range drastically; lamplight extends it.
    const effRange = this.range * (0.42 + 0.75 * lightLevel);
    let seen = false;
    if (dist < effRange && dist > 1) {
      const angTo = Math.atan2(dy, dx);
      let da = angTo - this.dir;
      while (da > Math.PI) da -= 2 * Math.PI;
      while (da < -Math.PI) da += 2 * Math.PI;
      const fov = this.state === GUARD_STATE.ALERT ? 1.9 : 1.22; // ~70 deg, wider when chasing
      if (Math.abs(da) < fov / 2 && hasLineOfSight(this.x, this.y, player.x, player.y, segs)) {
        seen = true;
      }
    }
    if (seen && !player.hiddenBySmoke) {
      const closeness = 1 - dist / effRange;
      const rate = (bellMasked ? 0.45 : 1) * (0.55 + 1.5 * closeness * (0.35 + 0.85 * lightLevel));
      this.detect = Math.min(1, this.detect + rate * dt);
      this.lastSeen = { x: player.x, y: player.y };
    } else {
      this.detect = Math.max(0, this.detect - 0.28 * dt);
    }
    // State transitions driven by the meter.
    if (this.state === GUARD_STATE.PATROL && this.detect >= 0.35) {
      this.state = GUARD_STATE.SUSPICIOUS;
      this.stateTime = 0;
    } else if (this.state === GUARD_STATE.SUSPICIOUS) {
      if (this.detect >= 1) { this.state = GUARD_STATE.ALERT; this.stateTime = 0; }
      else if (this.detect <= 0.02) { this.state = GUARD_STATE.PATROL; }
    } else if (this.state === GUARD_STATE.ALERT) {
      if (this.detect <= 0.02 && this.stateTime > 2) {
        this.state = GUARD_STATE.INVESTIGATE;
        this.stateTime = 0;
        this.searchTime = 0;
      }
    }
    return seen;
  }

  update(dt, player, lightLevel, segs, bellMasked) {
    this.stateTime += dt;
    this.suspicionRing = this.detect;
    const seen = this.sensePlayer(player, lightLevel, segs, bellMasked, dt);
    let target = null;
    let speed = this.speed;
    if (this.state === GUARD_STATE.PATROL) {
      target = this.path[this.wp];
      speed = this.speed;
    } else if (this.state === GUARD_STATE.SUSPICIOUS) {
      // Freeze, look toward the last seen spot, ring filling.
      if (this.lastSeen) this.faceToward(this.lastSeen.x, this.lastSeen.y, dt * 2.4);
      if (this.stateTime > 1.6 && this.detect < 1) {
        this.state = GUARD_STATE.INVESTIGATE;
        this.stateTime = 0;
        this.searchTime = 0;
      }
      return seen;
    } else if (this.state === GUARD_STATE.INVESTIGATE) {
      target = this.lastSeen || this.path[this.wp];
      speed = this.speed * 1.25;
      this.searchTime += dt;
      if (this.searchTime > 4.5) {
        // Gave up: return to patrol, fully cooled down.
        this.state = GUARD_STATE.PATROL;
        this.detect = 0;
        this.lastSeen = null;
      }
    } else if (this.state === GUARD_STATE.ALERT) {
      target = this.lastSeen || { x: player.x, y: player.y };
      speed = this.speed * 1.9;
      if (seen) this.stateTime = 0; // keep chasing while the player is visible
    }
    if (target) {
      const dx = target.x - this.x, dy = target.y - this.y;
      const d = Math.hypot(dx, dy);
      if (d < 4) {
        if (this.state === GUARD_STATE.PATROL) this.wp = (this.wp + 1) % this.path.length;
        else if (this.state === GUARD_STATE.INVESTIGATE) this.searchTime += dt * 2;
      } else {
        const nx = this.x + (dx / d) * speed * dt;
        const ny = this.y + (dy / d) * speed * dt;
        this.x = nx;
        this.y = ny;
        this.faceToward(this.x + dx, this.y + dy, dt * 6);
        // Leave faint footprints so the patrol route can be learned.
        this.fpTimer -= dt;
        if (this.fpTimer <= 0) {
          this.fpTimer = 0.28;
          this.footprints.push({ x: this.x, y: this.y, a: 0.5, dir: this.dir });
          if (this.footprints.length > 40) this.footprints.shift();
        }
      }
    }
    for (const fp of this.footprints) fp.a = Math.max(0, fp.a - dt * 0.03);
    return seen;
  }

  faceToward(tx, ty, rate) {
    const want = Math.atan2(ty - this.y, tx - this.x);
    let da = want - this.dir;
    while (da > Math.PI) da -= 2 * Math.PI;
    while (da < -Math.PI) da += 2 * Math.PI;
    const step = Math.max(-rate, Math.min(rate, da));
    this.dir += step;
  }

  // A noise event (footsteps on water/glass, a chime lure): investigate it.
  hearNoise(x, y, loudness) {
    const d = Math.hypot(x - this.x, y - this.y);
    if (d < 300 * loudness && this.state !== GUARD_STATE.ALERT) {
      this.lastSeen = { x, y };
      if (this.state === GUARD_STATE.PATROL) {
        this.state = GUARD_STATE.SUSPICIOUS;
        this.stateTime = 0;
        this.detect = Math.max(this.detect, 0.4);
      }
    }
  }
}
