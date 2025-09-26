// file: src/world/assets/rocks/copperore.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let _template = null;

async function loadTemplate(url = './src/world/assets/rocks/copperore.glb') {
  if (_template) return _template;
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene || gltf.scenes?.[0];
  if (!root) throw new Error('copperore.glb has no scene');

  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.userData.isMineable = true;
      if (!o.material.isMeshStandardMaterial) {
        o.material = new THREE.MeshStandardMaterial({
          color: (o.material?.color?.clone()) || new THREE.Color(0xffffff),
          metalness: 0.1,
          roughness: 0.85
        });
      }
    }
  });

  const bbox = new THREE.Box3().setFromObject(root);
  const template = new THREE.Group();
  template.add(root);
  template.userData.__bboxMinY = bbox.min.y;
  _template = template;
  return _template;
}

export async function spawnSingleRock(scene, { center = new THREE.Vector3(), tile = null } = {}) {
  const template = await loadTemplate();
  const clone = template.clone(true);

  clone.traverse((o) => { if (o.isMesh) o.material = o.material.clone(); });

  const minY = template.userData.__bboxMinY ?? 0;
  clone.position.set(center.x, -minY - 0.05, center.z);
  clone.rotation.y = Math.random() * Math.PI * 2;
  const s = THREE.MathUtils.lerp(1.0, 1.3, Math.random());
  clone.scale.setScalar(s);

  clone.userData.isMineable = true;
  if (tile) clone.userData.tile = tile;

  scene.add(clone);
  return clone;
}