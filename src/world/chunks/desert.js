// file: src/world/chunks/desert.js
/**
 * Generates the layout data for a desert chunk.
 * @param {number} chunkX - The X coordinate of the chunk.
 * @param {number} chunkZ - The Z coordinate of the chunk.
 * @returns {{tiles: Array, objects: Array}}
 */
export function generateData(chunkX, chunkZ) {
  // A desert chunk has all sand tiles by default and no special objects.
  // The ChunkManager will create a sand plane, so we don't need to specify tile data.
  // We can add random cacti or rocks here in the future.
  return {
    tiles: [], // Empty means 'all default' (sand)
    objects: []  // No objects in the desert for now
  };
}
