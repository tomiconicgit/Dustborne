// file: src/world/chunks/chunkmanager.js
import * as THREE from 'three';
import { scene } from '../../core/scene.js';
import { Chunk } from '../../core/chunk.js';

export default class ChunkManager {
  /**
   * The single, globally accessible instance of the ChunkManager.
   * @type {ChunkManager | null}
   */
  static instance = null;

  static create() {
    if (ChunkManager.instance) return;
    ChunkManager.instance = new ChunkManager();
  }

  constructor() {
    if (ChunkManager.instance) {
      throw new Error('ChunkManager is a singleton.');
    }
    this.chunks = new Map();
    this.activeChunks = new Map();

    // Properties required for chunk generation
    this.TILE_SIZE = 1;
    this.CHUNK_GRID_SIZE = 32;
    this.UNITS_PER_CHUNK = this.CHUNK_GRID_SIZE * this.TILE_SIZE;
    this.sharedTileGeo = new THREE.PlaneGeometry(this.TILE_SIZE, this.TILE_SIZE).rotateX(-Math.PI / 2);
    this.materials = {
      sand: new THREE.MeshStandardMaterial({ color: '#C2B280', roughness: 1, metalness: 0 }),
      dirt: new THREE.MeshStandardMaterial({ color: '#8b5a2b', roughness: 1, metalness: 0 }),
    };
  }

  getChunkKey(chunkX, chunkZ) { return `${chunkX},${chunkZ}`; }

  async getChunk(chunkX, chunkZ) {
    const key = this.getChunkKey(chunkX, chunkZ);
    if (this.chunks.has(key)) return this.chunks.get(key);
    // Pass 'this' (the manager) to the chunk so it can access materials etc.
    const chunk = new Chunk(scene, this, chunkX, chunkZ);
    this.chunks.set(key, chunk);
    await chunk.build();
    return chunk;
  }

  /**
   * This is called by the character to update which chunks are visible.
   * @param {THREE.Vector3} playerPosition The current position of the player.
   * @param {number} viewDistance The character's view distance.
   */
  update(playerPosition, viewDistance) {
    const pCX = Math.floor((playerPosition.x + this.UNITS_PER_CHUNK * 0.5) / this.UNITS_PER_CHUNK);
    const pCZ = Math.floor((playerPosition.z + this.UNITS_PER_CHUNK * 0.5) / this.UNITS_PER_CHUNK);
    const required = new Map();
    for (let x = pCX - viewDistance; x <= pCX + viewDistance; x++) {
      for (let z = pCZ - viewDistance; z <= pCZ + viewDistance; z++) {
        required.set(this.getChunkKey(x, z), { x, z });
      }
    }
    for (const [key, chunk] of this.activeChunks.entries()) {
      if (!required.has(key)) {
        chunk.hide();
        this.activeChunks.delete(key);
      }
    }
    for (const [key, { x, z }] of required.entries()) {
      if (!this.activeChunks.has(key)) {
        this.getChunk(x, z).then(chunk => {
          if (required.has(key) && !this.activeChunks.has(key)) {
            chunk.show();
            this.activeChunks.set(key, chunk);
          }
        });
      }
    }
  }
}
