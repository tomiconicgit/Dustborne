// file: src/core/logic/charactermovement.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { AStarPathfinder } from './pathfinding.js';

export default class CharacterMovement {
  constructor(domElement, game, camera, player, world) {
    this.domElement = domElement; // Can be initially null
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
    this._running = true;
    this._lastT = performance.now();
    requestAnimationFrame(this.tick.bind(this));
  }

  // ** THE FIX **: Pre-load all animations before the game starts.
  async initAnimations() {
    this._mixer = new THREE.AnimationMixer(this.player.object);
    const loader = new GLTFLoader();
    const [idleGltf, walkGltf] = await Promise.all([
        loader.loadAsync(this.idleUrl),
        loader.loadAsync(this.walkUrl)
    ]);
    this._idleAction = this._mixer.clipAction(idleGltf.animations[0]);
    this._walkAction = this._mixer.clipAction(walkGltf.animations[0]);
    this._idleAction.play(); // Start idling immediately.
  }

  // Connect event listeners after the viewport is created.
  connect(domElement) {
    this.domElement = domElement;
    this._onStart = this.onTouchStart.bind(this);
    this._onMove  = this.onTouchMove.bind(this);
    this._onEnd   = this.onTouchEnd.bind(this);
    this.domElement.addEventListener('touchstart', this._onStart, { passive: false });
    this.domElement.addEventListener('touchmove',  this._onMove,  { passive: false });
    this.domElement.addEventListener('touchend',   this._onEnd,   { passive: false });
  }

  tick(t) {
    const dt = Math.min(0.05, (t - this._lastT) / 1000);
    this._lastT = t;

    this._mixer?.update(dt);
    this.player?.update(dt);
    this.camera?.update();

    if (this._path && !this.player.isMoving()) {
      this._currentWaypointIndex++;
      // ** THE FIX **: Corrected typo from this.path to this._path.
      if (this._currentWaypointIndex < this._path.length) {
        this.player.moveTo(this._path[this._currentWaypointIndex]);
      } else {
        this._path = null;
        this.player.cancelActions();
        this._startIdle();
      }
    }
  }
  
  onTouchStart(e) {
    if (e.touches.length === 1) {
      this.touchState.isDragging = false;
      this.touchState.startPos.set(e.touches[0].clientX, e.touches[0].clientY);
    }
  }
  onTouchMove(e) {
    if (e.touches.length !== 1 || this.touchState.isDragging) return;
    const currentPos = new THREE.Vector2(e.touches[0].clientX, e.touches[0].clientY);
    if (this.touchState.startPos.distanceTo(currentPos) > 10) {
      this.touchState.isDragging = true;
    }
  }
  onTouchEnd(e) {
    if (!this.touchState.isDragging && e.changedTouches.length === 1) {
      this.handleTap(e.changedTouches[0]);
    }
    this.touchState.isDragging = false;
  }

  async handleTap(touch) {
    if (!this.camera?.threeCamera || !this.player?.object) return;
    const tapNDC = new THREE.Vector2((touch.clientX/window.innerWidth)*2-1,-(touch.clientY/window.innerHeight)*2+1);
    this.raycaster.setFromCamera(tapNDC, this.camera.threeCamera);
    
    const hits = this.raycaster.intersectObjects(this.game.scene.children, true);
    const landscapeHit = hits.find(h => h.object.userData.isLandscape);

    if (!landscapeHit) return;
    const endTile = this.world.getTileAt(landscapeHit.point);
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
      this._startWalk();
    }
  }

  // Animation helpers are now synchronous and use cross-fading.
  _startIdle() {
    this._walkAction.crossFadeTo(this._idleAction, 0.3, true);
    this._idleAction.play();
  }
  _startWalk() {
    this._idleAction.crossFadeTo(this._walkAction, 0.3, true);
    this._walkAction.play();
  }
}
