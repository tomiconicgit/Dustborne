// file: src/world/assets/rocks/copperore.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

let _template = null; // cached GLTF scene

async function loadTemplate(url = './src/world/assets/rocks/copperore.glb') {
  if (_template) return _template;
  const gltf = await new GLTFLoader().loadAsync(url);
  const root = gltf.scene || gltf.scenes?.[0];
  if (!root) throw new Error('copperore.glb has no scene');

  // Normalize materials for lighting + shadows; mark as mineable
  root.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.userData.isMineable = true;

      const m = o.material;
      if (!m || !m.isMeshStandardMaterial) {
        o.material = new THREE.MeshStandardMaterial({
          color: (m?.color && m.color.clone()) || new THREE.Color(0xffffff),
          metalness: 0.1,
          roughness: 0.85
        });
      }
    }
  });

  // Compute local bbox so we can make clones sit flush on y=0
  const bbox = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  // Build a template Group we can deep-clone
  const template = new THREE.Group();
  template.add(root);

  // Store helpers for flush placement and collision
  template.userData.__bboxMinY = bbox.min.y;
  // ✨ NEW: Calculate and store a collision radius for the template
  template.userData.__collisionRadius = size.length() / 2;

  _template = template;
  return _template;
}

/**
 * Spawns a clustered set of copper ore rocks.
 * - count: number of rocks
 * - area: square side length for overall cluster region
 * - center: THREE.Vector3 world-space center of the cluster region
 */
export async function spawnCluster(
  scene,
  { center = new THREE.Vector3(0, 0, 0), count = 6, area = 20 } = {}
) {
  const template = await loadTemplate();

  const group = new THREE.Group();
  group.name = 'CopperOreCluster';
  scene.add(group);

  const half = area * 0.5;

  const anchor = new THREE.Vector3(
    center.x + (Math.random() * 2 - 1) * (half * 0.5),
    0,
    center.z + (Math.random() * 2 - 1) * (half * 0.5)
  );

  for (let i = 0; i < count; i++) {
    const clone = template.clone(true);
    clone.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone?.() || o.material;
        o.castShadow = true;
        o.receiveShadow = true;
        o.userData.isMineable = true;
      }
    });

    const r = 5 * Math.random();
    const theta = Math.random() * Math.PI * 2;
    const px = THREE.MathUtils.clamp(anchor.x + Math.cos(theta) * r, center.x - half, center.x + half);
    const pz = THREE.MathUtils.clamp(anchor.z + Math.sin(theta) * r, center.z - half, center.z + half);

    const minY = template.userData.__bboxMinY ?? 0;
    // ✨ UPDATED: Lower the rock slightly more to ensure it's flush
    clone.position.set(px, -minY - 0.05, pz);

    clone.rotation.y = Math.random() * Math.PI * 2;
    // ✨ UPDATED: Increased the scale range for slightly larger rocks
    const s = THREE.MathUtils.lerp(1.0, 1.3, Math.random());
    clone.scale.setScalar(s);
    
    // ✨ NEW: Add collision data to each spawned rock clone
    clone.userData.isSolid = true;
    clone.userData.collisionRadius = (template.userData.__collisionRadius ?? 1) * s;

    group.add(clone);
  }

  return group;
}
