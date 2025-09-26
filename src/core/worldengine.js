// file: src/core/worldengine.js
import * as THREE from 'three';
import Desert from '../world/chunks/desert.js';

export default class WorldEngine {
  constructor(scene, {
    CHUNK_SIZE = 50,
    TILE_SIZE = 10,
    ACTIVE_HALF = 50,          // 100x100 active area around player
    PRELOAD_RING_TILES = 5     // 5-tile ring beyond active area
  } = {}) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'LandscapeTiles';
    this.scene.add(this.group);

    // geometry/tiling
    this.CHUNK_SIZE = CHUNK_SIZE;
    this.TILE_SIZE = TILE_SIZE;
    this.TILES_PER_CHUNK = Math.floor(CHUNK_SIZE / TILE_SIZE);

    // ranges (half-sizes)
    this.ACTIVE_HALF = ACTIVE_HALF;                                        // 50
    this.PRELOAD_HALF = ACTIVE_HALF + PRELOAD_RING_TILES * TILE_SIZE;      // 100

    // registries
    this.chunks = new Map();   // key "cx,cz" -> { kind, cx, cz }
    this.tiles = [];           // [{kind,cx,cz,tx,tz,center,mesh,state}]
    this._materials = new Map();

    // shared plane geometry for tiles
    this._tileGeo = new THREE.PlaneGeometry(this.TILE_SIZE, this.TILE_SIZE);
    this._tileGeo.rotateX(-Math.PI / 2);
  }

  registerChunk(kind, cx, cz) {
    this.chunks.set(`${cx},${cz}`, { kind, cx, cz });
  }

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
            state: 'none' // 'active' | 'preload' | 'none'
          });
        }
      }
    }
  }

  getLandscapeProxy() {
    // lets input controllers raycast against terrain
    return { mesh: this.group };
  }

  update(playerPos) {
    const px = playerPos.x;
    const pz = playerPos.z;

    for (const t of this.tiles) {
      const dx = Math.abs(px - t.center.x);
      const dz = Math.abs(pz - t.center.z);

      let desired = 'none';
      if (dx <= this.ACTIVE_HALF && dz <= this.ACTIVE_HALF) {
        desired = 'active';
      } else if (dx <= this.PRELOAD_HALF && dz <= this.PRELOAD_HALF) {
        desired = 'preload';
      }

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
      // preload “blur placeholder”: muted & semi-transparent
      const c = color.clone().lerp(new THREE.Color('#999999'), 0.35);
      mat = new THREE.MeshBasicMaterial({ color: c, transparent: true, opacity: 0.55 });
    }
    this._materials.set(key, mat);
    return mat;
  }

  _colorFor(kind) {
    // Make mining use the SAME color as desert
    if (kind === 'desert' || kind === 'mining') return Desert.baseColor.clone();
    // fallback
    return Desert.baseColor.clone();
  }

  dispose() {
    for (const t of this.tiles) {
      if (t.mesh) {
        this.group.remove(t.mesh);
        t.mesh.geometry?.dispose();
      }
    }
    this.tiles.length = 0;
    for (const m of this._materials.values()) m.dispose?.();
    this._materials.clear();
    this._tileGeo.dispose();
    this.scene.remove(this.group);
  }
}