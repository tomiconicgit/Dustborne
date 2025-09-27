// file: src/core/logic/character.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default class Character {
  constructor(scene, url = './src/assets/models/charatcer.glb') {
    this.scene = scene;
    this.url = url;
    this.object = null;
  }

  // The prewarm function is now the entry point for creating a character.
  static async prewarm(scene) {
    const character = new Character(scene);
    await character.init();
    return character;
  }

  async init(position = new THREE.Vector3(0, 0, 2)) {
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
}
