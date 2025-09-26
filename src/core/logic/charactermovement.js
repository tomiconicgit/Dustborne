// file: src/core/logic/charactermovement.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default class CharacterMovement {
  constructor(domElement, game, camera, player, landscape) {
    this.domElement = domElement;
    this.game = game;                 // { scene }
    this.camera = camera;             // Camera instance (with .threeCamera)
    this.player = player;             // Character instance (must expose .object THREE.Object3D)
    this.landscape = landscape;       // WorldEngine.getLandscapeProxy()
    this.raycaster = new THREE.Raycaster();

    this.touchState = { isDragging: false, startPos: new THREE.Vector2() };

    // --- Walking animation state (owned here) ---
    this.walkUrl = './src/assets/models/animations/walking.glb';
    this._mixer = null;
    this._walkClip = null;
    this._walkAction = null;
    this._walkPromise = null;
    this._isWalking = false;

    // Track the current tap destination to know when to stop walking
    this._activeDest = null;
    this._epsilon = 0.06;

    this._onStart = this.onTouchStart.bind(this);
    this._onMove  = this.onTouchMove.bind(this);
    this._onEnd   = this.onTouchEnd.bind(this);

    this.domElement.addEventListener('touchstart', this._onStart, { passive: false });
    this.domElement.addEventListener('touchmove',  this._onMove,  { passive: false });
    this.domElement.addEventListener('touchend',   this._onEnd,   { passive: false });

    // simple update loop
    this._running = true;
    this._lastT = performance.now();
    const tick = (t) => {
      if (!this._running) return;
      const dt = Math.min(0.05, (t - this._lastT) / 1000); // clamp dt
      this._lastT = t;

      // ensure mixer exists once the character object is ready
      if (!this._mixer && this.player?.object) {
        this._mixer = new THREE.AnimationMixer(this.player.object);
      }

      // advance animation
      if (this._mixer) this._mixer.update(dt);

      // drive character movement/camera
      this.player?.update(dt);
      this.camera?.update();

      // stop walking when we arrive at destination (guarded by epsilon)
      if (this._activeDest && this.player?.object) {
        const pos = this.player.object.position;
        if (pos.distanceToSquared(this._activeDest) <= this._epsilon * this._epsilon) {
          this._stopWalk();
          this._activeDest = null;
        }
      }

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  dispose() {
    this._running = false;
    this.domElement.removeEventListener('touchstart', this._onStart);
    this.domElement.removeEventListener('touchmove',  this._onMove);
    this.domElement.removeEventListener('touchend',   this._onEnd);
    try { this._walkAction?.stop(); } catch {}
    this._mixer = null;
  }

  // ---- Touch handling -------------------------------------------------------

  onTouchStart(event) {
    if (event.touches.length === 1) {
      this.touchState.isDragging = false;
      this.touchState.startPos.set(event.touches[0].clientX, event.touches[0].clientY);
    }
  }

  onTouchMove(event) {
    if (event.touches.length !== 1) return;
    const currentPos = new THREE.Vector2(event.touches[0].clientX, event.touches[0].clientY);
    if (this.touchState.startPos.distanceTo(currentPos) > 10) {
      this.touchState.isDragging = true;
    }
  }

  onTouchEnd(event) {
    if (!this.touchState.isDragging && event.changedTouches.length === 1 && event.touches.length === 0) {
      this.handleTap(event.changedTouches[0]);
    }
    this.touchState.isDragging = false;
  }

  // ---- Tap-to-move + animation ---------------------------------------------

  async handleTap(touch) {
    if (!this.camera?.threeCamera) return;

    const tapNDC = new THREE.Vector2(
      (touch.clientX / window.innerWidth) * 2 - 1,
      -(touch.clientY / window.innerHeight) * 2 + 1
    );

    this.raycaster.setFromCamera(tapNDC, this.camera.threeCamera);
    const intersects = this.raycaster.intersectObjects(this.game.scene.children, true);

    let landscapeHit = null;

    for (const hit of intersects) {
      if (hit.object?.userData?.isMineable) {
        this.player.setHighlightedObject?.(hit.object);
        this.player.startMining?.(hit.object);
        return;
      }
      if (this.landscape?.mesh?.children?.includes(hit.object)) {
        if (!landscapeHit) landscapeHit = hit;
      }
    }

    if (!landscapeHit || !this.player?.object) return;

    // Face the destination immediately
    const dest = landscapeHit.point.clone();
    dest.y = this.player.object.position.y; // keep to ground plane
    const pos = this.player.object.position;
    const yaw = Math.atan2(dest.x - pos.x, dest.z - pos.z);
    this.player.object.rotation.set(0, yaw, 0);

    // Visual tap feedback (if provided by player)
    this.player.showTapMarkerAt?.(dest);

    // Move the character (character.js owns the translation each frame)
    this.player.cancelActions?.();    // stop mining etc.
    this.player.moveTo?.(dest);

    // Track destination locally to stop animation when we arrive
    this._activeDest = dest.clone();

    // Start walking animation
    await this._startWalk();
  }

  // ---- Animation utils ------------------------------------------------------

  async _startWalk() {
    if (!this.player?.object) return;

    // Ensure mixer (in case character became ready just now)
    if (!this._mixer) this._mixer = new THREE.AnimationMixer(this.player.object);

    // Ensure clip/action
    if (!this._walkClip || !this._walkAction) {
      await this._loadWalkClip();
      if (!this._walkAction) return; // failed to load
    }

    if (this._isWalking) return;
    try {
      this._walkAction.reset();
      this._walkAction.fadeIn(0.15);
      this._walkAction.play();
      this._walkAction.timeScale = 1.0; // tweak foot speed if desired
      this._isWalking = true;
    } catch (e) {
      console.warn('[CharacterMovement] could not play walk:', e);
    }
  }

  _stopWalk() {
    if (!this._walkAction || !this._isWalking) return;
    try {
      this._walkAction.fadeOut(0.12);
      setTimeout(() => { try { this._walkAction.stop(); } catch {} }, 140);
    } catch {}
    this._isWalking = false;
  }

  async _loadWalkClip() {
    if (this._walkPromise) return this._walkPromise;
    const loader = new GLTFLoader();
    this._walkPromise = loader.loadAsync(this.walkUrl).then(gltf => {
      const clips = gltf.animations || [];
      if (!clips.length) throw new Error('walking.glb contains no animations');
      const named = clips.find(c => /walk/i.test(c.name));
      this._walkClip = named || clips[0];

      if (this._mixer && this._walkClip) {
        this._walkAction = this._mixer.clipAction(this._walkClip);
        this._walkAction.loop = THREE.LoopRepeat;
        this._walkAction.clampWhenFinished = false;
        this._walkAction.enabled = true;
      }
    }).catch(err => {
      console.warn('[CharacterMovement] Failed to load walking animation:', err);
    });
    return this._walkPromise;
  }
}