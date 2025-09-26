// file: src/world/chunks/miningarea.js
import * as THREE from 'three';
import { spawnSingleRock } from '../assets/rocks/copperore.js';

export default class MiningArea {}

/**
 * Mining chunk content:
 * - Mark central 20×20 as dirt
 * - Place exactly 6 rocks with a 1-tile gap in all directions (no touching, incl. diagonals)
 * - Rock tiles are unwalkable for pathfinding
 */
export function register(world) {
  world.registerKindSpawner('mining', async ({ scene, cx, cz, world }) => {
    const TP = world.TILES_PER_CHUNK; // 50
    const start = Math.floor((TP - 20) / 2); // 15
    const end   = start + 20;                // 35 (exclusive)

    // Collect tiles in this chunk and flag dirt area
    const centralTiles = [];
    for (let tz = 0; tz < TP; tz++) {
      for (let tx = 0; tx < TP; tx++) {
        const gX = cx * TP + tx;
        const gZ = cz * TP + tz;
        const tile = world._tileMap.get(`${gX},${gZ}`);
        if (!tile) continue;
        if (tx >= start && tx < end && tz >= start && tz < end) {
          tile.userData.isDirt = true;
          centralTiles.push(tile);
        }
      }
    }

    // Pick 6 non-touching tiles (Chebyshev distance >= 2)
    const candidates = centralTiles.slice();
    // Shuffle for randomness
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    const rockTiles = [];
    while (candidates.length && rockTiles.length < 6) {
      const chosen = candidates.pop();
      rockTiles.push(chosen);

      // Remove any candidate within 1 tile in any direction (no touching incl. diagonals)
      for (let i = candidates.length - 1; i >= 0; i--) {
        const t = candidates[i];
        const dx = Math.abs(t.gridX - chosen.gridX);
        const dz = Math.abs(t.gridZ - chosen.gridZ);
        if (dx <= 1 && dz <= 1) candidates.splice(i, 1);
      }
    }

    // Safety: ensure we got 6
    if (rockTiles.length !== 6) {
      console.warn(`[MiningArea] Only placed ${rockTiles.length}/6 rocks; central area too constrained?`);
    }

    // Mark blocked + spawn
    for (const t of rockTiles) {
      t.isWalkable = false;
      await spawnSingleRock(scene, { center: t.center, tile: t });
    }
  });
}