// file: src/assets/rocks/copperore.js
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
  const center = new THREE.Vector3();
  bbox.getSize(size);
  bbox.getCenter(center);

  // Build a template Group we can deep-clone
  const template = new THREE.Group();
  const original = root;
  template.add(original);

  // Store helpers for flush placement
  template.userData.__bboxMinY = bbox.min.y; // how far below y=0 the geometry goes

  _template = template;
  return _template;
}

/**
 * Spawns a clustered set of copper ore rocks.
 * - count: number of rocks
 * - area: square side length for overall cluster region (e.g., 20 → 20x20)
 * - center: THREE.Vector3 world-space center of the cluster region (y ignored; flush on ground)
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

  // Pick an anchor near the center; place others around it to keep them close together
  const anchor = new THREE.Vector3(
    center.x + (Math.random() * 2 - 1) * (half * 0.5),
    0,
    center.z + (Math.random() * 2 - 1) * (half * 0.5)
  );

  for (let i = 0; i < count; i++) {
    const clone = template.clone(true);
    // deep clone material/geo refs for safety
    clone.traverse((o) => {
      if (o.isMesh) {
        o.material = o.material.clone?.() || o.material;
        o.castShadow = true;
        o.receiveShadow = true;
        o.userData.isMineable = true;
      }
    });

    // Cluster radius ~5m around anchor, but still inside the 20x20
    const r = 5 * Math.random();
    const theta = Math.random() * Math.PI * 2;
    const px = THREE.MathUtils.clamp(anchor.x + Math.cos(theta) * r, center.x - half, center.x + half);
    const pz = THREE.MathUtils.clamp(anchor.z + Math.sin(theta) * r, center.z - half, center.z + half);

    // Flush on ground (y=0). Adjust by template bbox min Y.
    const minY = template.userData.__bboxMinY ?? 0;
    clone.position.set(px, -minY, pz);

    // Random yaw / slight scale variance
    clone.rotation.y = Math.random() * Math.PI * 2;
    const s = THREE.MathUtils.lerp(0.9, 1.15, Math.random());
    clone.scale.setScalar(s);

    group.add(clone);
  }

  return group;
}