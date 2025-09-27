// file: src/core/chunk.js
import * as THREE from 'three';
// The FIX is here: We import the specific 'mergeGeometries' function
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getRockTemplate } from '../world/assets/rocks/copperore.js';

const CHUNK_SIZE = 32; // Each chunk is 32x32 tiles. A smaller, more manageable size.

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
    this.rockData = []; // To store rock positions before creating instances

    this.groundMesh = null;
    this.rockInstancedMesh = null;

    this._generateTiles();
  }

  // Generate the tile data for this chunk only
  _generateTiles() {
    const originX = this.chunkX * CHUNK_SIZE * this.tileSize;
    const originZ = this.chunkZ * CHUNK_SIZE * this.tileSize;

    for (let tz = 0; tz < CHUNK_SIZE; tz++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const worldX = originX + (tx + 0.5) * this.tileSize;
        const worldZ = originZ + (tz + 0.5) * this.tileSize;
        
        const tile = {
          chunk: this,
          localX: tx, localZ: tz,
          center: new THREE.Vector3(worldX, 0, worldZ),
          isWalkable: true,
          userData: {}
        };
        this.tiles.push(tile);
        this._tileMap.set(`${tx},${tz}`, tile);
      }
    }
  }
  
  // Called by content spawners (e.g., miningarea.js) to add rocks
  addRock(localX, localZ, scale = 1.0, rotation = 0) {
      const tile = this._tileMap.get(`${localX},${localZ}`);
      if (tile) {
          tile.isWalkable = false;
          this.rockData.push({ position: tile.center, scale, rotation });
      }
  }

  // Finalizes the chunk's geometry after all content has been defined
  async build() {
    // 1. Merge all ground tile geometries into one mesh
    const groundGeometries = [];
    for (const tile of this.tiles) {
      const geo = this.world.sharedTileGeo.clone();
      // Here you can apply different colors based on tile.userData (e.g., isDirt)
      geo.translate(tile.center.x, tile.center.y, tile.center.z);
      groundGeometries.push(geo);
    }
    
    if (groundGeometries.length > 0) {
      // The FIX is here: We call the function directly
      const mergedGround = mergeGeometries(groundGeometries);
      this.groundMesh = new THREE.Mesh(mergedGround, this.world.sharedGroundMaterial);
      this.groundMesh.receiveShadow = true;
      this.group.add(this.groundMesh);
    }

    // 2. Create an InstancedMesh for all rocks in this chunk
    if (this.rockData.length > 0) {
      const template = await getRockTemplate();
      this.rockInstancedMesh = new THREE.InstancedMesh(template.geometry, template.material, this.rockData.length);
      this.rockInstancedMesh.castShadow = true;
      this.rockInstancedMesh.receiveShadow = true;

      const matrix = new THREE.Matrix4();
      for (let i = 0; i < this.rockData.length; i++) {
        const { position, scale, rotation } = this.rockData[i];
        matrix.compose(
            position,
            new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotation, 0)),
            new THREE.Vector3(scale, scale, scale)
        );
        this.rockInstancedMesh.setMatrixAt(i, matrix);
      }
      this.group.add(this.rockInstancedMesh);
    }
  }
  
  getTileAt(worldPos) {
    const localX = Math.floor((worldPos.x - this.chunkX * CHUNK_SIZE) / this.tileSize);
    const localZ = Math.floor((worldPos.z - this.chunkZ * CHUNK_SIZE) / this.tileSize);
    return this._tileMap.get(`${localX},${localZ}`);
  }

  show() {
    this.scene.add(this.group);
  }

  hide() {
    this.scene.remove(this.group);
  }

  dispose() {
    this.hide();
    // Dispose all geometries and materials to prevent memory leaks
    this.groundMesh?.geometry.dispose();
    this.rockInstancedMesh?.geometry.dispose();
  }
}

// Export chunk size for other modules to use
export const DUSTBORNE_CHUNK_SIZE = CHUNK_SIZE;
