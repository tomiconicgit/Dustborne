// file: src/core/logic/charactermovement.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AStarPathfinder } from './pathfinding.js';
import Character from './character.js'; // --- NEW: Import the Character class

export default class CharacterMovement {
  // --- CHANGED: Constructor now takes dependencies and creates the character ---
  constructor(domElement, camera, world) {
    this.domElement = domElement;
    this.camera = camera;
    this.world = world;
    this.scene = world.scene; // Get scene from world

    // This class now creates and owns the player instance
    this.player = new Character(this.scene);
    
    this.raycaster = new THREE.Raycaster();
    this.pathfinder = new AStarPathfinder(world);

    // All internal state remains the same
    this._path = null;
    this._currentWaypointIndex = 0;
    this.touchState = { isDragging: false, startPos: new THREE.Vector2() };
    this.walkUrl = './src/assets/models/animations/walking.glb';
    this.idleUrl = './src/assets/models/animations/idle.glb';
    this._mixer = null;
    this._walkAction = null;
    this._idleAction = null;
    this._walkPlaying = false;
    this._idlePlaying = false;
    this._prewarmed = false;
    this._running = false;
    this._lastT = 0;
  }
  
  // --- NEW: Public getter to allow other systems to get the character's object ---
  get playerObject() {
    return this.player.object;
  }

  // --- NEW: A single entry point to initialize the entire character system ---
  async init() {
    // 1. Load the character model
    await this.player.init(new THREE.Vector3(0, 0, 2));

    // 2. Set the camera target now that the model exists
    this.camera.setTarget(this.player.object);
    
    // 3. Load and prepare all animations. This solves the race condition.
    await this._prewarmAnimations();
    
    // 4. Attach input listeners
    this._attachInputListeners();
    
    // 5. Start the update loop
    this._startTick();
  }

  _startTick() {
      if (this._running) return;
      this._running = true;
      this._lastT = performance.now();
      requestAnimationFrame(this.tick.bind(this));
  }

  tick(t) {
    if (!this._running || !this.player.object) return;
    const dt = Math.min(0.05, (t - this._lastT) / 1000);
    this._lastT = t;
    
    this.player.update(dt);
    this.camera.update();

    if (this._path) {
      if (!this.player.isMoving()) {
        this._currentWaypointIndex++;
        if (this._currentWaypointIndex < this._path.length) {
          this.player.moveTo(this._path[this._currentWaypointIndex]);
        } else {
          this._path = null;
          this.player.cancelActions();
          this._startIdle().catch((err) => console.error('Failed to start idle:', err));
        }
      }
    } else if (!this.player.isMoving()) {
      if (!this._idlePlaying) {
        this._startIdle().catch((err) => console.error('Failed to start idle:', err));
      }
    }

    if (this._mixer) this._mixer.update(dt);
    requestAnimationFrame(this.tick.bind(this));
  }
  
  _attachInputListeners() {
      this._onStart = this.onTouchStart.bind(this);
      this._onMove  = this.onTouchMove.bind(this);
      this._onEnd   = this.onTouchEnd.bind(this);
      this.domElement.addEventListener('touchstart', this._onStart, { passive: false });
      this.domElement.addEventListener('touchmove',  this._onMove,  { passive: false });
      this.domElement.addEventListener('touchend',   this._onEnd,   { passive: false });
  }

  // --- Input handlers remain the same ---
  onTouchStart(e) { /* ... same as before ... */ }
  onTouchMove(e) { /* ... same as before ... */ }
  onTouchEnd(e) { /* ... same as before ... */ }
  async handleTap(touch) { /* ... same as before ... */ }
  _goTo(targetCenter) { /* ... same as before ... */ }

  // --- Animation helpers are now private and used internally by init ---
  async _ensureMixer() { /* ... same as before ... */ }
  async _loadClip(url) { /* ... same as before ... */ }
  async _ensureIdle() { /* ... same as before ... */ }
  async _ensureWalk() { /* ... same as before ... */ }

  async _prewarmAnimations() {
    if (this._prewarmed || !this.player.object) return;
    this._mixer = new THREE.AnimationMixer(this.player.object); // Create mixer here
    await Promise.all([this._ensureIdle(), this._ensureWalk()]);

    this._idleAction.reset().setLoop(THREE.LoopRepeat).play();
    this._walkAction.reset().setLoop(THREE.LoopRepeat).play();
    this._idleAction.setEffectiveWeight(1);
    this._walkAction.setEffectiveWeight(0);
    this._idlePlaying = true;
    this._walkPlaying = false;
    
    this._mixer.update(0); // Evaluate pose once
    this._prewarmed = true;
  }
  
  async _startIdle() { /* ... same as before ... */ }
  async _startWalk() { /* ... same as before ... */ }

  // --- OMITTED CODE IS UNCHANGED, PASTE THE FOLLOWING FUNCTIONS IN ---
  onTouchStart(e) { e.preventDefault(); if (e.touches.length === 1) { this.touchState.isDragging = false; this.touchState.startPos.set(e.touches[0].clientX, e.touches[0].clientY); } }
  onTouchMove(e) { e.preventDefault(); if (e.touches.length !== 1) return; const currentPos = new THREE.Vector2(e.touches[0].clientX, e.touches[0].clientY); if (this.touchState.startPos.distanceTo(currentPos) > 10) { this.touchState.isDragging = true; } }
  onTouchEnd(e) { e.preventDefault(); if (!this.touchState.isDragging && e.changedTouches.length === 1 && e.touches.length === 0) { this.handleTap(e.changedTouches[0]); } this.touchState.isDragging = false; }
  async handleTap(touch) { if (!this.camera?.threeCamera || !this.player?.object || !this.domElement) return; const rect = this.domElement.getBoundingClientRect(); const ndc = new THREE.Vector2( ((touch.clientX - rect.left) / rect.width) * 2 - 1, -((touch.clientY - rect.top) / rect.height) * 2 + 1 ); this.raycaster.setFromCamera(ndc, this.camera.threeCamera); const hits = this.raycaster.intersectObjects(this.scene.children, true); let groundPoint = null; for (const hit of hits) { if (hit.object?.userData?.isLandscape) { groundPoint = hit.point; break; } } if (!groundPoint) return; const endTile = this.world.getTileAt(groundPoint); if (!endTile || !endTile.isWalkable) return; this._goTo(endTile.center); }
  _goTo(targetCenter) { const path = this.pathfinder.findPath(this.player.object.position, targetCenter); if (path && path.length > 0) { this.player.showTapMarkerAt?.(targetCenter); this._path = path; this._currentWaypointIndex = 0; this.player.moveTo(this._path[0]); this._startWalk().catch((err) => console.error('Failed to start walk:', err)); } }
  async _ensureMixer() { if (!this._mixer && this.player?.object) { this._mixer = new THREE.AnimationMixer(this.player.object); } return this._mixer; }
  async _loadClip(url) { const gltf = await new GLTFLoader().loadAsync(url); const clip = gltf.animations?.[0]; if (!clip) throw new Error(`No animation in ${url}`); return clip; }
  async _ensureIdle() { await this._ensureMixer(); if (!this._idleAction) { const clip = await this._loadClip(this.idleUrl); this._idleAction = this._mixer.clipAction(clip); } }
  async _ensureWalk() { await this._ensureMixer(); if (!this._walkAction) { const clip = await this._loadClip(this.walkUrl); this._walkAction = this._mixer.clipAction(clip); } }
  async _startIdle() { if (!this._idleAction) await this._ensureIdle(); if (this._walkAction && this._walkPlaying) { this._idleAction.reset().crossFadeFrom(this._walkAction, 0.25, false); this._walkPlaying = false; } else if (!this._idlePlaying) { this._idleAction.play(); this._idleAction.fadeIn(0.25); } this._idlePlaying = true; }
  async _startWalk() { if (!this._walkAction) await this._ensureWalk(); if (this._idleAction && this._idlePlaying) { this._walkAction.reset().crossFadeFrom(this._idleAction, 0.25, false); this._idlePlaying = false; } else if (!this._walkPlaying) { this._walkAction.play(); this._walkAction.fadeIn(0.25); } this._walkPlaying = true; }
}
