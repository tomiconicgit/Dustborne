// file: src/core/logic/charactermovement.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AStarPathfinder } from './pathfinding.js'; // ✨ NEW: Import the pathfinder

export default class CharacterMovement {
  // ✨ UPDATED: Constructor accepts the `world` object for pathfinding
  constructor(domElement, game, camera, player, landscape, world) {
    this.domElement = domElement;
    this.game = game;
    this.camera = camera;
    this.player = player;
    this.landscape = landscape;
    this.world = world; // Keep a reference to the world
    this.raycaster = new THREE.Raycaster();

    // ✨ NEW: Pathfinding and path following state
    this.pathfinder = new AStarPathfinder(world);
    this._path = null;
    this._currentWaypointIndex = 0;

    this.touchState = { isDragging: false, startPos: new THREE.Vector2() };

    // Animation state (unchanged)
    this.walkUrl = './src/assets/models/animations/walking.glb';
    this.idleUrl = './src/assets/models/animations/idle.glb';
    this._mixer = null;
    this._walkAction = null;
    this._idleAction = null;
    this._isWalking = false;
    this._isIdling = false;

    this._onStart = this.onTouchStart.bind(this);
    this._onMove  = this.onTouchMove.bind(this);
    this._onEnd   = this.onTouchEnd.bind(this);
    this.domElement.addEventListener('touchstart', this._onStart, { passive: false });
    this.domElement.addEventListener('touchmove',  this._onMove,  { passive: false });
    this.domElement.addEventListener('touchend',   this._onEnd,   { passive: false });

    this._running = true;
    this._lastT = performance.now();
    requestAnimationFrame(this.tick.bind(this));
  }
  
  // ✨ NEW: Main tick loop now handles path following
  tick(t) {
    if (!this._running) return;
    const dt = Math.min(0.05, (t - this._lastT) / 1000);
    this._lastT = t;

    if (!this._mixer && this.player?.object) {
      this._mixer = new THREE.AnimationMixer(this.player.object);
    }
    if (this._mixer) this._mixer.update(dt);

    this.player?.update(dt);
    this.camera?.update();
    
    // Path following logic
    if (this._path) {
      if (!this.player.isMoving()) {
        // Player has reached the current waypoint, advance to the next one
        this._currentWaypointIndex++;
        if (this._currentWaypointIndex < this._path.length) {
          const nextWaypoint = this._path[this._currentWaypointIndex];
          this.player.moveTo(nextWaypoint);
        } else {
          // End of path reached
          this._path = null;
        }
      }
    }

    // Animation control based on path state
    const shouldBeWalking = this._path !== null;
    if (shouldBeWalking && !this._isWalking) {
      this._startWalk();
    } else if (!shouldBeWalking && this._isWalking) {
      this._stopWalk();
      this._startIdle();
    }
    
    if (!shouldBeWalking && !this._isIdling) {
        this._startIdle();
    }

    requestAnimationFrame(this.tick.bind(this));
  }

  dispose() { /* ... unchanged ... */ }
  onTouchStart(event) { /* ... unchanged ... */ }
  onTouchMove(event) { /* ... unchanged ... */ }
  onTouchEnd(event) {
    if (!this.touchState.isDragging && event.changedTouches.length === 1 && event.touches.length === 0) {
      this.handleTap(event.changedTouches[0]);
    }
    this.touchState.isDragging = false;
  }

  // ✨ UPDATED: handleTap now uses the pathfinder
  async handleTap(touch) {
    if (!this.camera?.threeCamera || !this.player?.object) return;

    const tapNDC = new THREE.Vector2(
      (touch.clientX / window.innerWidth) * 2 - 1,
      -(touch.clientY / window.innerHeight) * 2 + 1
    );

    this.raycaster.setFromCamera(tapNDC, this.camera.threeCamera);
    const intersects = this.raycaster.intersectObjects(this.game.scene.children, true);
    
    let landscapeHit = null;
    for (const hit of intersects) {
      if (hit.object.userData.isMineable) {
        // Future: Pathfind to a tile adjacent to the rock
        console.log("Tapped on a mineable rock.");
        return;
      }
      if (this.landscape?.mesh?.children?.includes(hit.object)) {
        if (!landscapeHit) landscapeHit = hit;
      }
    }
    
    if (!landscapeHit) return;

    const startPos = this.player.object.position;
    const endPos = landscapeHit.point;
    
    // Find a path using the A* algorithm
    const path = this.pathfinder.findPath(startPos, endPos);

    if (path && path.length > 0) {
      this.player.showTapMarkerAt?.(endPos);
      this._path = path;
      this._currentWaypointIndex = 0;
      this.player.moveTo(this._path[0]); // Start moving to the first waypoint
    } else {
      console.warn("No path found to the destination.");
      // Optional: show some feedback that the location is unreachable
    }
  }

  // Animation utility functions (_startIdle, _stopIdle, etc.) are mostly unchanged
  // ... (paste the existing animation methods here)
  async _startIdle() { /* ... */ }
  _stopIdle() { /* ... */ }
  async _startWalk() { /* ... */ }
  _stopWalk() { /* ... */ }
  async _loadWalkClip() { /* ... */ }
  async _loadIdleClip() { /* ... */ }
}
