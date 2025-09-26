// file: src/world/chunks/desert.js
import * as THREE from 'three';

export default class Desert {
  // reference color (matches mining border vibe)
  static baseColor = new THREE.Color('#C2B280'); // sandy beige

  // optional: single 50x50 flat mesh (not used by tiler, kept for reference)
  constructor() {
    this.mesh = new THREE.Group();
    const geo = new THREE.PlaneGeometry(50, 50);
    const mat = new THREE.MeshStandardMaterial({ color: Desert.baseColor, roughness: 1, metalness: 0 });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.receiveShadow = true;
    this.mesh.add(m);
  }
}