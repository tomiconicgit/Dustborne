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

// UI
import Navbar from './ui/navbar.js';
import InventoryPanel from './ui/inventory.js';

class WorldEngine { /* ... UNCHANGED ... */ }

export async function prewarm() {
  const scene = new THREE.Scene();
  new Lighting(scene);
  const camera = new Camera();
  const world = new WorldEngine(scene);
  new Sky(scene);

  // Use the static prewarm method on the Character class
  const character = await Character.prewarm(scene);

  const jobs = [];
  for (let x = -world.viewDistance; x <= world.viewDistance; x++) {
    for (let z = -world.viewDistance; z <= world.viewDistance; z++) {
      jobs.push(world.getChunk(x, z));
    }
  }
  await Promise.all(jobs);

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
  const devtools = new DevTools(scene, world, root);

  // Use the static create method on the CharacterMovement class
  CharacterMovement.create(viewport.domElement, camera, world, character);
  
  // --- UI and main loop are unchanged ---
  let activeTab = 'inventory';
  const inventory = new InventoryPanel({ parent: document.body });
  const handleTabClick = (tabName) => { if (activeTab === tabName) return; activeTab = tabName; navbar.setActive(tabName); if (tabName === 'inventory') { inventory.open(); } else { inventory.close(); } };
  const navbar = new Navbar({ parent: document.body, hooks: { onInventory: () => handleTabClick('inventory'), onSkills: () => handleTabClick('skills'), onMissions: () => handleTabClick('missions'), onMap: () => handleTabClick('map'), } });
  navbar.setActive('inventory');
  inventory.attachToNavbar(navbar);

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

  window.Dustborne = Object.assign(window.Dustborne || {}, {
    world, devtools, scene, camera, viewport,
    ui: { navbar, inventory }
  });
}

// PASTE THE UNCHANGED WorldEngine CLASS HERE
/*
class WorldEngine { constructor(scene) { this.scene = scene; this.TILE_SIZE = 1; this.CHUNK_GRID_SIZE = DUSTBORNE_CHUNK_SIZE; this.UNITS_PER_CHUNK = this.CHUNK_GRID_SIZE * this.TILE_SIZE; this.chunks = new Map(); this.activeChunks = new Map(); this.viewDistance = 2; this.sharedTileGeo = new THREE.PlaneGeometry(this.TILE_SIZE, this.TILE_SIZE).rotateX(-Math.PI / 2); this.materials = { sand: new THREE.MeshStandardMaterial({ color: '#C2B280', roughness: 1, metalness: 0 }), dirt: new THREE.MeshStandardMaterial({ color: '#8b5a2b', roughness: 1, metalness: 0 }), }; } getChunkKey(chunkX, chunkZ) { return `${chunkX},${chunkZ}`; } async getChunk(chunkX, chunkZ) { const key = this.getChunkKey(chunkX, chunkZ); if (this.chunks.has(key)) return this.chunks.get(key); const chunk = new Chunk(this.scene, this, chunkX, chunkZ); this.chunks.set(key, chunk); if (chunkX === 0 && chunkZ === 0) registerMining(chunk); await chunk.build(); return chunk; } update(playerPosition) { const uPerChunk = this.UNITS_PER_CHUNK; const pCX = Math.floor((playerPosition.x + uPerChunk * 0.5) / uPerChunk); const pCZ = Math.floor((playerPosition.z + uPerChunk * 0.5) / uPerChunk); const required = new Map(); for (let x = pCX - this.viewDistance; x <= pCX + this.viewDistance; x++) { for (let z = pCZ - this.viewDistance; z <= pCZ + this.viewDistance; z++) { required.set(this.getChunkKey(x, z), { x, z }); } } for (const [key, chunk] of this.activeChunks.entries()) { if (!required.has(key)) { chunk.hide(); this.activeChunks.delete(key); } } for (const [key, { x, z }] of required.entries()) { if (!this.activeChunks.has(key)) { this.getChunk(x, z).then(chunk => { if (!this.activeChunks.has(key)) { chunk.show(); this.activeChunks.set(key, chunk); } }); } } } getTileAt(worldPos) { const uPerChunk = this.UNITS_PER_CHUNK; const cX = Math.floor((worldPos.x + uPerChunk * 0.5) / uPerChunk); const cZ = Math.floor((worldPos.z + uPerChunk * 0.5) / uPerChunk); const chunk = this.chunks.get(this.getChunkKey(cX, cZ)); return chunk ? chunk.getTileAt(worldPos) : null; } getNeighbors8(tile) { if (!tile) return []; const neighbors = []; const step = this.TILE_SIZE; for (let dx = -1; dx <= 1; dx++) { for (let dz = -1; dz <= 1; dz++) { if (dx === 0 && dz === 0) continue; const neighborPos = tile.center.clone().add(new THREE.Vector3(dx * step, 0, dz * step)); const neighbor = this.getTileAt(neighborPos); if (!neighbor || !neighbor.isWalkable) continue; if (dx !== 0 && dz !== 0) { const sideA = this.getTileAt(tile.center.clone().add(new THREE.Vector3(dx * step, 0, 0))); const sideB = this.getTileAt(tile.center.clone().add(new THREE.Vector3(0, 0, dz * step))); if (!sideA?.isWalkable || !sideB?.isWalkable) continue; } neighbors.push(neighbor); } } return neighbors; } }
*/
