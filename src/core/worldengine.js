// file: src/core/worldengine.js
import * as THREE from 'three';
import Viewport from './viewport.js';
import Camera, { CameraController } from './camera.js';
import Lighting from './lighting.js';
import Character from './logic/character.js';
import CharacterMovement from './logic/charactermovement.js';
import Desert from '../world/chunks/desert.js';
import Sky from '../world/assets/sky/sky.js';
import { register as registerMining } from '../world/chunks/miningarea.js';

export default class WorldEngine {
  constructor(scene, {
    CHUNK_SIZE = 50,
    TILE_SIZE = 10,
    ACTIVE_HALF = 50,
    PRELOAD_RING_TILES = 5
  } = {}) {
    this.scene = scene;

    this.group = new THREE.Group();
    this.group.name = 'LandscapeTiles';
    this.scene.add(this.group);

    this.entities = new THREE.Group();
    this.entities.name = 'WorldEntities';
    this.scene.add(this.entities);

    this.CHUNK_SIZE = CHUNK_SIZE;
    this.TILE_SIZE = TILE_SIZE;
    this.TILES_PER_CHUNK = Math.floor(CHUNK_SIZE / TILE_SIZE);

    this.ACTIVE_HALF = ACTIVE_HALF;
    this.PRELOAD_HALF = ACTIVE_HALF + PRELOAD_RING_TILES * TILE_SIZE;

    this.chunks = new Map();
    this.tiles = [];
    this._tileMap = new Map(); // ✨ NEW: For quick lookup of tiles by grid coordinates
    this._materials = new Map();
    this._kindSpawners = new Map();

    this._tileGeo = new THREE.PlaneGeometry(this.TILE_SIZE, this.TILE_SIZE);
    this._tileGeo.rotateX(-Math.PI / 2);
  }

  registerChunk(kind, cx, cz) { this.chunks.set(`${cx},${cz}`, { kind, cx, cz }); }
  registerKindSpawner(kind, fn) {
    const arr = this._kindSpawners.get(kind) || [];
    arr.push(fn);
    this._kindSpawners.set(kind, arr);
  }

  buildTiles() {
    this.tiles = [];
    this._tileMap.clear();
    let globalGridX = 0;

    // Sort chunks to build grid consistently
    const sortedChunks = [...this.chunks.values()].sort((a,b) => (a.cz * 1000 + a.cx) - (b.cz * 1000 + b.cx));

    for (const { kind, cx, cz } of sortedChunks) {
      const originX = cx * this.CHUNK_SIZE;
      const originZ = cz * this.CHUNK_SIZE;
      const half = this.CHUNK_SIZE * 0.5;

      for (let tz = 0; tz < this.TILES_PER_CHUNK; tz++) {
        for (let tx = 0; tx < this.TILES_PER_CHUNK; tx++) {
          const worldX = originX - half + (tx + 0.5) * this.TILE_SIZE;
          const worldZ = originZ - half + (tz + 0.5) * this.TILE_SIZE;
          
          // ✨ NEW: Unique grid coordinates for pathfinding
          const gridX = cx * this.TILES_PER_CHUNK + tx;
          const gridZ = cz * this.TILES_PER_CHUNK + tz;

          const tile = {
            kind, cx, cz, tx, tz, gridX, gridZ,
            center: new THREE.Vector3(worldX, 0, worldZ),
            mesh: null,
            state: 'none',
            isWalkable: true, // ✨ NEW: Property for pathfinding
          };

          this.tiles.push(tile);
          this._tileMap.set(`${gridX},${gridZ}`, tile);
        }
      }
    }
  }

  // ✨ NEW: Helper to get a tile from a world position
  getTileAt(worldPosition) {
    const gridX = Math.round((worldPosition.x / this.TILE_SIZE) - 0.5);
    const gridZ = Math.round((worldPosition.z / this.TILE_SIZE) - 0.5);
    return this._tileMap.get(`${gridX},${gridZ}`);
  }

  // ✨ NEW: Helper to get neighboring tiles for the pathfinder
  getNeighbors(tile) {
    const neighbors = [];
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]; // N, S, E, W
    for (const [dx, dz] of directions) {
      const neighbor = this._tileMap.get(`${tile.gridX + dx},${tile.gridZ + dz}`);
      if (neighbor) {
        neighbors.push(neighbor);
      }
    }
    return neighbors;
  }

  async spawnStaticContent() {
    const tasks = [];
    for (const { kind, cx, cz } of this.chunks.values()) {
      const spawners = this._kindSpawners.get(kind);
      if (!spawners?.length) continue;
      const center = new THREE.Vector3(cx * this.CHUNK_SIZE, 0, cz * this.CHUNK_SIZE);
      for (const fn of spawners) {
        const p = Promise.resolve(fn({ scene: this.entities, center, cx, cz, world: this }))
          .then((maybeGroup) => {
            if (maybeGroup?.isObject3D) this.entities.add(maybeGroup);
          })
          .catch((err) => console.warn(`[WorldEngine] spawner for kind '${kind}' failed:`, err));
        tasks.push(p);
      }
    }
    await Promise.allSettled(tasks);
  }

  getLandscapeProxy() { return { mesh: this.group }; }

  update(playerPos) {
    for (const t of this.tiles) {
      const dx = Math.abs(playerPos.x - t.center.x);
      const dz = Math.abs(playerPos.z - t.center.z);
      let desired = 'none';
      if (dx <= this.ACTIVE_HALF && dz <= this.ACTIVE_HALF) desired = 'active';
      else if (dx <= this.PRELOAD_HALF && dz <= this.PRELOAD_HALF) desired = 'preload';
      if (desired !== t.state) this._applyState(t, desired);
    }
  }

  _applyState(tile, desired) {
    if (desired === 'none') {
      if (tile.mesh) {
        this.group.remove(tile.mesh);
        tile.mesh.geometry?.dispose();
        tile.mesh = null;
      }
      tile.state = 'none';
      return;
    }
    if (!tile.mesh) {
      const mat = this._getMaterial(tile, desired);
      const mesh = new THREE.Mesh(this._tileGeo, mat);
      mesh.position.copy(tile.center);
      mesh.receiveShadow = true;
      mesh.userData.isLandscape = true;
      this.group.add(mesh);
      tile.mesh = mesh;
    }
    tile.mesh.material = this._getMaterial(tile, desired);
    tile.state = desired;
  }

  _getMaterial(tile, state) {
    const key = `${tile.kind}:${state}:${tile.isWalkable}`;
    if (this._materials.has(key)) return this._materials.get(key);
    
    let color = this._colorFor(tile.kind);
    // ✨ NEW: Visually distinguish unwalkable tiles (optional, for debugging)
    // if (!tile.isWalkable) {
    //   color = color.clone().lerp(new THREE.Color('red'), 0.25);
    // }
    
    let mat;
    if (state === 'active') {
      mat = new THREE.MeshStandardMaterial({ color, roughness: 1, metalness: 0 });
    } else {
      const c = color.clone().lerp(new THREE.Color('#999999'), 0.35);
      mat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55 });
    }
    this._materials.set(key, mat);
    return mat;
  }

  _colorFor(kind) {
    if (kind === 'desert' || kind === 'mining') return Desert.baseColor.clone();
    return Desert.baseColor.clone();
  }

  dispose() { /* ... unchanged ... */ }
}

/** Loader entrypoint */
export async function show({ rootId = 'game-root' } = {}) {
  // ... Root, View, Scene setup ... (unchanged)
  let root = document.getElementById(rootId);
  if (!root) { root = document.createElement('div'); root.id = rootId; document.body.appendChild(root); }
  const viewport = new Viewport({ root });
  viewport.setClearColor(0x0b0f14, 1);
  viewport.renderer.shadowMap.enabled = true;
  viewport.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const lighting = new Lighting(scene);
  const sky = new Sky(scene, lighting);
  const camera = new Camera();
  viewport.setScene(scene);
  viewport.setCamera(camera.threeCamera);
  viewport.start();
  const orbitController = new CameraController(viewport.domElement, camera);

  // World + chunks
  const world = new WorldEngine(scene, { TILE_SIZE: 10 });

  // Register chunks
  world.registerChunk('mining', 0, 0);
  world.registerChunk('desert',  1,  0);
  world.registerChunk('desert', -1,  0);
  world.registerChunk('desert',  0,  1);
  world.registerChunk('desert',  0, -1);
  
  // Let the mining chunk register its content
  registerMining(world);

  world.buildTiles();
  await world.spawnStaticContent();

  // Character
  // ✨ UPDATED: Character constructor no longer needs the entities group.
  const character = new Character(scene);
  await character.init(new THREE.Vector3(0, 0, 2));
  camera.setTarget(character.object);
  camera.handleResize();

  // Tap-to-move controller
  // ✨ UPDATED: Pass the `world` instance to the movement controller for pathfinding.
  const movement = new CharacterMovement(
    viewport.domElement,
    { scene },
    camera,
    character,
    world.getLandscapeProxy(),
    world // Pass world
  );

  // Tile LOD updates
  const step = () => {
    if (character.object) world.update(character.object.position);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);

  window.addEventListener('resize', () => camera.handleResize(), { passive: true });
  window.Dustborne = Object.assign(window.Dustborne || {}, { world, movement });
  console.log('WorldEngine: Initialized with pathfinding.');
}
