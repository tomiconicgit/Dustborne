// file: src/core/logic/character.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default class Character {
  // ✨ UPDATED: Constructor now accepts a `collidables` group
  constructor(scene, collidables, url = './src/assets/models/charatcer.glb') {
    this.scene = scene;
    this.url = url;
    this.collidables = collidables; // The group of solid objects (e.g., rocks)

    this.object = null;
    this.radius = 0.4; // ✨ NEW: An approximate radius for the character for collision checks

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

  moveTo(point) {
    if (!this.object) return;
    this._dest.copy(point);
    this._dest.y = this.object.position.y;
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
    
    // ✨ NEW: Collision detection logic
    const nextPos = pos.clone().addScaledVector(to, step);
    let collision = false;
    
    if (this.collidables?.children.length > 0) {
      // The `collidables` group contains the 'CopperOreCluster' group
      for (const cluster of this.collidables.children) {
        // The cluster group contains the individual rock clones
        for (const rock of cluster.children) {
          if (rock.userData.isSolid) {
            const rockPos = rock.position;
            const rockRadius = rock.userData.collisionRadius || 1;
            const distance = nextPos.distanceTo(rockPos);

            if (distance < this.radius + rockRadius) {
              collision = true;
              break; // Exit inner loop
            }
          }
        }
        if (collision) break; // Exit outer loop
      }
    }

    // If a collision is detected, stop moving and cancel the destination
    if (collision) {
      this._moving = false;
      return;
    }

    // If no collision, apply the movement
    pos.addScaledVector(to, step);

    if (step > 0.0001) {
      const yaw = Math.atan2(this._dest.x - pos.x, this._dest.z - pos.z);
      this.object.rotation.set(0, yaw, 0);
    }
  }

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
    console.log('[Character] startMining on', target?.name || target);
  }
}
