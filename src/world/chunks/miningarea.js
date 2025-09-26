// file: src/world/chunks/miningarea.js
import * as THREE from 'three';
import { spawnSingleRock } from '../assets/rocks/copperore.js';

export default class MiningArea {}

/**
 * Central 20×20 dirt; place exactly 6 rocks:
 * - Chebyshev spacing >= 2 (at least 1 empty tile between any two, incl. diagonals)
 * - Farthest-first selection to maximize spread
 */
export function register(world) {
  world.registerKindSpawner('mining', async ({ scene, cx, cz, world }) => {
    const TP = world.TILES_PER_CHUNK; // 50
    const start = Math.floor((TP - 20) / 2); // 15
    const end   = start + 20;                // 35 (exclusive)

    // Collect central tiles and flag as dirt
    const central = [];
    for (let tz = 0; tz < TP; tz++) {
      for (let tx = 0; tx < TP; tx++) {
        const gX = cx * TP + tx;
        const gZ = cz * TP + tz;
        const tile = world._tileMap.get(`${gX},${gZ}`);
        if (!tile) continue;
        if (tx >= start && tx < end && tz >= start && tz < end) {
          tile.userData.isDirt = true;
          central.push(tile);
        }
      }
    }

    // Farthest-first (k-center) with Chebyshev metric, enforcing minDist >= 2
    const cheb = (a, b) => Math.max(Math.abs(a.gridX - b.gridX), Math.abs(a.gridZ - b.gridZ));
    const K = 6, minDist = 2;
    const chosen = [];

    // seed: pick one near a corner of the patch for spread
    const seeds = [
      central.find(t => t.tx === start && t.tz === start),
      central.find(t => t.tx === end-1 && t.tz === start),
      central.find(t => t.tx === start && t.tz === end-1),
      central.find(t => t.tx === end-1 && t.tz === end-1)
    ].filter(Boolean);
    if (seeds.length) chosen.push(seeds[Math.floor(Math.random()*seeds.length)]);
    else chosen.push(central[Math.floor(Math.random()*central.length)]);

    while (chosen.length < K) {
      let best = null, bestScore = -1;
      for (const c of central) {
        if (chosen.includes(c)) continue;
        const d = chosen.reduce((m, t) => Math.min(m, cheb(c, t)), Infinity);
        // hard constraint: need >= minDist, otherwise skip
        if (d < minDist) continue;
        if (d > bestScore) { bestScore = d; best = c; }
      }
      if (!best) {
        // If constraint too tight (shouldn't happen for 20×20 & K=6), relax slightly:
        for (const c of central) {
          if (chosen.includes(c)) continue;
          const d = chosen.reduce((m, t) => Math.min(m, cheb(c, t)), Infinity);
          if (d > bestScore) { bestScore = d; best = c; }
        }
      }
      if (!best) break;
      chosen.push(best);
    }

    const rockTiles = chosen.slice(0, K);

    // Mark as blocked and spawn
    for (const t of rockTiles) {
      t.isWalkable = false;
      await spawnSingleRock(scene, { center: t.center, tile: t });
    }
  });
}