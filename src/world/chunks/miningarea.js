// file: src/world/chunks/miningarea.js
import * as THREE from 'three';
import { spawnSingleRock } from '../assets/rocks/copperore.js';

export default class MiningArea { /* ... unchanged ... */ }

/**
 * Registers rock spawners for the 'mining' chunk.
 * This now places rocks in fixed tile locations and marks those tiles as unwalkable.
 */
export function register(world) {
  // Define a fixed pattern of rock locations relative to the chunk's center tile.
  // [gridX, gridZ] offsets.
  const rockPattern = [
    [-2, -1], [-1, 1], [0, -2], [1, 2], [2, 0]
  ];

  world.registerKindSpawner('mining', async ({ scene, center, cx, cz, world }) => {
    const chunkGridX = cx * world.TILES_PER_CHUNK;
    const chunkGridZ = cz * world.TILES_PER_CHUNK;

    for (const [dx, dz] of rockPattern) {
      const gridX = chunkGridX + dx;
      const gridZ = chunkGridZ + dz;
      
      const key = `${gridX},${gridZ}`;
      const tile = world._tileMap.get(key);

      if (tile) {
        // Mark the tile as an obstacle
        tile.isWalkable = false;
        // Spawn a single rock at the tile's center
        await spawnSingleRock(scene, { center: tile.center });
      }
    }
  });
}
