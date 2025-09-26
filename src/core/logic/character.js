// file: src/core/logic/charatcer.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default class Character {
  constructor(scene, url = './src/assets/models/charatcer.glb') {
    this.scene = scene;
    this.url = url;

    this.object = null;

    // movement
    this._moving = false;
    this._dest = new THREE.Vector3();
    this._speed = 3.0; // m/s
    this._epsilon = 0.05;

    // highlight
    this._highlighted = null;
    this._prevMatState = new Map();

    // tap marker
    this._marker = null;
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
        if (o.material && o.material.isMaterial && !o.material.isMeshStandardMaterial) {
          // ensure lit by scene lights
          o.material = new THREE.MeshStandardMaterial({
            color: (o.material.color && o.material.color.clone()) || new THREE.Color(0xffffff),
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

  /** Simple straight-line movement */
  moveTo(point) {
    if (!this.object) return;
    this._dest.copy(point);
    this._dest.y = this.object.position.y; // keep on ground plane
    this._moving = true;
  }

  cancelActions() {
    this._moving = false;
  }

  update(dt) {
    if (!this._moving || !this.object) return;

    const pos = this.object.position;
    const to = new THREE.Vector3().subVectors(this._dest, pos);
    const dist = to.length();
    if (dist < this._epsilon) {
      pos.copy(this._dest);
      this._moving = false;
      return;
    }

    to.normalize();
    const step = Math.min(dist, this._speed * dt);
    pos.addScaledVector(to, step);

    // face travel direction (y-up)
    if (step > 0.0001) {
      const yaw = Math.atan2(this._dest.x - pos.x, this._dest.z - pos.z);
      this.object.rotation.set(0, yaw, 0);
    }
  }

  /** Visual feedback for taps */
  showTapMarkerAt(point) {
    if (!this.scene) return;
    if (this._marker) {
      this.scene.remove(this._marker);
      this._marker.geometry.dispose();
      this._marker.material.dispose();
      this._marker = null;
    }
    const g = new THREE.RingGeometry(0.15, 0.22, 32);
    const m = new THREE.MeshBasicMaterial({ color: 0x6ec1ff, transparent: true, opacity: 0.9, side: THREE.DoubleSide });
    const ring = new THREE.Mesh(g, m);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(point.x, 0.02, point.z);
    this.scene.add(ring);
    this._marker = ring;
    // fade out
    const start = performance.now();
    const fade = (t) => {
      const k = Math.min(1, (t - start) / 600);
      ring.scale.setScalar(1 + k * 0.6);
      m.opacity = 0.9 * (1 - k);
      if (k < 1) requestAnimationFrame(fade);
      else {
        this.scene.remove(ring);
        g.dispose(); m.dispose();
        this._marker = null;
      }
    };
    requestAnimationFrame(fade);
  }

  setHighlightedObject(obj) {
    if (this._highlighted === obj) return;

    // clear previous
    if (this._highlighted) {
      const prevs = this._prevMatState.get(this._highlighted);
      if (prevs) {
        this._highlighted.traverse((m) => {
          if (m.isMesh && prevs.has(m)) {
            const { emissive, emissiveIntensity } = prevs.get(m);
            if (m.material && m.material.emissive) {
              m.material.emissive.copy(emissive);
              m.material.emissiveIntensity = emissiveIntensity;
            }
          }
        });
      }
    }

    this._highlighted = obj;
    this._prevMatState.delete(obj);

    if (!obj) return;

    // apply highlight (if material supports emissive)
    const store = new Map();
    obj.traverse((m) => {
      if (m.isMesh && m.material && m.material.emissive) {
        store.set(m, {
          emissive: m.material.emissive.clone(),
          emissiveIntensity: m.material.emissiveIntensity ?? 1
        });
        m.material.emissive.setHex(0xffcc66);
        m.material.emissiveIntensity = 1.25;
      }
    });
    this._prevMatState.set(obj, store);
  }

  startMining(target) {
    // stub for future logic
    console.log('[Character] startMining on', target?.name || target);
  }
}