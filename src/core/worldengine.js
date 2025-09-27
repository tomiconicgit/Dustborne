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
    this.CHUNK_GRID_SIZE = DUSTBORNE_CHUNK_SIZE; // tiles per chunk (32)
    this.UNITS_PER_CHUNK = this.CHUNK_GRID_SIZE * this.TILE_SIZE;

    this.chunks = new Map();       // all created chunks
    this.activeChunks = new Map(); // visible/live chunks
    this.viewDistance = 2;         // 5x5 around player

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

    const chunk = new Chunk(this.scene, this, chunkX, chunkZ);
    this.chunks.set(key, chunk);

    // Populate special content for origin chunk
    if (chunkX === 0 && chunkZ === 0) registerMining(chunk);

    await chunk.build();
    return chunk;
  }

  update(playerPosition) {
    const uPerChunk = this.UNITS_PER_CHUNK;
    const pCX = Math.floor((playerPosition.x + uPerChunk * 0.5) / uPerChunk);
    const pCZ = Math.floor((playerPosition.z + uPerChunk * 0.5) / uPerChunk);

    const required = new Map();
    for (let x = pCX - this.viewDistance; x <= pCX + this.viewDistance; x++) {
      for (let z = pCZ - this.viewDistance; z <= pCZ + this.viewDistance; z++) {
        required.set(this.getChunkKey(x, z), { x, z });
      }
    }

    // Hide stale
    for (const [key, chunk] of this.activeChunks.entries()) {
      if (!required.has(key)) {
        chunk.hide();
        this.activeChunks.delete(key);
      }
    }

    // Show/create new
    for (const [key, { x, z }] of required.entries()) {
      if (!this.activeChunks.has(key)) {
        this.getChunk(x, z).then(chunk => {
          if (!this.activeChunks.has(key)) {
            chunk.show();
            this.activeChunks.set(key, chunk);
          }
        });
      }
    }
  }

  getTileAt(worldPos) {
    const uPerChunk = this.UNITS_PER_CHUNK;
    const cX = Math.floor((worldPos.x + uPerChunk * 0.5) / uPerChunk);
    const cZ = Math.floor((worldPos.z + uPerChunk * 0.5) / uPerChunk);
    const chunk = this.chunks.get(this.getChunkKey(cX, cZ));
    return chunk ? chunk.getTileAt(worldPos) : null;
  }

  getNeighbors8(tile) {
    if (!tile) return [];
    const neighbors = [];
    const step = this.TILE_SIZE;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        if (dx === 0 && dz === 0) continue;

        const neighborPos = tile.center.clone().add(new THREE.Vector3(dx * step, 0, dz * step));
        const neighbor = this.getTileAt(neighborPos);
        if (!neighbor || !neighbor.isWalkable) continue;

        // Prevent cutting corners through blocked tiles on diagonals
        if (dx !== 0 && dz !== 0) {
          const sideA = this.getTileAt(tile.center.clone().add(new THREE.Vector3(dx * step, 0, 0)));
          const sideB = this.getTileAt(tile.center.clone().add(new THREE.Vector3(0, 0, dz * step)));
          if (!sideA?.isWalkable || !sideB?.isWalkable) continue;
        }
        neighbors.push(neighbor);
      }
    }
    return neighbors;
  }
}

export async function prewarm() {
  const scene = new THREE.Scene();
  const lighting = new Lighting(scene);
  new Sky(scene, lighting);

  const camera = new Camera();
  const world = new WorldEngine(scene);

  const character = new Character(scene);
  await character.init(new THREE.Vector3(0, 0, 2));
  camera.setTarget(character.object);

  // Pre-create the initial visible grid
  const uPerChunk = world.UNITS_PER_CHUNK;
  const pCX = Math.floor((character.object.position.x + uPerChunk * 0.5) / uPerChunk);
  const pCZ = Math.floor((character.object.position.z + uPerChunk * 0.5) / uPerChunk);

  const jobs = [];
  for (let x = pCX - world.viewDistance; x <= pCX + world.viewDistance; x++) {
    for (let z = pCZ - world.viewDistance; z <= pCZ + world.viewDistance; z++) {
      jobs.push(world.getChunk(x, z));
    }
  }
  await Promise.all(jobs);
  world.update(character.object.position);

  return { scene, camera, world, character };
}

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

  const movement = new CharacterMovement(viewport.domElement, { scene }, camera, character, world);
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

  // expose for quick inspection
  window.Dustborne = Object.assign(window.Dustborne || {}, { world, movement, devtools, scene, camera, viewport });
}