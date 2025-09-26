// file: src/world/chunks/miningarea.js
import * as THREE from 'three';
import { spawnSingleRock } from '../assets/rocks/copperore.js';

export default class MiningArea {}

/**
 * Registers rock spawners for the 'mining' chunk.
 * This logic now intelligently places 6 rocks in the central area of the chunk,
 * ensuring there is at least one empty tile of space around each rock for navigation.
 */
export function register(world) {
  world.registerKindSpawner('mining', async ({ scene, cx, cz, world }) => {
    // 1. Define the spawn area (the central 3x3 tiles of the chunk)
    const centerGridX = cx * world.TILES_PER_CHUNK;
    const centerGridZ = cz * world.TILES_PER_CHUNK;
    
    let spawnableTiles = [];
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        const tile = world._tileMap.get(`${centerGridX + dx},${centerGridZ + dz}`);
        if (tile) {
          spawnableTiles.push(tile);
        }
      }
    }

    // 2. Intelligently select 6 tiles for rocks, ensuring they don't touch
    const rockTiles = [];
    const rockLocations = new Set();
    const rockCount = 6;

    for (let i = 0; i < rockCount && spawnableTiles.length > 0; i++) {
      // Pick a random available tile
      const randomIndex = Math.floor(Math.random() * spawnableTiles.length);
      const chosenTile = spawnableTiles.splice(randomIndex, 1)[0];
      
      rockTiles.push(chosenTile);
      rockLocations.add(`${chosenTile.gridX},${chosenTile.gridZ}`);

      // Make the surrounding 8 tiles (and the chosen tile itself) un-spawnable for other rocks
      // This creates the empty space for navigation.
      const neighborsToRemove = new Set();
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          neighborsToRemove.add(`${chosenTile.gridX + dx},${chosenTile.gridZ + dz}`);
        }
      }
      
      // Filter the spawnableTiles list, removing any that are now too close
      spawnableTiles = spawnableTiles.filter(tile => !neighborsToRemove.has(`${tile.gridX},${tile.gridZ}`));
    }
    
    // 3. Mark the chosen tiles as unwalkable and spawn the rocks
    for (const tile of rockTiles) {
      // Mark the tile as an obstacle for the pathfinder
      tile.isWalkable = false;
      
      // Spawn a single rock at the tile's center
      await spawnSingleRock(scene, { center: tile.center });
    }
  });
}
