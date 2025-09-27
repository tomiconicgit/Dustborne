// file: src/core/chunk.js
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getRockTemplate } from '../world/assets/rocks/copperore.js';

const CHUNK_SIZE = 32;

export class Chunk {
  constructor(scene, world, chunkX, chunkZ) {
    this.scene = scene;
    this.world = world;
    this.chunkX = chunkX;
    this.chunkZ = chunkZ;
    this.tileSize = world.TILE_SIZE;
    this.worldSize = CHUNK_SIZE * this.tileSize;
    this.origin = new THREE.Vector3(this.chunkX * this.worldSize, 0, this.chunkZ * this.worldSize);

    this.group = new THREE.Group();
    this.group.name = `Chunk(${chunkX},${chunkZ})`;

    this.tiles = [];
    this._tileMap = new Map();
    this.rockData = [];

    this._generateTiles();
  }

  _generateTiles() {
    for (let tz = 0; tz < CHUNK_SIZE; tz++) {
      for (let tx = 0; tx < CHUNK_SIZE; tx++) {
        const worldX = this.origin.x + (tx + 0.5) * this.tileSize;
        const worldZ = this.origin.z + (tz + 0.5) * this.tileSize;
        
        const tile = {
          chunk: this, localX: tx, localZ: tz,
          center: new THREE.Vector3(worldX, 0, worldZ),
          isWalkable: true, userData: {}
        };
        this.tiles.push(tile);
        this._tileMap.set(`${tx},${tz}`, tile);
      }
    }
  }
  
  addRock(localX, localZ, scale = 1.0, rotation = 0) {
      const tile = this._tileMap.get(`${localX},${localZ}`);
      if (tile) {
          tile.isWalkable = false;
          this.rockData.push({ position: tile.center, scale, rotation });
      }
  }

  async build() {
    const geometriesByMaterial = { sand: [], dirt: [] };
    for (const tile of this.tiles) {
      const geo = this.world.sharedTileGeo.clone();
      geo.translate(tile.center.x, tile.center.y, tile.center.z);
      (tile.userData.isDirt ? geometriesByMaterial.dirt : geometriesByMaterial.sand).push(geo);
    }
    
    for (const materialType in geometriesByMaterial) {
        const geometries = geometriesByMaterial[materialType];
        if (geometries.length > 0) {
            const mergedGeo = mergeGeometries(geometries);
            const material = this.world.materials[materialType];
            const mesh = new THREE.Mesh(mergedGeo, material);
            mesh.receiveShadow = true;
            mesh.userData.isLandscape = true;
            this.group.add(mesh);
        }
    }

    if (this.rockData.length > 0) {
      const template = await getRockTemplate();
      const instancedMesh = new THREE.InstancedMesh(template.geometry, template.material, this.rockData.length);
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;
      instancedMesh.userData.isMineable = true;

      const matrix = new THREE.Matrix4();
      const quat = new THREE.Quaternion();
      const scaleVec = new THREE.Vector3();

      for (let i = 0; i < this.rockData.length; i++) {
        const { position, scale, rotation } = this.rockData[i];
        const finalPosition = position.clone().add(template.position);
        matrix.compose(
            finalPosition,
            quat.setFromEuler(new THREE.Euler(0, rotation, 0)),
            scaleVec.set(scale, scale, scale)
        );
        instancedMesh.setMatrixAt(i, matrix);
      }
      this.group.add(instancedMesh);
    }
  }
  
  getTileAt(worldPos) {
    const localX = Math.floor(worldPos.x - this.origin.x);
    const localZ = Math.floor(worldPos.z - this.origin.z);
    if (localX < 0 || localX >= CHUNK_SIZE || localZ < 0 || localZ >= CHUNK_SIZE) return null;
    return this._tileMap.get(`${localX},${localZ}`);
  }

  show() { this.scene.add(this.group); }
  hide() { this.scene.remove(this.group); }
  
  dispose() { /* ... */ }
}

export const DUSTBORNE_CHUNK_SIZE = CHUNK_SIZE;
