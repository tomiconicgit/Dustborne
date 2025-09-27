// file: src/core/logic/charactermovement.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AStarPathfinder } from './pathfinding.js';

export default class CharacterMovement {
  constructor(domElement, game, camera, player, world) {
    this.domElement = domElement;
    this.game = game;
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

  tick(t) {
    if (!this._running) return;
    const dt = Math.min(0.05, (t - this._lastT) / 1000);
    this._lastT = t;

    // Ensure mixer once the character object exists; kick idle immediately.
    if (!this._mixer && this.player?.object) {
      this._mixer = new THREE.AnimationMixer(this.player.object);
      this._startIdle().catch(() => {});
    }
    if (this._mixer) this._mixer.update(dt);

    this.player?.update(dt);
    this.camera?.update();

    if (this._path) {
      // Move along path: when we finish a segment, advance to the next.
      if (!this.player.isMoving()) {
        this._currentWaypointIndex++;
        if (this._currentWaypointIndex < this._path.length) {
          this.player.moveTo(this._path[this._currentWaypointIndex]);
        } else {
          // Arrived at destination
          this._path = null;
          this.player.cancelActions();
          this._stopWalk();
          this._startIdle().catch(() => {});
        }
      }
    } else {
      // No active path: ensure we're idling if not moving
      if (!this.player.isMoving()) {
        if (this._walkPlaying) this._stopWalk();
        if (!this._idlePlaying) this._startIdle().catch(() => {});
      }
    }
    requestAnimationFrame(this.tick.bind(this));
  }

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
    // Only treat as a tap if we didn't drag
    if (!this.touchState.isDragging && e.changedTouches.length === 1 && e.touches.length === 0) {
      this.handleTap(e.changedTouches[0]);
    }
    this.touchState.isDragging = false;
  }

  async handleTap(touch) {
    if (!this.camera?.threeCamera || !this.player?.object) return;
    const ndc = new THREE.Vector2(
      (touch.clientX / window.innerWidth) * 2 - 1,
      -(touch.clientY / window.innerHeight) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera.threeCamera);

    // Raycast world; look specifically for our merged ground meshes
    const hits = this.raycaster.intersectObjects(this.game.scene.children, true);
    let groundPoint = null;
    for (const hit of hits) {
      if (hit.object?.userData?.isLandscape) {
        groundPoint = hit.point;
        break;
      }
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
      this.player.moveTo(this._path[0]); // start with first waypoint
      this._stopIdle();
      this._startWalk().catch(() => {});
    }
  }

  // --- Animation helpers ---
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

  async _startIdle() {
    await this._ensureIdle();
    // Make sure action is started before fading/crossfading
    this._idleAction.reset().setLoop(THREE.LoopRepeat).play();
    if (this._walkAction && this._walkPlaying) {
      this._walkAction.crossFadeTo(this._idleAction, 0.2, true);
      this._walkPlaying = false;
    } else {
      this._idleAction.fadeIn(0.2);
    }
    this._idlePlaying = true;
  }

  _stopIdle() {
    if (this._idleAction && this._idlePlaying) this._idleAction.fadeOut(0.2);
    this._idlePlaying = false;
  }

  async _startWalk() {
    await this._ensureWalk();
    // Start walk action first, then crossfade for reliability across three.js versions
    this._walkAction.reset().setLoop(THREE.LoopRepeat).play();
    if (this._idleAction && this._idlePlaying) {
      this._idleAction.crossFadeTo(this._walkAction, 0.2, true);
      this._idlePlaying = false;
    } else {
      this._walkAction.fadeIn(0.2);
    }
    this._walkPlaying = true;
  }

  _stopWalk() {
    if (this._walkAction && this._walkPlaying) this._walkAction.fadeOut(0.2);
    this._walkPlaying = false;
  }
}