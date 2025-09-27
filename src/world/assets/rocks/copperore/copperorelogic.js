// file: src/world/assets/rocks/copperore/copperorelogic.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

let _template = null;

export async function getRockTemplate(url = './src/world/assets/rocks/copperore/copperore.glb') {
  if (_template) return _template;

  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene || gltf.scenes?.[0];
  if (!root) throw new Error('copperore.glb has no scene');
  root.updateMatrixWorld(true);

  const bakedGeos = [];
  let pickedMat = null;

  root.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry.clone();
    g.applyMatrix4(o.matrixWorld);
    bakedGeos.push(g);
    if (!pickedMat) {
      pickedMat = o.material?.isMeshStandardMaterial ? o.material : new THREE.MeshStandardMaterial({
        color: (o.material?.color?.clone?.() || new THREE.Color(0xffffff)),
        roughness: 0.85, metalness: 0.1, map: o.material?.map || null,
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
