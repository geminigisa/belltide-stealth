// BELLTIDE level data: 4 handcrafted heists, each with its own palette and floor grammar.
// Tiles: # wall | . stone (quiet) | , carpet (quiet) | ~ water (loud) | w wood (creaky)
//        g glass (very loud) | C crate cover | D locked door | S switch | R relic
//        L bonus loot | E exit (opens after the relic) | P player start | l lantern
export const TILE = 32;
export const COLS = 30;
export const ROWS = 20;

function norm(rows) {
  return rows.map((r) => (r + '#'.repeat(COLS)).slice(0, COLS));
}

export const LEVELS = [
  {
    name: 'I · THE DROWNED HALL',
    sub: 'Rain on the roof, water on the floor — walk slow where it floods.',
    palette: { floor: '#28324e', floorAlt: '#222a47', wall: '#3a4668', wallTop: '#5a6a96', accent: '#ffb84d', tint: '#8fa8ff' },
    map: norm([
      '##############################',
      '#P....,.......~~.....l......#',
      '#.....~~......~~.....l......#',
      '#..C...~~....,..........L...#',
      '#..........................#',
      '#..l......####D#####........#',
      '#........#.........#........#',
      '#........#....R....#....G...#',
      '#..~~....#.........#........#',
      '#..~~....####S#####....l....#',
      '#..........................#',
      '#....C......~~......~~......#',
      '#..........~~......~~...L...#',
      '#..l.............w..........#',
      '#..............ww...........#',
      '#..~......C..........l......#',
      '#..~........................#',
      '#.......,..........,........#',
      '#....l..........,..........E#',
      '##############################',
    ]),
    guards: [
      { path: [[6, 2], [22, 2], [22, 4], [6, 4]], speed: 52, range: 185 },
      { path: [[24, 12], [24, 17], [10, 17], [10, 12]], speed: 48, range: 175 },
    ],
    gadgets: { chime: 3, snuff: 2, smoke: 2 },
  },
  {
    name: 'II · THE CREAKING GALLERY',
    sub: 'Old timber sings under every step. Rugs are your friends.',
    palette: { floor: '#31363f', floorAlt: '#2a2e39', wall: '#4a4238', wallTop: '#6e6252', accent: '#ffcf7a', tint: '#9fe8c0' },
    map: norm([
      '##############################',
      '#P..,,......ww......l.......#',
      '#...,,......ww..............#',
      '#..C.......ww......C....L...#',
      '#..........ww..............#',
      '#..l...########D#########...#',
      '#.....#................#...#',
      '#.....#....,....R.....,.#...#',
      '#..ww.#....,.........,.#.l..#',
      '#..ww.#....,.....,....#....#',
      '#.....####S###########......#',
      '#..........................#',
      '#..l....ww......ww......C...#',
      '#......ww......ww...........#',
      '#......ww..L...ww.....l.....#',
      '#..C...ww......ww...........#',
      '#..........................#',
      '#....l..........,....,......#',
      '#.............gg........E...#',
      '##############################',
    ]),
    guards: [
      { path: [[3, 3], [26, 3], [26, 5], [3, 5]], speed: 56, range: 190 },
      { path: [[13, 12], [13, 18], [22, 18], [22, 12]], speed: 52, range: 180 },
      { path: [[8, 8], [8, 13], [20, 13], [20, 8]], speed: 46, range: 170 },
    ],
    gadgets: { chime: 3, snuff: 2, smoke: 2 },
  },
  {
    name: 'III · THE BELL CHAMBER',
    sub: 'When the bell tolls, the whole tower goes deaf. Use it.',
    palette: { floor: '#322a48', floorAlt: '#2b2340', wall: '#4a3a68', wallTop: '#6a5594', accent: '#ffd76a', tint: '#c9a8ff' },
    map: norm([
      '##############################',
      '#P....,..........gg....l....#',
      '#..... ,.........gg.........#',
      '#..C......l..........C......#',
      '#..........................#',
      '#..l..########D#########....#',
      '#....#.................#...#',
      '#....#..~~....R....~~..#.l.#',
      '#....#..~~..........~~.#...#',
      '#....#..~~....,.....~~.#...#',
      '#....#####S############.....#',
      '#..........................#',
      '#..l......,,.......,,.......#',
      '#......... ,,.......,,..L...#',
      '#..C......,,.......,,.......#',
      '#..........................#',
      '#....l......gg......gg......#',
      '#...........gg......gg..l...#',
      '#..~...........L..........E.#',
      '##############################',
    ]),
    guards: [
      { path: [[4, 2], [25, 2], [25, 4], [4, 4]], speed: 58, range: 195 },
      { path: [[10, 12], [10, 18], [20, 18], [20, 12]], speed: 54, range: 185 },
      { path: [[24, 13], [24, 17], [27, 17], [27, 13]], speed: 50, range: 175 },
    ],
    gadgets: { chime: 4, snuff: 2, smoke: 2 },
  },
  {
    name: 'IV · THE LAMP ROOM',
    sub: 'The keeper watches the last light. Take it, and run.',
    palette: { floor: '#3a2930', floorAlt: '#31242a', wall: '#54343c', wallTop: '#7a4a52', accent: '#ff9a5a', tint: '#ffb0a0' },
    map: norm([
      '##############################',
      '#P...~~.......gg.....l......#',
      '#....~~.......gg............#',
      '#..C....l.........C.....L...#',
      '#..........................#',
      '#..l...######D######........#',
      '#.....#............#...l....#',
      '#..~..#..,,...R..,..#......#',
      '#..~..#..,,......,..#..G...#',
      '#.....#..,,...,...,.#......#',
      '#..ww.####S##########.......#',
      '#..ww......................#',
      '#..ww...~~.....~~......C....#',
      '#......~~......~~.....l.....#',
      '#..l...~~..L...~~..........#',
      '#..........................#',
      '#..C......gg.......gg.......#',
      '#.........gg.......gg...l...#',
      '#....l..........,........E..#',
      '##############################',
    ]),
    guards: [
      { path: [[3, 2], [26, 2], [26, 4], [3, 4]], speed: 62, range: 200 },
      { path: [[12, 12], [12, 18], [18, 18], [18, 12]], speed: 58, range: 190 },
      { path: [[23, 12], [23, 17], [27, 17], [27, 12]], speed: 56, range: 185 },
      { path: [[6, 13], [6, 17], [10, 17], [10, 13]], speed: 50, range: 180 },
    ],
    gadgets: { chime: 4, snuff: 3, smoke: 2 },
  },
];

// Parse a level map into walls, floors, entities. Returns a fresh world object.
export function buildWorld(level) {
  const walls = new Set();
  const crates = new Set();
  const doors = new Set();
  const switches = [];
  const lanterns = [];
  const loots = [];
  let relic = null;
  let exit = null;
  let player = { x: 48, y: 48 };
  const floors = [];
  for (let y = 0; y < ROWS; y++) {
    floors[y] = [];
    for (let x = 0; x < COLS; x++) {
      const ch = level.map[y][x];
      floors[y][x] = ch;
      if (ch === '#') walls.add(x + ',' + y);
      if (ch === 'C') crates.add(x + ',' + y);
      if (ch === 'D') doors.add(x + ',' + y);
      if (ch === 'S') switches.push({ x, y, on: false });
      if (ch === 'l') lanterns.push({ x: x * TILE + 16, y: y * TILE + 16, phase: Math.random() * 6.28, offUntil: 0 });
      if (ch === 'R') relic = { x: x * TILE + 16, y: y * TILE + 16, taken: false };
      if (ch === 'L') loots.push({ x: x * TILE + 16, y: y * TILE + 16, taken: false });
      if (ch === 'E') exit = { x: x * TILE + 16, y: y * TILE + 16 };
      if (ch === 'P') player = { x: x * TILE + 16, y: y * TILE + 16 };
    }
  }
  return { level, walls, crates, doors, switches, lanterns, loots, relic, exit, player, floors, doorsOpen: false };
}

export function isSolid(world, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
  const k = tx + ',' + ty;
  if (world.walls.has(k) || world.crates.has(k)) return true;
  if (world.doors.has(k) && !world.doorsOpen) return true;
  return false;
}

// Circle vs solid tiles collision: returns corrected position.
export function collide(world, x, y, r) {
  const minTx = Math.floor((x - r) / TILE), maxTx = Math.floor((x + r) / TILE);
  const minTy = Math.floor((y - r) / TILE), maxTy = Math.floor((y + r) / TILE);
  for (let ty = minTy; ty <= maxTy; ty++) {
    for (let tx = minTx; tx <= maxTx; tx++) {
      if (!isSolid(world, tx, ty)) continue;
      const cx = Math.max(tx * TILE, Math.min(x, tx * TILE + TILE));
      const cy = Math.max(ty * TILE, Math.min(y, ty * TILE + TILE));
      const dx = x - cx, dy = y - cy, d2 = dx * dx + dy * dy;
      if (d2 < r * r && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        x = cx + (dx / d) * r;
        y = cy + (dy / d) * r;
      }
    }
  }
  return { x, y };
}
