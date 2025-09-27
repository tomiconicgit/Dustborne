// file: src/core/logic/characterlogic.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene } from '../scene.js';
import Viewport from '../viewport.js';
import Camera from '../camera.js';
import ChunkManager from '../../world/chunks/chunkmanager.js';

// --- Helper classes for pathfinding ---
class PriorityQueue {
  constructor() { this.elements = []; }
  enqueue(element, priority) { this.elements.push({ element, priority }); this.elements.sort((a, b) => a.priority - b.priority); }
  dequeue() { return this.elements.shift().element; }
  isEmpty() { return this.elements.length === 0; }
}

class AStarPathfinder {
  constructor(world) { this.world = world; }
  _key(tile) { if (!tile) return ''; return `${tile.chunk.chunkX},${tile.chunk.chunkZ}:${tile.localX},${tile.localZ}`; }
  _cost(a, b) { return a.center.distanceTo(b.center); }
  _heuristic(a, b) { return a.center.distanceTo(b.center); }
  findPath(startPos, endPos) {
    const startTile = this.world.getTileAt(startPos);
    const endTile = this.world.getTileAt(endPos);
    if (!startTile || !endTile || !endTile.isWalkable) return null;
    const frontier = new PriorityQueue();
    const cameFrom = new Map();
    const costSoFar = new Map();
    frontier.enqueue(startTile, 0);
    cameFrom.set(this._key(startTile), null);
    costSoFar.set(this._key(startTile), 0);
    let reached = false;
    while (!frontier.isEmpty()) {
      const current = frontier.dequeue();
      if (current === endTile) { reached = true; break; }
      for (const next of this.world.getNeighbors8(current)) {
        const newCost = costSoFar.get(this._key(current)) + this._cost(current, next);
        const nk = this._key(next);
        if (!costSoFar.has(nk) || newCost < costSoFar.get(nk)) {
          costSoFar.set(nk, newCost);
          const priority = newCost + this._heuristic(next, endTile);
          frontier.enqueue(next, priority);
          cameFrom.set(nk, current);
        }
      }
    }
    if (!reached) return null;
    const path = [];
    let cur = endTile;
    while (cur) { path.push(cur.center.clone()); cur = cameFrom.get(this._key(cur)); }
    path.reverse();
    return path.length > 1 ? path : null;
  }
}

// --- Main Character Class ---
export default class Character {
  static main = null;

  static create() {
    if (Character.main) return;
    Character.main = new Character();
    Character.main.init(); // Asynchronously initialize
  }
  
  constructor() {
    if(Character.main) {
      throw new Error('Character is a singleton.');
    }
    
    // --- Properties ---
    this.object = null;
    this.url = './src/assets/models/charatcer.glb';
    this.viewDistance = 2;

    // Movement & State
    this._moving = false;
    this._dest = new THREE.Vector3();
    this._speed = 3.0;
    this._epsilon = 0.05;
    this._path = null;
    this._currentWaypointIndex = 0;
    
    // Animation
    this.walkUrl = './src/assets/models/animations/walking.glb';
    this.idleUrl = './src/assets/models/animations/idle.glb';
    this._mixer = null;
    this._walkAction = null;
    this._idleAction = null;
    this._walkPlaying = false;
    this._idlePlaying = false;
    
    // Input & Systems
    this.touchState = { isDragging: false, startPos: new THREE.Vector2() };
    this.raycaster = new THREE.Raycaster();
    this.pathfinder = new AStarPathfinder(ChunkManager.instance);
  }

  async init() {
    // 1. Load the character model
    await this._loadModel();
    
    // 2. Pre-load animations
    await this._prewarmAnimations();
    
    // 3. Connect to other systems
    this._attachInputListeners();
    Camera.main.setTarget(this.object);
    
    // 4. Start update loops
    this._startUpdateLoop();
  }
  
  // --- Initialization ---
  async _loadModel(position = new THREE.Vector3(0, 0, 2)) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(this.url);
    const root = gltf.scene || gltf.scenes[0];
    if (!root) throw new Error('charatcer.glb has no scene');
    
    root.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    
    root.position.copy(position);
    scene.add(root);
    this.object = root;
  }
  
  _attachInputListeners() {
    const domElement = Viewport.instance.domElement;
    domElement.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
    domElement.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
    domElement.addEventListener('touchend', this._onTouchEnd.bind(this), { passive: false });
  }

  _startUpdateLoop() {
    let lastT = performance.now();
    const update = (t) => {
      const dt = Math.min(0.05, (t - lastT) / 1000);
      lastT = t;

      this.update(dt);
      
      requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  // --- Main Update Logic (called every frame) ---
  update(dt) {
    if (!this.object) return;
    
    this._updatePosition(dt);

    if (this._path) {
      if (!this._moving) {
        this._currentWaypointIndex++;
        if (this._currentWaypointIndex < this._path.length) {
          this._moveTo(this._path[this._currentWaypointIndex]);
        } else {
          this._path = null;
          this._startIdle();
        }
      }
    } else if (!this._moving && !this._idlePlaying) {
      this._startIdle();
    }
    
    this._mixer?.update(dt);
    ChunkManager.instance?.update(this.object.position, this.viewDistance);
  }

  // --- Movement & Pathfinding ---
  _moveTo(point) {
    this._dest.copy(point);
    this._dest.y = this.object.position.y;
    this._moving = true;
  }
  
  _updatePosition(dt) {
    if (!this._moving) return;
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
    if (step > 0.0001) {
      const yaw = Math.atan2(this._dest.x - pos.x, this._dest.z - pos.z);
      this.object.rotation.set(0, yaw, 0);
    }
  }

  _goTo(targetCenter) {
    const path = this.pathfinder.findPath(this.object.position, targetCenter);
    if (path && path.length > 0) {
      this._path = path;
      this._currentWaypointIndex = 0;
      this._moveTo(this._path[0]);
      this._startWalk();
    }
  }

  // --- Animation ---
  async _prewarmAnimations() {
    this._mixer = new THREE.AnimationMixer(this.object);
    const [idleClip, walkClip] = await Promise.all([
        this._loadClip(this.idleUrl),
        this._loadClip(this.walkUrl)
    ]);
    this._idleAction = this._mixer.clipAction(idleClip);
    this._walkAction = this._mixer.clipAction(walkClip);
    
    this._idleAction.reset().setLoop(THREE.LoopRepeat).play();
    this._walkAction.reset().setLoop(THREE.LoopRepeat).play();
    this._idleAction.setEffectiveWeight(1);
    this._walkAction.setEffectiveWeight(0);
    this._idlePlaying = true;
    this._walkPlaying = false;
    this._mixer.update(0);
  }
  
  async _loadClip(url) {
    const gltf = await new GLTFLoader().loadAsync(url);
    return gltf.animations[0];
  }
  
  _startIdle() {
    if (this._walkPlaying) {
      this._idleAction.reset().crossFadeFrom(this._walkAction, 0.25, false);
    } else if (!this._idlePlaying) {
      this._idleAction.reset().fadeIn(0.25);
    }
    this._walkPlaying = false;
    this._idlePlaying = true;
  }

  _startWalk() {
    if (this._idlePlaying) {
      this._walkAction.reset().crossFadeFrom(this._idleAction, 0.25, false);
    } else if (!this._walkPlaying) {
      this._walkAction.reset().fadeIn(0.25);
    }
    this._idlePlaying = false;
    this._walkPlaying = true;
  }
  
  // --- Input Handling ---
  _onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.touchState.isDragging = false;
      this.touchState.startPos.set(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  _onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    const currentPos = new THREE.Vector2(e.touches[0].clientX, e.touches[0].clientY);
    if (this.touchState.startPos.distanceTo(currentPos) > 10) {
      this.touchState.isDragging = true;
    }
  }

  _onTouchEnd(e) {
    e.preventDefault();
    if (!this.touchState.isDragging && e.changedTouches.length === 1 && e.touches.length === 0) {
      this._handleTap(e.changedTouches[0]);
    }
  }

  _handleTap(touch) {
    const rect = Viewport.instance.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((touch.clientX - rect.left) / rect.width) * 2 - 1,
      -((touch.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, Camera.main.threeCamera);
    
    const hits = this.raycaster.intersectObjects(scene.children, true);
    let groundPoint = null;
    for (const hit of hits) {
      if (hit.object?.userData?.isLandscape) {
        groundPoint = hit.point;
        break;
      }
    }
    if (groundPoint) {
      this._goTo(groundPoint);
    }
  }
}
