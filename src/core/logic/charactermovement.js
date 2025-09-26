// file: src/core/logic/charactermovement.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AStarPathfinder } from './pathfinding.js';

export default class CharacterMovement {
  constructor(domElement, game, camera, player, landscape, world) {
    this.domElement = domElement;
    this.game = game;
    this.camera = camera;
    this.player = player;
    this.landscape = landscape;
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

    if (!this._mixer && this.player?.object) {
      this._mixer = new THREE.AnimationMixer(this.player.object);
    }
    if (this._mixer) this._mixer.update(dt);

    this.player?.update(dt);
    this.camera?.update();

    if (this._path) {
      if (!this.player.isMoving()) {
        this._currentWaypointIndex++;
        if (this._currentWaypointIndex < this._path.length) {
          this.player.moveTo(this._path[this._currentWaypointIndex]);
        } else {
          // path complete
          this._path = null;
          this.player.cancelActions();
          this._stopWalk();
          this._startIdle();
        }
      }
    } else {
      // no path; ensure idle is playing
      if (!this.player.isMoving()) {
        if (this._walkPlaying) this._stopWalk();
        if (!this._idlePlaying) this._startIdle();
      }
    }

    requestAnimationFrame(this.tick.bind(this));
  }

  dispose() {
    this.domElement.removeEventListener('touchstart', this._onStart);
    this.domElement.removeEventListener('touchmove',  this._onMove);
    this.domElement.removeEventListener('touchend',   this._onEnd);
  }

  onTouchStart(e) {
    if (e.touches.length === 1) {
      this.touchState.isDragging = false;
      this.touchState.startPos.set(e.touches[0].clientX, e.touches[0].clientY);
    }
  }
  onTouchMove(e) {
    e.preventDefault();
    if (e.touches.length !== 1) return;
    const cur = new THREE.Vector2(e.touches[0].clientX, e.touches[0].clientY);
    if (this.touchState.startPos.distanceTo(cur) > 10) this.touchState.isDragging = true;
  }
  onTouchEnd(e) {
    if (!this.touchState.isDragging && e.changedTouches.length === 1 && e.touches.length === 0) {
      this.handleTap(e.changedTouches[0]);
    }
    this.touchState.isDragging = false;
  }

  async handleTap(touch) {
    if (!this.camera?.threeCamera || !this.player?.object) return;

    const tapNDC = new THREE.Vector2(
      (touch.clientX / window.innerWidth) * 2 - 1,
      -(touch.clientY / window.innerHeight) * 2 + 1
    );

    this.raycaster.setFromCamera(tapNDC, this.camera.threeCamera);
    const hits = this.raycaster.intersectObjects(this.game.scene.children, true);

    let landscapeHit = null;
    for (const hit of hits) {
      if (hit.object?.userData?.isMineable) {
        // Path to closest adjacent walkable tile (8-way grid)
        const rockPos = hit.object.getWorldPosition(new THREE.Vector3());
        const rockTile = this.world.getTileAt(rockPos);
        if (!rockTile) return;

        const adj = this.world.getNeighbors8(rockTile).filter(t => t.isWalkable);
        if (!adj.length) return;

        const startTile = this.world.getTileAt(this.player.object.position) ?? adj[0];
        // choose by octile distance
        const best = adj.reduce((a,b) => {
          const da = Math.max(Math.abs(a.gridX - startTile.gridX), Math.abs(a.gridZ - startTile.gridZ));
          const db = Math.max(Math.abs(b.gridX - startTile.gridX), Math.abs(b.gridZ - startTile.gridZ));
          return db < da ? b : a;
        });

        this._goTo(best.center);
        return;
      }
      if (this.landscape?.mesh?.children?.includes(hit.object)) {
        landscapeHit = hit;
        break;
      }
    }

    if (!landscapeHit) return;

    const endTile = this.world.getTileAt(landscapeHit.point);
    if (!endTile || !endTile.isWalkable) return;

    this._goTo(endTile.center);
  }

  _goTo(targetCenter) {
    const path = this.pathfinder.findPath(this.player.object.position, targetCenter);
    if (path && path.length) {
      this.player.showTapMarkerAt?.(targetCenter);
      this._path = path;
      this._currentWaypointIndex = 0;
      this.player.moveTo(this._path[0]);
      // ensure walking starts immediately
      this._stopIdle();
      this._startWalk();
    }
  }

  // --- animation helpers (track our own playing flags) ---
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

  async _startIdle() {
    await this._ensureMixer();
    if (!this._idleAction) {
      const clip = await this._loadClip(this.idleUrl);
      this._idleAction = this._mixer.clipAction(clip);
      this._idleAction.setLoop(THREE.LoopRepeat);
      this._idleAction.enabled = true;
    }
    if (!this._idlePlaying) {
      if (this._walkAction && this._walkPlaying) this._walkAction.crossFadeTo(this._idleAction, 0.2, false);
      this._idleAction.reset().play();
      this._idlePlaying = true;
    }
  }
  _stopIdle() {
    if (this._idleAction && this._idlePlaying) this._idleAction.stop();
    this._idlePlaying = false;
  }

  async _startWalk() {
    await this._ensureMixer();
    if (!this._walkAction) {
      const clip = await this._loadClip(this.walkUrl);
      this._walkAction = this._mixer.clipAction(clip);
      this._walkAction.setLoop(THREE.LoopRepeat);
      this._walkAction.enabled = true;
    }
    if (!this._walkPlaying) {
      if (this._idleAction && this._idlePlaying) this._idleAction.crossFadeTo(this._walkAction, 0.15, false);
      this._walkAction.reset().play();
      this._walkPlaying = true;
      this._idlePlaying = false;
    }
  }
  _stopWalk() {
    if (this._walkAction && this._walkPlaying) this._walkAction.stop();
    this._walkPlaying = false;
  }
}