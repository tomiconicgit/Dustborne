// file: src/world/chunks/miningarea.js
import * as THREE from 'three';
import { spawnCluster as spawnCopperCluster } from '../../assets/rocks/copperore.js';

// Landscape descriptor only
export default class MiningArea {
  constructor() {
    this.mesh = null; // reserved
  }
  update() {}
}

/**
 * The mining chunk registers its world content here.
 * WorldEngine will call spawners for each registered chunk.
 */
export function register(world) {
  // For every 'mining' chunk, place a 6-rock copper cluster inside a 20x20 zone near the chunk center.
  world.registerKindSpawner('mining', async ({ scene, center /* Vector3 */, cx, cz }) => {
    // center is the chunk center in world space, y=0
    // Slight offset so cluster isn't perfectly centered; still inside chunk (50x50)
    const offset = new THREE.Vector3(
      THREE.MathUtils.randFloatSpread(6), // ±3m
      0,
      THREE.MathUtils.randFloatSpread(6)
    );
    const clusterCenter = new THREE.Vector3().addVectors(center, offset);
    return spawnCopperCluster(scene, { center: clusterCenter, count: 6, area: 20 });
  });
}