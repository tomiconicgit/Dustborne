// file: src/world/assets/rocks/copperore.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let _template = null;

/**
 * Load once and BAKE the GLB’s authored transform (pos/rot/scale) into geometry.
 * Instancing then only needs per-tile TRS (translate/rotate/optional scale).
 */
export async function getRockTemplate(url = './src/world/assets/rocks/copperore.glb') {
  if (_template) return _template;

  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene || gltf.scenes?.[0];
  if (!root) throw new Error('copperore.glb has no scene');
  root.updateMatrixWorld(true);

  const bakedGeos = [];
  let pickedMat = null;

  root.traverse((o) => {
    if (!o.isMesh) return;

    // Bake this mesh’s world transform into its geometry
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    bakedGeos.push(g);

    // Keep a reasonable PBR material (prefer existing MeshStandardMaterial)
    if (!pickedMat) {
      pickedMat = o.material?.isMeshStandardMaterial
        ? o.material
        : new THREE.MeshStandardMaterial({
            color: (o.material?.color?.clone?.() || new THREE.Color(0xffffff)),
            roughness: 0.85,
            metalness: 0.1,
            map: o.material?.map || null,
            normalMap: o.material?.normalMap || null,
            roughnessMap: o.material?.roughnessMap || null,
            metalnessMap: o.material?.metalnessMap || null,
          });
    }
  });

  if (!bakedGeos.length) throw new Error('copperore.glb: no meshes found');

  const geometry = bakedGeos.length === 1 ? bakedGeos[0] : mergeGeometries(bakedGeos, false);
  geometry.computeBoundingSphere();
  geometry.computeBoundingBox();

  _template = { geometry, material: pickedMat };
  return _template;
}