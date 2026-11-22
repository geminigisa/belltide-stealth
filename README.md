# BELLTIDE — The Flooded Lighthouse

[![make.fun · best-stealth-game-20261121-1759](https://make.fun/badge/best-stealth-game-20261121-1759.svg)](https://make.fun/bounty/best-stealth-game-20261121-1759?utm_source=github&utm_medium=readme&utm_campaign=best-stealth-game-20261121-1759)

A top-down 2D stealth game set in a flooded lighthouse at midnight. Rain on the roof,
water on the floor, and one bell that — when it tolls — swallows every sound you make.

**Play it:** open `game/index.html` in a desktop browser (or `node serve.ts` and visit http://localhost:8080).

## The heist

Four handcrafted levels, each with its own palette and floor grammar:

1. **I · The Drowned Hall** — flooded stone, two patrols, one locked door.
2. **II · The Creaking Gallery** — timber that sings under every step; rugs are your friends.
3. **III · The Bell Chamber** — glass floors and the bell that masks your footsteps.
4. **IV · The Lamp Room** — the keeper watches the last light. Take it, and run.

Steal the relic, grab the bonus loot, and reach the glowing exit unseen.

## How stealth works

- **True 2D raycast lighting** — real wall-occluded visibility polygons for every
  lantern and every guard vision cone. Deep shadow shrinks a guard's detection
  range drastically; warm lamplight exposes you.
- **Acoustic stealth** — stone and carpet are quiet; flooded water is loud, creaky
  timber is louder, glass is loudest. Fast movement leaves big visible sound ripples.
  The tower bell tolls every 24 seconds and masks all footsteps for 3 seconds.
- **Guard AI** — PATROL → SUSPICIOUS (?) → INVESTIGATE → ALERT (!, chase), with a
  recoverable cooldown: break line of sight, hide in shadow, and the guard gives up
  and returns to patrol. Faint footprints mark patrol routes so you can learn them.
- **Three gadgets** — `1` Chime lure (draws guards to a ringing ripple), `2` Snuff dart
  (kills a lantern for 14s and carves a new shadow path), `3` Smoke veil (4s unseen).
- **GHOST / SHADOW / SPOTTED** rating per level, with time, loot, and ghost streak.

## Controls

- **WASD / Arrows** move · **Shift** sneak (slow, silent) · **Space** sprint (fast, loud)
- **1 / 2 / 3** select a gadget, aim with the mouse, click to throw
- **R** restart level · **M** mute · **Enter** advance

## Tech

100% procedural Canvas 2D and Web Audio — no external assets, no network requests,
no libraries. Node 22 `main.ts` hands the game in via the vendored `makefun-game.ts`.

Entry for the make.fun bounty [Make the best stealth game](https://make.fun/bounty/best-stealth-game-20261121-1759).
