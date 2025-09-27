// file: copperorelogic.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let _template = null;

export async function getRockTemplate(url = './copperore.glb') { // Corrected path
  if (_template) return _template;

  const gltf = await new GLTFLoader().loadAsync(url);
  // ... rest of the function is unchanged
}
