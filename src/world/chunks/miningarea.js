// file: src/world/chunks/miningarea.js
const CHUNK_GRID_SIZE = 32;

/**
 * Generates the layout data for the mining area chunk.
 * @param {number} chunkX - The X coordinate of the chunk.
 * @param {number} chunkZ - The Z coordinate of the chunk.
 * @returns {{tiles: Array, objects: Array}}
 */
export function generateData(chunkX, chunkZ) {
  const tiles = [];
  const objects = [];

  // Define a 20x20 dirt patch in the center
  const patchSize = 20;
  const start = Math.floor((CHUNK_GRID_SIZE - patchSize) / 2);
  const end = start + patchSize;

  for (let tx = start; tx < end; tx++) {
    for (let tz = start; tz < end; tz++) {
      tiles.push({ x: tx, z: tz, type: 'dirt' });
    }
  }

  // Define copper ore rock positions
  // x, z, s (scale), r (rotation)
  objects.push({ type: 'copperore', x: 10, z: 12, s: 1.2, r: 0.5 });
  objects.push({ type: 'copperore', x: 15, z: 8,  s: 1.0, r: 1.2 });
  objects.push({ type: 'copperore', x: 22, z: 14, s: 1.4, r: 2.1 });
  objects.push({ type: 'copperore', x: 18, z: 20, s: 1.1, r: 3.8 });
  objects.push({ type: 'copperore', x: 9,  z: 18, s: 1.3, r: 4.5 });
  objects.push({ type: 'copperore', x: 24, z: 23, s: 1.0, r: 5.2 });
  
  return { tiles, objects };
}
