// file: src/core/worldengine.js
import * as THREE from 'three';
import Viewport from './viewport.js';
import Camera, { CameraController } from './camera.js';
import Lighting from './lighting.js';
import Character from './logic/character.js';
import CharacterMovement from './logic/charactermovement.js';
import Sky from '../world/assets/sky/sky.js';
import { register as registerMining } from '../world/chunks/miningarea.js';
import DevTools from './devtools.js';
import { Chunk, DUSTBORNE_CHUNK_SIZE } from './chunk.js';

class WorldEngine {
  constructor(scene) {
    this.scene = scene;
    this.TILE_SIZE = 1;
    this.CHUNK_GRID_SIZE = DUSTBORNE_CHUNK_SIZE;
    this.chunks = new Map();
    this.activeChunks = new Map();
    this.viewDistance = 2; // Render a 5x5 grid of chunks (2 in each direction from center)

    // Create shared resources for chunks to use
    this.sharedTileGeo = new THREE.PlaneGeometry(this.TILE_SIZE, this.TILE_SIZE).rotateX(-Math.PI / 2);
    this.sharedGroundMaterial = new THREE.MeshStandardMaterial({ color: '#C2B280', roughness: 1, metalness: 0 });
  }
  
  getChunkKey(chunkX, chunkZ) {
      return `${chunkX},${chunkZ}`;
  }

  async getChunk(chunkX, chunkZ) {
    const key = this.getChunkKey(chunkX, chunkZ);
    if (this.chunks.has(key)) {
      return this.chunks.get(key);
    }

    // Create a new chunk if it doesn't exist
    const chunk = new Chunk(this.scene, this, chunkX, chunkZ);
    this.chunks.set(key, chunk);

    // Apply content spawners based on chunk coordinates (biome logic)
    // Here we assume (0,0) is the mining area, others are desert
    if (chunkX === 0 && chunkZ === 0) {
        registerMining(chunk);
    }
    
    // Finalize the chunk's geometry and assets. This is async.
    await chunk.build();
    return chunk;
  }
  
  update(playerPosition) {
    const pCX = Math.floor(playerPosition.x / (this.CHUNK_GRID_SIZE * this.TILE_SIZE));
    const pCZ = Math.floor(playerPosition.z / (this.CHUNK_GRID_SIZE * this.TILE_SIZE));

    const requiredChunks = new Map();
    
    // Determine which chunks should be visible
    for (let x = pCX - this.viewDistance; x <= pCX + this.viewDistance; x++) {
      for (let z = pCZ - this.viewDistance; z <= pCZ + this.viewDistance; z++) {
        const key = this.getChunkKey(x, z);
        requiredChunks.set(key, {x, z});
      }
    }
    
    // Unload chunks that are no longer needed
    for (const [key, chunk] of this.activeChunks.entries()) {
        if (!requiredChunks.has(key)) {
            chunk.hide();
            this.activeChunks.delete(key);
        }
    }

    // Load new chunks
    for (const [key, {x, z}] of requiredChunks.entries()) {
        if (!this.activeChunks.has(key)) {
            this.getChunk(x, z).then(chunk => {
                chunk.show();
                this.activeChunks.set(key, chunk);
            });
        }
    }
  }

  getTileAt(worldPos) {
      const cX = Math.floor(worldPos.x / (this.CHUNK_GRID_SIZE * this.TILE_SIZE));
      const cZ = Math.floor(worldPos.z / (this.CHUNK_GRID_SIZE * this.TILE_SIZE));
      const key = this.getChunkKey(cX, cZ);
      const chunk = this.chunks.get(key);
      return chunk ? chunk.getTileAt(worldPos) : null;
  }
  
  getNeighbors8(tile) {
      if (!tile) return [];
      const neighbors = [];
      const centerPos = tile.center;
      
      for (let dx = -1; dx <= 1; dx++) {
          for (let dz = -1; dz <= 1; dz++) {
              if (dx === 0 && dz === 0) continue;
              
              const neighborPos = new THREE.Vector3(centerPos.x + dx * this.TILE_SIZE, 0, centerPos.z + dz * this.TILE_SIZE);
              const neighbor = this.getTileAt(neighborPos);

              if (neighbor && neighbor.isWalkable) {
                  // Prevent corner cutting
                  if (dx !== 0 && dz !== 0) {
                      const sideA = this.getTileAt(new THREE.Vector3(centerPos.x + dx * this.TILE_SIZE, 0, centerPos.z));
                      const sideB = this.getTileAt(new THREE.Vector3(centerPos.x, 0, centerPos.z + dz * this.TILE_SIZE));
                      if (!sideA?.isWalkable || !sideB?.isWalkable) continue;
                  }
                  neighbors.push(neighbor);
              }
          }
      }
      return neighbors;
  }
}

/** Pre-warms the world */
export async function prewarm() {
  const scene = new THREE.Scene();
  new Lighting(scene);
  new Sky(scene);
  const camera = new Camera();
  
  const world = new WorldEngine(scene);

  const character = new Character(scene);
  await character.init(new THREE.Vector3(0, 0, 2));
  
  camera.setTarget(character.object);
  
  // Pre-load the initial set of chunks around the player
  const pCX = Math.floor(character.object.position.x / (world.CHUNK_GRID_SIZE * world.TILE_SIZE));
  const pCZ = Math.floor(character.object.position.z / (world.CHUNK_GRID_SIZE * world.TILE_SIZE));
  for (let x = pCX - world.viewDistance; x <= pCX + world.viewDistance; x++) {
      for (let z = pCZ - world.viewDistance; z <= pCZ + world.viewDistance; z++) {
          await world.getChunk(x, z);
      }
  }

  return { scene, camera, world, character };
}

/** The final entrypoint */
export function show({ rootId = 'game-root', prewarmedState }) {
  const { scene, camera, world, character } = prewarmedState;

  let root = document.getElementById(rootId) || document.createElement('div');
  root.id = rootId;
  document.body.appendChild(root);

  const viewport = new Viewport({ root });
  viewport.setClearColor(0x0b0f14, 1);
  viewport.renderer.shadowMap.enabled = true;
  viewport.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  viewport.setScene(scene);
  viewport.setCamera(camera.threeCamera);
  viewport.start();

  new CameraController(viewport.domElement, camera);
  const movement = new CharacterMovement(viewport.domElement, { scene }, camera, character, null, world);
  const devtools = new DevTools(scene, world, root);
  
  const step = () => {
    if (character.object) {
      world.update(character.object.position);
      devtools.update(character.object.position);
    }
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);

  const onResize = () => { camera.handleResize(); viewport._resize(); };
  window.addEventListener('resize', onResize, { passive: true });
  onResize();

  window.Dustborne = Object.assign(window.Dustborne || {}, { world, movement, devtools, scene, camera, viewport });
  console.log('Dustborne game started with chunk-based architecture.');
}
