// file: src/core/logic/character.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default class Character {
  // ✨ UPDATED: Constructor is simplified, no longer needs collidables.
  constructor(scene, url = './src/assets/models/charatcer.glb') {
    this.scene = scene;
    this.url = url;

    this.object = null;

    // movement
    this._moving = false;
    this._dest = new THREE.Vector3();
    this._speed = 3.0;
    this._epsilon = 0.05;

    // highlight and marker (unchanged)
    this._highlighted = null;
    this._prevMatState = new Map();
    this._marker = null;
  }

  async init(position = new THREE.Vector3(0, 0, 2)) {
    // ... init logic is unchanged ...
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(this.url);
    const root = gltf.scene || (gltf.scenes && gltf.scenes[0]);
    if (!root) throw new Error('charatcer.glb has no scene');
    root.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        if (!o.material.isMeshStandardMaterial) {
          o.material = new THREE.MeshStandardMaterial({
            color: (o.material.color?.clone()) || new THREE.Color(0xffffff),
            metalness: 0.1,
            roughness: 0.8
          });
        }
      }
    });
    root.position.copy(position);
    this.scene.add(root);
    this.object = root;
    return this;
  }

  moveTo(point) {
    if (!this.object) return;
    this._dest.copy(point);
    this._dest.y = this.object.position.y;
    this._moving = true;
  }
  
  isMoving() {
      return this._moving;
  }

  cancelActions() { this._moving = false; }

  update(dt) {
    if (!this._moving || !this.object) return;

    const pos = this.object.position;
    const to = new THREE.Vector3().subVectors(this._dest, pos);
    const dist = to.length();

    if (dist < this._epsilon) {
      pos.copy(this._dest);
      this._moving = false;
      return;
    }

    to.normalize();
    const step = Math.min(dist, this._speed * dt);

    // ✨ UPDATED: All collision logic is REMOVED. Movement is now direct.
    pos.addScaledVector(to, step);

    if (step > 0.0001) {
      const yaw = Math.atan2(this._dest.x - pos.x, this._dest.z - pos.z);
      this.object.rotation.set(0, yaw, 0);
    }
  }

  // ... showTapMarkerAt, setHighlightedObject, startMining are unchanged ...
  showTapMarkerAt(point) { /* ... */ }
  setHighlightedObject(obj) { /* ... */ }
  startMining(target) { /* ... */ }
}
