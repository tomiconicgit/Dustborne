// file: src/world/assets/rocks/copperore.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let _template = null;

// This function now just loads the model and returns its core components
// for the InstancedMesh constructor.
export async function getRockTemplate(url = './src/world/assets/rocks/copperore.glb') {
  if (_template) return _template;
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene || gltf.scenes?.[0];
  if (!root) throw new Error('copperore.glb has no scene');

  let geometry, material;
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      geometry = o.geometry; // Grab the geometry
      
      // Ensure material is standard
      if (!o.material.isMeshStandardMaterial) {
        material = new THREE.MeshStandardMaterial({
          color: (o.material?.color?.clone()) || new THREE.Color(0xffffff),
          metalness: 0.1,
          roughness: 0.85
        });
      } else {
        material = o.material;
      }
    }
  });

  if (!geometry || !material) {
    throw new Error('Could not extract geometry and material from copperore.glb');
  }

  _template = { geometry, material };
  return _template;
}
