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
import DevTools from './devtools.js';

export default class WorldEngine {
  constructor(scene, {
    CHUNK_SIZE = 50,     // world units per chunk (square)
    TILE_SIZE  = 1,      // world units per tile (1×1)
    ACTIVE_HALF = 50,    // active LOD radius
    PRELOAD_RING_TILES = 5
  } = {}) {
    this.scene = scene;

    // Terrain tiles parent
    this.group = new THREE.Group();
    this.group.name = 'LandscapeTiles';
    this.scene.add(this.group);

    // Entities (rocks, props, etc.)
    this.entities = new THREE.Group();
    this.entities.name = 'WorldEntities';
    this.scene.add(this.entities);

    this.CHUNK_SIZE = CHUNK_SIZE;
    this.TILE_SIZE = TILE_SIZE;
    this.TILES_PER_CHUNK = Math.floor(CHUNK_SIZE / TILE_SIZE);

    this.ACTIVE_HALF = ACTIVE_HALF;
    this.PRELOAD_HALF = ACTIVE_HALF + PRELOAD_RING_TILES * TILE_SIZE;

    this.chunks = new Map();     // key: "cx,cz" -> { kind, cx, cz }
    this.tiles = [];             // flat list of tile records
    this._tileMap = new Map();   // key: "gridX,gridZ" -> tile
    this._materials = new Map(); // cache of tile materials
    this._kindSpawners = new Map();

    // Shared plane for tiles (rotated to lie flat)
    this._tileGeo = new THREE.PlaneGeometry(this.TILE_SIZE, this.TILE_SIZE);
    this._tileGeo.rotateX(-Math.PI / 2);
  }

  registerChunk(kind, cx, cz) {
    this.chunks.set(`${cx},${cz}`, { kind, cx, cz });
  }

  registerKindSpawner(kind, fn) {
    const arr = this._kindSpawners.get(kind) || [];
    arr.push(fn);
    this._kindSpawners.set(kind, arr);
  }

  buildTiles() {
    this.tiles = [];
    this._tileMap.clear();

    const sorted = [...this.chunks.values()].sort(
      (a, b) => (a.cz * 1000 + a.cx) - (b.cz * 1000 + b.cx)
    );

    for (const { kind, cx, cz } of sorted) {
      const originX = cx * this.CHUNK_SIZE;
      const originZ = cz * this.CHUNK_SIZE;
      const half = this.CHUNK_SIZE * 0.5;

      for (let tz = 0; tz < this.TILES_PER_CHUNK; tz++) {
        for (let tx = 0; tx < this.TILES_PER_CHUNK; tx++) {
          const worldX = originX - half + (tx + 0.5) * this.TILE_SIZE;
          const worldZ = originZ - half + (tz + 0.5) * this.TILE_SIZE;

          const gridX = cx * this.TILES_PER_CHUNK + tx;
          const gridZ = cz * this.TILES_PER_CHUNK + tz;

          const tile = {
            kind, cx, cz, tx, tz, gridX, gridZ,
            center: new THREE.Vector3(worldX, 0, worldZ),
            mesh: null,
            state: 'none',
            isWalkable: true,
            userData: {} // flags (e.g., { isDirt: true })
          };

          this.tiles.push(tile);
          this._tileMap.set(`${gridX},${gridZ}`, tile);
        }
      }
    }
  }

  /** World position -> tile (aligned with buildTiles centers) */
  getTileAt(worldPosition) {
    const off = (this.TILES_PER_CHUNK / 2) - 0.5; // e.g., 24.5 for 50 tiles
    const gridX = Math.round((worldPosition.x / this.TILE_SIZE) + off);
    const gridZ = Math.round((worldPosition.z / this.TILE_SIZE) + off);
    return this._tileMap.get(`${gridX},${gridZ}`);
  }

  /** 4-way neighbors (N,S,E,W) */
  getNeighbors(tile) {
    const res = [];
    const dirs = [[0,1],[0,-1],[1,0],[-1,0]];
    for (const [dx, dz] of dirs) {
      const n = this._tileMap.get(`${tile.gridX + dx},${tile.gridZ + dz}`);
      if (n) res.push(n);
    }
    return res;
  }

  /** 8-way neighbors with anti corner-cutting (for diagonal movement) */
  getNeighbors8(tile) {
    const res = [];
    const { gridX: x, gridZ: z } = tile;
    const dirs = [
      [ 1,  0], [-1,  0], [ 0,  1], [ 0, -1],
      [ 1,  1], [ 1, -1], [-1,  1], [-1, -1]
    ];
    for (const [dx, dz] of dirs) {
      const n = this._tileMap.get(`${x + dx},${z + dz}`);
      if (!n || !n.isWalkable) continue;
      // block diagonal cut if either adjacent cardinal is blocked
      if (dx !== 0 && dz !== 0) {
        const a = this._tileMap.get(`${x + dx},${z}`);
        const b = this._tileMap.get(`${x},${z + dz}`);
        if (!a?.isWalkable || !b?.isWalkable) continue;
      }
      res.push(n);
    }
    return res;
  }

  async spawnStaticContent() {
    const tasks = [];
    for (const { kind, cx, cz } of this.chunks.values()) {
      const spawners = this._kindSpawners.get(kind);
      if (!spawners?.length) continue;
      const center = new THREE.Vector3(cx * this.CHUNK_SIZE, 0, cz * this.CHUNK_SIZE);
      for (const fn of spawners) {
        const p = Promise
          .resolve(fn({ scene: this.entities, center, cx, cz, world: this }))
          .then((maybeGroup) => { if (maybeGroup?.isObject3D) this.entities.add(maybeGroup); })
          .catch((err) => console.warn(`[WorldEngine] spawner '${kind}' failed:`, err));
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
    const key = `${tile.kind}:${state}:${tile.isWalkable}:${tile.userData.isDirt?1:0}`;
    if (this._materials.has(key)) return this._materials.get(key);

    const color = this._colorFor(tile);
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

  _colorFor(tile) {
    const sand = Desert.baseColor.clone();       // sandy beige
    const dirt = new THREE.Color('#8b5a2b');    // normal brown
    if (tile.userData?.isDirt) return dirt;
    return sand;
  }

  dispose() {
    // optional cleanup if you ever destroy the world
  }
}

/** Loader entrypoint */
export async function show({ rootId = 'game-root' } = {}) {
  // root mount
  let root = document.getElementById(rootId);
  if (!root) {
    root = document.createElement('div');
    root.id = rootId;
    document.body.appendChild(root);
  }

  // viewport / renderer
  const viewport = new Viewport({ root });
  viewport.setClearColor(0x0b0f14, 1);
  viewport.renderer.shadowMap.enabled = true;
  viewport.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // scene, sky, lighting
  const scene = new THREE.Scene();
  const lighting = new Lighting(scene);
  const sky = new Sky(scene, lighting);

  // camera
  const camera = new Camera();
  viewport.setScene(scene);
  viewport.setCamera(camera.threeCamera);
  viewport.start();
  const orbitController = new CameraController(viewport.domElement, camera);

  // world (1×1 tiles)
  const world = new WorldEngine(scene, { TILE_SIZE: 1 });

  // chunks
  world.registerChunk('mining', 0, 0);
  world.registerChunk('desert',  1,  0);
  world.registerChunk('desert', -1,  0);
  world.registerChunk('desert',  0,  1);
  world.registerChunk('desert',  0, -1);

  // mining spawner: marks 20×20 dirt & places 6 spaced rocks
  registerMining(world);

  world.buildTiles();
  await world.spawnStaticContent();

  // character
  const character = new Character(scene);
  await character.init(new THREE.Vector3(0, 0, 2));
  camera.setTarget(character.object);
  camera.handleResize();

  // tap-to-move (8-way A* handled in pathfinder)
  const movement = new CharacterMovement(
    viewport.domElement,
    { scene },
    camera,
    character,
    world.getLandscapeProxy(),
    world
  );

  // dev tools (grid toggle button)
  const devtools = new DevTools(scene, world, document.getElementById('game-root') || document.body);
  devtools.build();

  // LOD updates
  const step = () => {
    if (character.object) world.update(character.object.position);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);

  // resize
  window.addEventListener('resize', () => camera.handleResize(), { passive: true });

  // expose for console
  window.Dustborne = Object.assign(window.Dustborne || {}, { world, movement, devtools, scene, camera, viewport });
  console.log('WorldEngine: 50×50 @1, 20×20 dirt, 6 spaced rocks, 8-way pathfinding, dev grid toggle.');
}