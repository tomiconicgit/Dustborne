// file: src/world/chunks/miningarea.js
import * as THREE from 'three';
import { DUSTBORNE_CHUNK_SIZE } from '../../core/chunk.js';

/**
 * Defines content for the mining area chunk.
 * This function is now given the specific chunk to populate.
 */
export function register(chunk) {
  // Place a 20x20 dirt patch in the center of the 32x32 chunk
  const patchSize = 20;
  const start = Math.floor((DUSTBORNE_CHUNK_SIZE - patchSize) / 2); // (32-20)/2 = 6
  const end = start + patchSize;

  for (let tx = start; tx < end; tx++) {
    for (let tz = start; tz < end; tz++) {
      const tile = chunk._tileMap.get(`${tx},${tz}`);
      if (tile) {
        tile.userData.isDirt = true;
      }
    }
  }

  // Add 6 rocks to the chunk's rock data list
  chunk.addRock(10, 12, 1.2, 0.5);
  chunk.addRock(15, 8, 1.0, 1.2);
  chunk.addRock(22, 14, 1.4, 2.1);
  chunk.addRock(18, 20, 1.1, 3.8);
  chunk.addRock(9, 18, 1.3, 4.5);
  chunk.addRock(24, 23, 1.0, 5.2);
}
