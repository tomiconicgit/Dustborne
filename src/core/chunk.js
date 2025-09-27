// file: src/core/chunk.js
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { getRockTemplate } from '../world/assets/rocks/copperore.js';

const CHUNK_SIZE = 32; // Each chunk is 32x32 tiles.

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
    // 1. Group geometries by material (sand vs dirt)
    const geometriesByMaterial = {
        sand: [],
        dirt: [],
    };
    for (const tile of this.tiles) {
      const geo = this.world.sharedTileGeo.clone();
      geo.translate(tile.center.x, tile.center.y, tile.center.z);
      if (tile.userData.isDirt) {
        geometriesByMaterial.dirt.push(geo);
      } else {
        geometriesByMaterial.sand.push(geo);
      }
    }
    
    // 2. Create a merged mesh for each material type
    for (const materialType in geometriesByMaterial) {
        const geometries = geometriesByMaterial[materialType];
        if (geometries.length > 0) {
            const mergedGeo = mergeGeometries(geometries);
            const material = this.world.materials[materialType];
            const mesh = new THREE.Mesh(mergedGeo, material);
            mesh.receiveShadow = true;
            mesh.userData.isLandscape = true; // For raycasting
            this.group.add(mesh);
        }
    }

    // 3. Create an InstancedMesh for rocks
    if (this.rockData.length > 0) {
      const template = await getRockTemplate();
      const instancedMesh = new THREE.InstancedMesh(template.geometry, template.material, this.rockData.length);
      instancedMesh.castShadow = true;
      instancedMesh.receiveShadow = true;
      instancedMesh.userData.isMineable = true; // For raycasting

      const matrix = new THREE.Matrix4();
      const quat = new THREE.Quaternion();
      const scaleVec = new THREE.Vector3();

      for (let i = 0; i < this.rockData.length; i++) {
        const { position, scale, rotation } = this.rockData[i];
        
        // ** THE FIX **: Add the template's Y-position to the tile's ground position.
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
    const totalSize = CHUNK_SIZE * this.tileSize;
    const originX = this.chunkX * totalSize;
    const originZ = this.chunkZ * totalSize;
    
    const localX = Math.floor(worldPos.x - (originX - totalSize / 2));
    const localZ = Math.floor(worldPos.z - (originZ - totalSize / 2));

    return this._tileMap.get(`${localX},${localZ}`);
  }

  show() { this.scene.add(this.group); }
  hide() { this.scene.remove(this.group); }

  dispose() {
    this.hide();
    this.group.traverse(child => {
        if (child.isMesh) {
            child.geometry.dispose();
            child.material.dispose();
        }
    });
  }
}

export const DUSTBORNE_CHUNK_SIZE = CHUNK_SIZE;
