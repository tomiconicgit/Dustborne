// file: src/world/assets/rocks/copperore.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let _template = null;

/**
 * Loads the copper ore once and returns a template containing:
 * - geometry, material
 * - localMatrix: the mesh's authored LOCAL transform (includes its Y offset/pivot)
 *
 * We DO NOT guess a bottom-align offset here; we respect whatever was authored
 * in the editor (mesh.local position/rotation/scale).
 */
export async function getRockTemplate(url = './src/world/assets/rocks/copperore.glb') {
  if (_template) return _template;

  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene || gltf.scenes?.[0];
  if (!root) throw new Error('copperore.glb has no scene');

  // Ensure matrices are current
  root.updateMatrixWorld(true);

  // Pick the first mesh (or the largest, if multiple)
  let pick = null;
  let maxTri = -1;

  root.traverse((o) => {
    if (o.isMesh) {
      const geom = o.geometry;
      const tri = (geom.index ? geom.index.count : geom.attributes.position.count) / 3;
      if (tri > maxTri) { maxTri = tri; pick = o; }
    }
  });

  if (!pick) throw new Error('Could not find a mesh in copperore.glb');

  // Respect authored materials; standardize if needed
  if (!pick.material.isMeshStandardMaterial) {
    pick.material = new THREE.MeshStandardMaterial({
      color: (pick.material?.color?.clone()) || new THREE.Color(0xffffff),
      metalness: 0.1, roughness: 0.85
    });
  }

  // Cache the mesh's LOCAL transform (relative to its parent in the GLTF)
  // This carries the authored Y offset/pivot you set in the editor.
  pick.updateMatrix(); // ensure .matrix reflects local TRS
  const localMatrix = pick.matrix.clone();

  // Share geometry/material for instancing
  _template = {
    geometry: pick.geometry,
    material: pick.material,
    localMatrix
  };
  return _template;
}