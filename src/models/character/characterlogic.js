// file: src/models/character/characterlogic.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { scene } from '../../core/three.js';
import Viewport from '../../core/viewport.js';
import Camera from '../../core/camera.js';
import ChunkManager from '../../world/chunks/chunkmanager.js';
import GridToggle from '../../developer/gridtoggle.js';

class PriorityQueue {
  constructor() { this.elements = []; }
  enqueue(element, priority) { this.elements.push({ element, priority }); this.elements.sort((a, b) => a.priority - b.priority); }
  dequeue() { return this.elements.shift().element; }
  isEmpty() { return this.elements.length === 0; }
}

class AStarPathfinder {
  constructor(world) { this.world = world; }
  _key(tile) { if (!tile) return ''; return `${tile.chunkX},${tile.chunkZ}:${tile.localX},${tile.localZ}`; }
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
    let goalNode = null;

    while (!frontier.isEmpty()) {
      const current = frontier.dequeue();
      if (this._key(current) === this._key(endTile)) {
        reached = true;
        goalNode = current;
        break;
      }
      for (const next of this.world.getNeighbors8(current)) {
        if (!next.isWalkable) continue;
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
    let cur = goalNode;
    while (cur) {
      path.push(cur.center.clone());
      cur = cameFrom.get(this._key(cur));
    }
    path.reverse();
    return path.length > 1 ? path : null;
  }
}

export default class Character {
  static main = null;

  static create() {
    if (Character.main) return;
    Character.main = new Character();
    Character.main.init();
  }
  
  constructor() {
    if(Character.main) throw new Error('Character is a singleton.');
    this.object = null;
    this.url = './src/models/character/charatcer.glb';
    this.walkUrl = './src/models/character/animations/walking.glb';
    this.idleUrl = './src/models/character/animations/idle.glb';
    this.viewDistance = 2;
    this._moving = false;
    this._dest = new THREE.Vector3();
    this._speed = 3.0;
    this._epsilon = 0.05;
    this._path = null;
    this._currentWaypointIndex = 0;
    
    this._mixer = null;
    this._actions = {};
    this._activeAction = null;
    
    this.touchState = { startTime: 0, startPos: new THREE.Vector2() };

    this.raycaster = new THREE.Raycaster();
    this.pathfinder = new AStarPathfinder(ChunkManager.instance);
  }

  async init() {
    await this._loadModel();
    await this._loadAnimations();
    this._attachInputListeners();
    Camera.main.setTarget(this.object);
    this._startUpdateLoop();
  }
  
  async _loadModel(position = new THREE.Vector3(0, 0, 2)) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(this.url);
    const root = gltf.scene || gltf.scenes[0];
    if (!root) throw new Error('charatcer.glb has no scene');
    root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    root.position.copy(position);
    scene.add(root);
    this.object = root;
    this._mixer = new THREE.AnimationMixer(this.object);
  }
  
  _attachInputListeners() {
    const domElement = Viewport.instance.domElement;
    domElement.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
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
          this.setAnimation('idle');
        }
      }
    }
    
    this._mixer?.update(dt);
    ChunkManager.instance?.update(this.object.position, this.viewDistance);
    Camera.main?.update();
    GridToggle.main?.update(this.object.position);
  }

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
      this.setAnimation('walk');
    }
  }

  async _loadAnimations() {
    const loader = new GLTFLoader();
    const [idleGltf, walkGltf] = await Promise.all([
      loader.loadAsync(this.idleUrl),
      loader.loadAsync(this.walkUrl)
    ]);
    
    this._actions.idle = this._mixer.clipAction(idleGltf.animations[0]);
    this._actions.walk = this._mixer.clipAction(walkGltf.animations[0]);
    
    // FIX: Set all animations to loop continuously. This is the main fix.
    Object.values(this._actions).forEach(action => {
      action.setLoop(THREE.LoopRepeat);
    });
    
    this.setAnimation('idle');
  }
  
  // FIX: More robust animation transition handler.
  setAnimation(name) {
    const newAction = this._actions[name];
    if (newAction === this._activeAction) {
        return;
    }

    const oldAction = this._activeAction;
    this._activeAction = newAction;

    if (oldAction) {
        // Smoothly fade from the old action to the new one
        this._activeAction.reset();
        oldAction.crossFadeTo(this._activeAction, 0.25, true);
        this._activeAction.play();
    } else {
        // If no animation is active, just play the new one
        this._activeAction.reset().play();
    }
  }
  
  _onTouchStart(e) {
    if (e.touches.length === 1) {
      this.touchState.startTime = performance.now();
      this.touchState.startPos.set(e.touches[0].clientX, e.touches[0].clientY);
    }
  }

  _onTouchEnd(e) {
    if (e.touches.length > 0 || e.changedTouches.length !== 1) {
      return;
    }

    const endPos = new THREE.Vector2(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
    const distance = this.touchState.startPos.distanceTo(endPos);
    const duration = performance.now() - this.touchState.startTime;

    const MAX_TAP_DURATION_MS = 300;
    const MAX_TAP_DISTANCE_PX = 10;

    if (duration < MAX_TAP_DURATION_MS && distance < MAX_TAP_DISTANCE_PX) {
      this._handleTap(e.changedTouches[0]);
    }
  }

  _handleTap(touch) {
    const rect = Viewport.instance.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2( ((touch.clientX - rect.left) / rect.width) * 2 - 1, -((touch.clientY - rect.top) / rect.height) * 2 + 1 );
    this.raycaster.setFromCamera(ndc, Camera.main.threeCamera);
    const hits = this.raycaster.intersectObjects(scene.children, true);
    for (const hit of hits) {
      if (hit.object?.userData?.isLandscape) {
        this._goTo(hit.point);
        break;
      }
    }
  }
}
