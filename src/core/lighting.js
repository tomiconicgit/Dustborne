// file: src/core/lighting.js
import * as THREE from 'three';
import { scene } from './three.js';

export default class Lighting {
  static main = null;

  static create() {
    if (Lighting.main) {
      console.warn('Lighting already created.');
      return;
    }
    Lighting.main = new Lighting(scene);
  }

  constructor(scene) {
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 2);
    this.hemiLight.color.setHSL(0.6, 1, 0.6);
    this.hemiLight.groundColor.setHSL(0.095, 1, 0.75);
    this.hemiLight.position.set(0, 50, 0);
    scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xffffff, 3);
    this.dirLight.color.setHSL(0.1, 1, 0.95);
    this.dirLight.position.set(-1, 1.75, 1).multiplyScalar(30);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 4096;
    this.dirLight.shadow.mapSize.height = 4096;
    const d = 400;
    this.dirLight.shadow.camera.left = -d;
    this.dirLight.shadow.camera.right = d;
    this.dirLight.shadow.camera.top = d;
    this.dirLight.shadow.camera.bottom = -d;
    this.dirLight.shadow.camera.far = 3500;
    this.dirLight.shadow.bias = -0.0001;
    scene.add(this.dirLight);
  }
}
