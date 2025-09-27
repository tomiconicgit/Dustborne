// file: src/world/chunks/chunkmanager.js
import * as THREE from 'three';
import { scene } from '../../core/three.js';
import { generateData as generateMiningData } from './miningarea.js';
import { generateData as generateDesertData } from './desert.js';
import { getRockTemplate } from '../assets/rocks/copperore/copperorelogic.js';

const TILE_SIZE = 1;
const CHUNK_GRID_SIZE = 32;
const UNITS_PER_CHUNK = CHUNK_GRID_SIZE * TILE_SIZE;

export default class ChunkManager {
  static instance = null;

  static async create() {
    if (ChunkManager.instance) return;
    ChunkManager.instance = new ChunkManager();
    await ChunkManager.instance.init();
  }

  constructor() {
    if (ChunkManager.instance) throw new Error('ChunkManager is a singleton.');
    this.chunks = new Map();
    this.activeChunks = new Map();
    this.materials = {
      sand: new THREE.MeshStandardMaterial({ color: '#C2B280' }),
      dirt: new THREE.MeshStandardMaterial({ color: '#8b5a2b' }),
    };
    this.rockTemplate = null;
  }
  
  async init() {
    this.rockTemplate = await getRockTemplate();
  }

  getChunkKey(chunkX, chunkZ) { return `${chunkX},${chunkZ}`; }

  async getChunk(chunkX, chunkZ) {
    const key = this.getChunkKey(chunkX, chunkZ);
    if (this.chunks.has(key)) return this.chunks.get(key);

    const chunkData = (chunkX === 0 && chunkZ === 0)
      ? generateMiningData(chunkX, chunkZ)
      : generateDesertData(chunkX, chunkZ);

    const group = new THREE.Group();
    const chunkOriginX = chunkX * UNITS_PER_CHUNK;
    const chunkOriginZ = chunkZ * UNITS_PER_CHUNK;
    group.position.set(chunkOriginX, 0, chunkOriginZ);

    // Build terrain
    const tileGeo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE).rotateX(-Math.PI / 2);
    const tiles = new THREE.InstancedMesh(tileGeo, this.materials.sand, CHUNK_GRID_SIZE * CHUNK_GRID_SIZE);
    tiles.name = 'landscape_tiles';
    tiles.userData.isLandscape = true;
    tiles.receiveShadow = true;
    
    const dirtMaterialIndex = 1; // Assuming sand is 0, dirt is 1 in a multi-material setup (or handle differently)
    const dummy = new THREE.Object3D();
    let i = 0;
    for (let x = 0; x < CHUNK_GRID_SIZE; x++) {
      for (let z = 0; z < CHUNK_GRID_SIZE; z++) {
        dummy.position.set(x * TILE_SIZE - UNITS_PER_CHUNK / 2 + 0.5, 0, z * TILE_SIZE - UNITS_PER_CHUNK / 2 + 0.5);
        dummy.updateMatrix();
        tiles.setMatrixAt(i++, dummy.matrix);
      }
    }
    // For simplicity, we'll just swap materials on a second mesh for dirt
    const dirtTiles = tiles.clone();
    dirtTiles.material = this.materials.dirt;
    group.add(tiles);
    // group.add(dirtTiles); // More complex logic needed to show only specific dirt tiles

    // Build objects
    if (chunkData.objects.length > 0 && this.rockTemplate) {
        const rocks = new THREE.InstancedMesh(this.rockTemplate.geometry, this.rockTemplate.material, chunkData.objects.length);
        rocks.castShadow = true;
        rocks.receiveShadow = true;
        
        chunkData.objects.forEach((obj, index) => {
            dummy.position.set(obj.x * TILE_SIZE - UNITS_PER_CHUNK / 2 + 0.5, 0, obj.z * TILE_SIZE - UNITS_PER_CHUNK / 2 + 0.5);
            dummy.rotation.y = obj.r;
            dummy.scale.setScalar(obj.s);
            dummy.updateMatrix();
            rocks.setMatrixAt(index, dummy.matrix);
        });
        group.add(rocks);
    }


    const chunk = {
      key, chunkX, chunkZ, group,
      show: () => scene.add(group),
      hide: () => scene.remove(group),
    };
    this.chunks.set(key, chunk);
    return chunk;
  }

  update(playerPosition, viewDistance) {
    const pCX = Math.floor((playerPosition.x + UNITS_PER_CHUNK * 0.5) / UNITS_PER_CHUNK);
    const pCZ = Math.floor((playerPosition.z + UNITS_PER_CHUNK * 0.5) / UNITS_PER_CHUNK);
    const required = new Set();
    for (let x = pCX - viewDistance; x <= pCX + viewDistance; x++) {
      for (let z = pCZ - viewDistance; z <= pCZ + viewDistance; z++) {
        const key = this.getChunkKey(x, z);
        required.add(key);
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
    for (const [key, chunk] of this.activeChunks.entries()) {
      if (!required.has(key)) {
        chunk.hide();
        this.activeChunks.delete(key);
      }
    }
  }

  // --- Pathfinding Helpers ---
  getTileAt(worldPos) {
      const chunkX = Math.floor((worldPos.x + UNITS_PER_CHUNK * 0.5) / UNITS_PER_CHUNK);
      const chunkZ = Math.floor((worldPos.z + UNITS_PER_CHUNK * 0.5) / UNITS_PER_CHUNK);
      const localX = Math.floor(worldPos.x - chunkX * UNITS_PER_CHUNK + UNITS_PER_CHUNK / 2);
      const localZ = Math.floor(worldPos.z - chunkZ * UNITS_PER_CHUNK + UNITS_PER_CHUNK / 2);

      if (localX < 0 || localX >= CHUNK_GRID_SIZE || localZ < 0 || localZ >= CHUNK_GRID_SIZE) return null;

      const centerX = chunkX * UNITS_PER_CHUNK + localX * TILE_SIZE - UNITS_PER_CHUNK / 2 + 0.5;
      const centerZ = chunkZ * UNITS_PER_CHUNK + localZ * TILE_SIZE - UNITS_PER_CHUNK / 2 + 0.5;

      return {
          chunkX, chunkZ, localX, localZ, isWalkable: true,
          center: new THREE.Vector3(centerX, 0, centerZ)
      };
  }

  getNeighbors8(tile) {
      const neighbors = [];
      for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
              if (dx === 0 && dz === 0) continue;
              const neighborWorldPos = new THREE.Vector3(tile.center.x + dx, 0, tile.center.z + dz);
              const neighborTile = this.getTileAt(neighborWorldPos);
              if (neighborTile) neighbors.push(neighborTile);
          }
      }
      return neighbors;
  }
}
