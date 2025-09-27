// file: src/core/logic/charactermovement.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AStarPathfinder } from './pathfinding.js';

export default class CharacterMovement {
  constructor({ camera, player, world }) {
    this.domElement = null;
    this.game = { scene: player.scene };
    this.camera = camera;
    this.player = player;
    this.world = world;
    this.raycaster = new THREE.Raycaster();

    this.pathfinder = new AStarPathfinder(world);
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
  
  setDomElement(domElement) {
      this.domElement = domElement;
      this._onStart = this.onTouchStart.bind(this);
      this._onMove  = this.onTouchMove.bind(this);
      this._onEnd   = this.onTouchEnd.bind(this);
      this.domElement.addEventListener('touchstart', this._onStart, { passive: false });
      this.domElement.addEventListener('touchmove',  this._onMove,  { passive: false });
      this.domElement.addEventListener('touchend',   this._onEnd,   { passive: false });
  }
  
  startTick() {
      if (this._running) return;
      this._running = true;
      this._lastT = performance.now();
      requestAnimationFrame(this.tick.bind(this));
  }

  tick(t) {
    if (!this._running) return;
    const dt = Math.min(0.05, (t - this._lastT) / 1000);
    this._lastT = t;
    
    this.player?.update(dt);
    this.camera?.update();

    // --- LOGIC FIX STARTS HERE ---
    // This logic ensures we only check for idling if there's no active path.
    if (this._path) {
      // If we have a path and we've stopped, it means we reached a waypoint.
      if (!this.player.isMoving()) {
        this._currentWaypointIndex++;
        // Check if there are more waypoints in the path.
        if (this._currentWaypointIndex < this._path.length) {
          // If yes, simply move to the next one. Do NOT change animation state.
          this.player.moveTo(this._path[this._currentWaypointIndex]);
        } else {
          // If no, the path is complete. Clear the path and command the idle animation.
          this._path = null;
          this.player.cancelActions();
          this._startIdle().catch((err) => console.error('Failed to start idle:', err));
        }
      }
    } else if (!this.player.isMoving()) {
      // This block now ONLY runs if there is NO path and the player is not moving.
      // This is the correct condition to start the idle animation.
      if (!this._idlePlaying) {
        this._startIdle().catch((err) => console.error('Failed to start idle:', err));
      }
    }
    // --- LOGIC FIX ENDS HERE ---

    if (this._mixer) this._mixer.update(dt);

    requestAnimationFrame(this.tick.bind(this));
  }

  // ---------- Input ----------
  onTouchStart(e) {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.touchState.isDragging = false;
      this.touchState.startPos.set(e.touches[0].clientX, e.touches[0].clientY);
    }
  }
  onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    const currentPos = new THREE.Vector2(e.touches[0].clientX, e.touches[0].clientY);
    if (this.touchState.startPos.distanceTo(currentPos) > 10) {
      this.touchState.isDragging = true;
    }
  }
  onTouchEnd(e) {
    e.preventDefault();
    if (!this.touchState.isDragging && e.changedTouches.length === 1 && e.touches.length === 0) {
      this.handleTap(e.changedTouches[0]);
    }
    this.touchState.isDragging = false;
  }

  async handleTap(touch) {
    if (!this.camera?.threeCamera || !this.player?.object || !this.domElement) return;
    const rect = this.domElement.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((touch.clientX - rect.left) / rect.width) * 2 - 1,
      -((touch.clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera.threeCamera);

    const hits = this.raycaster.intersectObjects(this.game.scene.children, true);
    let groundPoint = null;
    for (const hit of hits) {
      if (hit.object?.userData?.isLandscape) { groundPoint = hit.point; break; }
    }
    if (!groundPoint) return;

    const endTile = this.world.getTileAt(groundPoint);
    if (!endTile || !endTile.isWalkable) return;

    this._goTo(endTile.center);
  }

  _goTo(targetCenter) {
    const path = this.pathfinder.findPath(this.player.object.position, targetCenter);
    if (path && path.length > 0) {
      this.player.showTapMarkerAt?.(targetCenter);
      this._path = path;
      this._currentWaypointIndex = 0;
      this.player.moveTo(this._path[0]);

      // This is only called ONCE at the start of a new path.
      this._startWalk().catch((err) => console.error('Failed to start walk:', err));
    }
  }

  // ---------- Anim helpers ----------
  async _ensureMixer() {
    if (!this._mixer && this.player?.object) {
      this._mixer = new THREE.AnimationMixer(this.player.object);
    }
    return this._mixer;
  }
  async _loadClip(url) {
    const gltf = await new GLTFLoader().loadAsync(url);
    const clip = gltf.animations?.[0];
    if (!clip) throw new Error(`No animation in ${url}`);
    return clip;
  }
  async _ensureIdle() {
    await this._ensureMixer();
    if (!this._idleAction) {
      const clip = await this._loadClip(this.idleUrl);
      this._idleAction = this._mixer.clipAction(clip);
    }
  }
  async _ensureWalk() {
    await this._ensureMixer();
    if (!this._walkAction) {
      const clip = await this._loadClip(this.walkUrl);
      this._walkAction = this._mixer.clipAction(clip);
    }
  }

  async prewarmAnimations() {
    if (this._prewarmed) return;
    await Promise.all([this._ensureIdle(), this._ensureWalk()]);

    this._idleAction.reset().setLoop(THREE.LoopRepeat).play();
    this._walkAction.reset().setLoop(THREE.LoopRepeat).play();
    this._idleAction.enabled = true;
    this._walkAction.enabled = true;
    this._idleAction.setEffectiveWeight(1);
    this._walkAction.setEffectiveWeight(0);
    this._idlePlaying = true;
    this._walkPlaying = false;
    
    this._mixer.update(0);
    this._prewarmed = true;
  }

  async _startIdle() {
    if (!this._idleAction) await this._ensureIdle();
    
    if (this._walkAction && this._walkPlaying) {
      this._idleAction.reset().crossFadeFrom(this._walkAction, 0.25, false);
      this._walkPlaying = false;
    } else if (!this._idlePlaying) {
      this._idleAction.play();
      this._idleAction.fadeIn(0.25);
    }
    this._idlePlaying = true;
  }

  async _startWalk() {
    if (!this._walkAction) await this._ensureWalk();

    if (this._idleAction && this._idlePlaying) {
      this._walkAction.reset().crossFadeFrom(this._idleAction, 0.25, false);
      this._idlePlaying = false;
    } else if (!this._walkPlaying) {
      this._walkAction.play();
      this._walkAction.fadeIn(0.25);
    }
    this._walkPlaying = true;
  }
}
