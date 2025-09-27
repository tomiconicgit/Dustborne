// file: src/core/logic/character.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene } from '../scene.js';
import CharacterMovement from './charactermovement.js';
import ChunkManager from '../../world/chunks/chunkmanager.js';

export default class Character {
  static main = null;

  static create() {
    if (Character.main) return;
    const character = new Character();
    Character.main = character;
    character.init(); // Asynchronously initialize
  }
  
  constructor() {
    if(Character.main) {
      throw new Error('Character is a singleton.');
    }
    this.object = null;
    this.url = './src/assets/models/charatcer.glb';
    this.movement = null;

    // The character is now responsible for its own view distance.
    this.viewDistance = 2; // e.g., 2 chunks in every direction
  }

  async init(position = new THREE.Vector3(0, 0, 2)) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(this.url);
    const root = gltf.scene || gltf.scenes[0];
    if (!root) throw new Error('charatcer.glb has no scene');
    
    root.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        // ... material setup
      }
    });
    
    root.position.copy(position);
    scene.add(root);
    this.object = root;
    
    // Once the character model is loaded, create its movement controller
    this.movement = CharacterMovement.create(this);

    // Start the loop that updates the world chunks
    this.startChunkUpdateLoop();
  }

  // This character-owned loop tells the chunk manager what to load.
  startChunkUpdateLoop() {
    const update = () => {
      if (this.object && ChunkManager.instance) {
        ChunkManager.instance.update(this.object.position, this.viewDistance);
      }
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }
}
