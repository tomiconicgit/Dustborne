// file: src/core/chunk.js
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getRockTemplate } from '../world/assets/rocks/copperore.js';

const CHUNK_SIZE = 32; // tiles per side

export class Chunk {
  constructor(scene, world, chunkX, chunkZ) {
    this.scene = scene;
    this.world = world;
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.tileSize = world.TILE_SIZE;

    this.group = new THREE.Group();
    this.group.name = `Chunk(${chunkX},${chunkZ})`;

    this.tiles = [];
    this._tileMap = new Map();
    this.rockData = [];

    this._generateTiles();
  }

  _generateTiles() {
    const originX = this.chunkX * CHUNK_SIZE * this.tileSize;
    const originZ = this.chunkZ * CHUNK_SIZE * this.tileSize;

    for (let tz = 0; tz < CHUNK_SIZE; tz++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const worldX = originX + (tx - CHUNK_SIZE / 2 + 0.5) * this.tileSize;
        const worldZ = originZ + (tz - CHUNK_SIZE / 2 + 0.5) * this.tileSize;
        const tile = {
          chunk: this,
          localX: tx,
          localZ: tz,
          center: new THREE.Vector3(worldX, 0, worldZ),
          isWalkable: true,
          userData: {},
        };
        this.tiles.push(tile);
        this._tileMap.set(`${tx},${tz}`, tile);
      }
    }
  }

  /**
   * Add a rock instance on a tile with optional authored per-instance Y offset.
   * @param {number} localX
   * @param {number} localZ
   * @param {number} scale        default 1.0
   * @param {number} rotation     radians, yaw around Y
   * @param {number} yOffset      extra Y offset (meters) from your editor (default 0)
   */
  addRock(localX, localZ, scale = 1.0, rotation = 0, yOffset = 0) {
    const tile = this._tileMap.get(`${localX},${localZ}`);
    if (tile) {
      tile.isWalkable = false; // obstacle for pathfinder
      this.rockData.push({ position: tile.center, scale, rotation, yOffset });
    }
  }

  async build() {
    // Ground: merge per material
    const buckets = { sand: [], dirt: [] };
    for (const tile of this.tiles) {
      const g = this.world.sharedTileGeo.clone();
      g.translate(tile.center.x, tile.center.y, tile.center.z);
      (tile.userData.isDirt ? buckets.dirt : buckets.sand).push(g);
    }

    for (const key in buckets) {
      const list = buckets[key];
      if (!list.length) continue;
      const merged = mergeGeometries(list);
      const mat = this.world.materials[key];
      const mesh = new THREE.Mesh(merged, mat);
      mesh.receiveShadow = true;
      mesh.userData.isLandscape = true; // raycast filter for taps
      this.group.add(mesh);
    }

    // Rocks via InstancedMesh, preserving authored local transform AND per-instance yOffset
    if (this.rockData.length > 0) {
      const template = await getRockTemplate();
      const imesh = new THREE.InstancedMesh(template.geometry, template.material, this.rockData.length);
      imesh.castShadow = true;
      imesh.receiveShadow = true;
      imesh.userData.isMineable = true;

      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const s = new THREE.Vector3();

      for (let i = 0; i < this.rockData.length; i++) {
        const { position, scale, rotation, yOffset = 0 } = this.rockData[i];

        const pos = position.clone();
        pos.y += yOffset; // ← respect the per-instance Y you authored

        m.compose(
          pos,
          q.setFromEuler(new THREE.Euler(0, rotation, 0)),
          s.set(scale, scale, scale)
        );

        // Apply the mesh's authored LOCAL transform (includes your editor Y)
        if (template.localMatrix) {
          m.multiply(template.localMatrix);
        }

        imesh.setMatrixAt(i, m);
      }
      this.group.add(imesh);
    }
  }

  getTileAt(worldPos) {
    const total = CHUNK_SIZE * this.tileSize;
    const originX = this.chunkX * total;
    const originZ = this.chunkZ * total;

    const localX = Math.floor((worldPos.x - (originX - total / 2)) / this.tileSize);
    const localZ = Math.floor((worldPos.z - (originZ - total / 2)) / this.tileSize);

    if (localX < 0 || localX >= CHUNK_SIZE || localZ < 0 || localZ >= CHUNK_SIZE) return null;
    return this._tileMap.get(`${localX},${localZ}`) || null;
  }

  show() { this.scene.add(this.group); }
  hide() { this.scene.remove(this.group); }

  dispose() {
    this.hide();
    this.group.traverse(child => {
      if (child.isMesh) {
        child.geometry?.dispose?.();
        if (Array.isArray(child.material)) child.material.forEach(m => m?.dispose?.());
        else child.material?.dispose?.();
      }
    });
  }
}

export const DUSTBORNE_CHUNK_SIZE = CHUNK_SIZE;