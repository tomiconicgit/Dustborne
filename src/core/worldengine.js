// file: src/core/worldengine.js
import * as THREE from 'three';
import Viewport from './viewport.js';
import Camera, { CameraController } from './camera.js';
import Lighting from './lighting.js';
import Character from './logic/character.js';
import CharacterMovement from './logic/charactermovement.js';
import Desert from '../world/chunks/desert.js';
import Sky from '../world/assets/sky/sky.js';

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

    this.CHUNK_SIZE = CHUNK_SIZE;
    this.TILE_SIZE = TILE_SIZE;
    this.TILES_PER_CHUNK = Math.floor(CHUNK_SIZE / TILE_SIZE);

    this.ACTIVE_HALF = ACTIVE_HALF;
    this.PRELOAD_HALF = ACTIVE_HALF + PRELOAD_RING_TILES * TILE_SIZE;

    this.chunks = new Map();
    this.tiles = [];
    this._materials = new Map();

    this._tileGeo = new THREE.PlaneGeometry(this.TILE_SIZE, this.TILE_SIZE);
    this._tileGeo.rotateX(-Math.PI / 2);
  }

  registerChunk(kind, cx, cz) { this.chunks.set(`${cx},${cz}`, { kind, cx, cz }); }

  buildTiles() {
    this.tiles = [];
    for (const { kind, cx, cz } of this.chunks.values()) {
      const originX = cx * this.CHUNK_SIZE;
      const originZ = cz * this.CHUNK_SIZE;
      const half = this.CHUNK_SIZE * 0.5;

      for (let tz = 0; tz < this.TILES_PER_CHUNK; tz++) {
        for (let tx = 0; tx < this.TILES_PER_CHUNK; tx++) {
          const cxWorld = originX - half + (tx + 0.5) * this.TILE_SIZE;
          const czWorld = originZ - half + (tz + 0.5) * this.TILE_SIZE;
          this.tiles.push({
            kind, cx, cz, tx, tz,
            center: new THREE.Vector3(cxWorld, 0, czWorld),
            mesh: null,
            state: 'none'
          });
        }
      }
    }
  }

  getLandscapeProxy() { return { mesh: this.group }; }

  update(playerPos) {
    const px = playerPos.x, pz = playerPos.z;
    for (const t of this.tiles) {
      const dx = Math.abs(px - t.center.x);
      const dz = Math.abs(pz - t.center.z);
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
      const mat = this._getMaterial(tile.kind, desired);
      const mesh = new THREE.Mesh(this._tileGeo.clone(), mat);
      mesh.position.copy(tile.center);
      mesh.receiveShadow = true;
      mesh.userData.isLandscape = true;
      this.group.add(mesh);
      tile.mesh = mesh;
      tile.state = desired;
      return;
    }

    tile.mesh.material = this._getMaterial(tile.kind, desired);
    tile.state = desired;
  }

  _getMaterial(kind, state) {
    const key = `${kind}:${state}`;
    if (this._materials.has(key)) return this._materials.get(key);

    const color = this._colorFor(kind);
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
    // Mining floor uses same color as desert
    if (kind === 'desert' || kind === 'mining') return Desert.baseColor.clone();
    return Desert.baseColor.clone();
  }

  dispose() {
    for (const t of this.tiles) {
      if (t.mesh) { this.group.remove(t.mesh); t.mesh.geometry?.dispose(); }
    }
    this.tiles.length = 0;
    for (const m of this._materials.values()) m.dispose?.();
    this._materials.clear();
    this._tileGeo.dispose();
    this.scene.remove(this.group);
  }
}

/** Loader entrypoint */
export async function show({ rootId = 'game-root' } = {}) {
  // Root
  let root = document.getElementById(rootId);
  if (!root) { root = document.createElement('div'); root.id = rootId; document.body.appendChild(root); }

  // View
  const viewport = new Viewport({ root });
  viewport.setClearColor(0x0b0f14, 1);
  viewport.renderer.shadowMap.enabled = true;
  viewport.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Scene + lighting + sky
  const scene = new THREE.Scene();
  const lighting = new Lighting(scene);
  const sky = new Sky(scene, lighting); // ← added

  // Camera + orbit
  const camera = new Camera();
  viewport.setScene(scene);
  viewport.setCamera(camera.threeCamera);
  viewport.start();
  const orbitController = new CameraController(viewport.domElement, camera);

  // World + chunks (mining center + desert ring)
  const world = new WorldEngine(scene, {
    CHUNK_SIZE: 50, TILE_SIZE: 10, ACTIVE_HALF: 50, PRELOAD_RING_TILES: 5
  });
  world.registerChunk('mining', 0, 0);
  world.registerChunk('desert',  1,  0);
  world.registerChunk('desert', -1,  0);
  world.registerChunk('desert',  0,  1);
  world.registerChunk('desert',  0, -1);
  world.registerChunk('desert',  1,  1);
  world.registerChunk('desert',  1, -1);
  world.registerChunk('desert', -1,  1);
  world.registerChunk('desert', -1, -1);
  world.buildTiles();

  // Character
  const character = new Character(scene);
  await character.init(new THREE.Vector3(0, 0, 2));
  camera.setTarget(character.object);
  camera.handleResize();

  // Tap-to-move
  const movement = new CharacterMovement(
    viewport.domElement,
    { scene },
    camera,
    character,
    world.getLandscapeProxy()
  );

  // Tile LOD updates around character
  const step = () => {
    if (character.object) world.update(character.object.position);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);

  // Resize
  window.addEventListener('resize', () => camera.handleResize(), { passive: true });

  // Debug
  window.Dustborne = Object.assign(window.Dustborne || {}, {
    viewport, scene, lighting, sky, camera, orbitController, world, character, movement
  });

  console.log('WorldEngine booted with Sky.');
}