// file: src/core/logic/charactermovement.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export default class CharacterMovement {
  constructor(domElement, game, camera, player, landscape) {
    this.domElement = domElement;
    this.game = game;                 // { scene }
    this.camera = camera;             // Camera instance (with .threeCamera)
    this.player = player;             // Character instance (exposes .object, .moveTo(), .cancelActions(), .update(dt))
    this.landscape = landscape;       // WorldEngine.getLandscapeProxy()
    this.raycaster = new THREE.Raycaster();

    this.touchState = { isDragging: false, startPos: new THREE.Vector2() };

    // Animation assets
    this.walkUrl  = './src/assets/models/animations/walking.glb';
    this.idleUrl  = './src/assets/models/animations/idle.glb';
    this.startUrl = './src/assets/models/animations/startwalking.glb';
    this.stopUrl  = './src/assets/models/animations/stopwalking.glb';

    // Durations (seconds)
    this.START_DUR = 1.9;
    this.STOP_DUR  = 1.9;

    // Mixer & actions
    this._mixer = null;

    this._idleClip = null;  this._idleAction = null;  this._idlePromise = null;   this._isIdling = false;
    this._walkClip = null;  this._walkAction = null;  this._walkPromise = null;   this._isWalking = false;
    this._startClip = null; this._startAction = null; this._startPromise = null;
    this._stopClip = null;  this._stopAction = null;  this._stopPromise = null;

    // Movement planning
    this._activeDest = null;           // THREE.Vector3 or null
    this._dir = new THREE.Vector3();   // travel direction (flat XZ)
    this._epsilon = 0.06;              // arrival tolerance
    this._state = 'idle';              // 'idle' | 'starting' | 'walking' | 'stopping'
    this._scheduledStopTimer = null;   // id for setTimeout to trigger stop

    // Bindings
    this._onStart = this.onTouchStart.bind(this);
    this._onMove  = this.onTouchMove.bind(this);
    this._onEnd   = this.onTouchEnd.bind(this);

    this.domElement.addEventListener('touchstart', this._onStart, { passive: false });
    this.domElement.addEventListener('touchmove',  this._onMove,  { passive: false });
    this.domElement.addEventListener('touchend',   this._onEnd,   { passive: false });

    // Update loop
    this._running = true;
    this._lastT = performance.now();

    // Mixer event hooks (watch for start/stop completion)
    this._onMixerFinished = (e) => {
      if (!e?.action) return;
      if (e.action === this._startAction && this._state === 'starting') {
        this._onStartAnimFinished();
      } else if (e.action === this._stopAction && this._state === 'stopping') {
        this._onStopAnimFinished();
      }
    };

    const tick = (t) => {
      if (!this._running) return;
      const dt = Math.min(0.05, (t - this._lastT) / 1000);
      this._lastT = t;

      // ensure mixer (once the model exists)
      if (!this._mixer && this.player?.object) {
        this._mixer = new THREE.AnimationMixer(this.player.object);
        this._mixer.addEventListener('finished', this._onMixerFinished);
      }

      // drive animation
      if (this._mixer) this._mixer.update(dt);

      // drive character + camera
      this.player?.update(dt);
      this.camera?.update();

      // ensure idle by default when standing
      if (this.player?.object && this._state === 'idle' && !this._isIdling) {
        this._startIdle();
      }

      // safety: if walking but we reached destination earlier than timer predicted
      if (this._state === 'walking' && this._activeDest && this.player?.object) {
        const pos = this.player.object.position;
        if (pos.distanceToSquared(this._activeDest) <= this._epsilon * this._epsilon) {
          // immediate stop sequence
          this._beginStopNow();
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
    if (this._mixer) this._mixer.removeEventListener('finished', this._onMixerFinished);
    this._clearStopTimer();
    try { this._idleAction?.stop(); } catch {}
    try { this._walkAction?.stop(); } catch {}
    try { this._startAction?.stop(); } catch {}
    try { this._stopAction?.stop(); } catch {}
    this._mixer = null;
  }

  // ---------------------------------------------------------------------------
  // Touch handling
  // ---------------------------------------------------------------------------

  onTouchStart(event) {
    if (event.touches.length === 1) {
      this.touchState.isDragging = false;
      this.touchState.startPos.set(event.touches[0].clientX, event.touches[0].clientY);
    }
  }

  onTouchMove(event) {
    if (event.touches.length !== 1) return;
    const p = new THREE.Vector2(event.touches[0].clientX, event.touches[0].clientY);
    if (this.touchState.startPos.distanceTo(p) > 10) this.touchState.isDragging = true;
  }

  onTouchEnd(event) {
    if (!this.touchState.isDragging && event.changedTouches.length === 1 && event.touches.length === 0) {
      this.handleTap(event.changedTouches[0]);
    }
    this.touchState.isDragging = false;
  }

  // ---------------------------------------------------------------------------
  // Tap-to-move entry
  // ---------------------------------------------------------------------------

  async handleTap(touch) {
    if (!this.camera?.threeCamera) return;

    const ndc = new THREE.Vector2(
      (touch.clientX / window.innerWidth) * 2 - 1,
      -(touch.clientY / window.innerHeight) * 2 + 1
    );

    this.raycaster.setFromCamera(ndc, this.camera.threeCamera);
    const hits = this.raycaster.intersectObjects(this.game.scene.children, true);

    let landscapeHit = null;
    for (const h of hits) {
      if (h.object?.userData?.isMineable) {
        this.player.setHighlightedObject?.(h.object);
        this.player.startMining?.(h.object);
        return;
      }
      if (this.landscape?.mesh?.children?.includes(h.object) && !landscapeHit) landscapeHit = h;
    }
    if (!landscapeHit || !this.player?.object) return;

    // Aim & feedback
    const dest = landscapeHit.point.clone();
    dest.y = this.player.object.position.y;
    const pos = this.player.object.position;
    const yaw = Math.atan2(dest.x - pos.x, dest.z - pos.z);
    this.player.object.rotation.set(0, yaw, 0);
    this.player.showTapMarkerAt?.(dest);

    // Cancel any in-flight movement / timers / anims
    this._clearStopTimer();
    this.player.cancelActions?.();

    // Plan
    this._activeDest = dest.clone();
    this._dir.set(dest.x - pos.x, 0, dest.z - pos.z).normalize();

    // Sequence: START (no physical move) -> WALK (physical) -> STOP (no physical)
    await this._startStartWalk(); // kicks off; completion handled by mixer "finished"
  }

  // ---------------------------------------------------------------------------
  // Sequencing helpers
  // ---------------------------------------------------------------------------

  _speed() {
    // use character's speed if present, else default
    return (this.player && typeof this.player._speed === 'number') ? this.player._speed : 3.0;
  }

  _clearStopTimer() {
    if (this._scheduledStopTimer) {
      clearTimeout(this._scheduledStopTimer);
      this._scheduledStopTimer = null;
    }
  }

  _scheduleStop(remainingDist) {
    this._clearStopTimer();
    const v = this._speed();
    const timeToStopStart = Math.max(0, (remainingDist - v * this.STOP_DUR) / v); // seconds
    this._scheduledStopTimer = setTimeout(() => {
      // Only if we're still walking to the same destination
      if (this._state === 'walking' && this._activeDest) this._beginStopNow();
    }, timeToStopStart * 1000);
  }

  _beginStopNow() {
    if (!this.player?.object || !this._activeDest) return;

    // Halt physical movement & snap to final destination "behind the scenes"
    this.player.cancelActions?.();
    this.player.object.position.copy(this._activeDest);

    // switch animations: walk -> stop
    this._stopWalkImmediate();
    this._startStopWalk(); // completion will trigger idle
  }

  // ---------------------------------------------------------------------------
  // Animation state transitions
  // ---------------------------------------------------------------------------

  async _startIdle() {
    if (!this.player?.object) return;
    if (!this._mixer) this._mixer = new THREE.AnimationMixer(this.player.object);
    if (!this._idleClip || !this._idleAction) {
      await this._loadIdleClip();
      if (!this._idleAction) return;
    }
    // fade from whatever is active
    try {
      this._idleAction.reset();
      this._idleAction.enabled = true;
      this._idleAction.fadeIn(0.15);
      this._idleAction.play();
      this._idleAction.timeScale = 1.0;
      this._isIdling = true;
      this._state = 'idle';
    } catch (e) {
      console.warn('[CharacterMovement] idle play failed:', e);
    }
  }

  _stopIdleImmediate() {
    if (!this._idleAction) return;
    try { this._idleAction.stop(); } catch {}
    this._isIdling = false;
  }

  async _startStartWalk() {
    if (!this.player?.object) return;
    if (!this._mixer) this._mixer = new THREE.AnimationMixer(this.player.object);
    if (!this._startClip || !this._startAction) {
      await this._loadStartClip();
      if (!this._startAction) return;
    }

    // fade out idle/walk/stop quickly; start the "start" anim (no physical motion)
    this._stopIdleImmediate();
    this._stopWalkImmediate(true);
    try {
      this._startAction.reset();
      this._startAction.setLoop(THREE.LoopOnce, 1);
      this._startAction.clampWhenFinished = true;
      this._startAction.enabled = true;
      this._startAction.fadeIn(0.12);
      this._startAction.play();
      this._state = 'starting';
    } catch (e) {
      console.warn('[CharacterMovement] start-walk play failed, fallback to walk:', e);
      this._onStartAnimFinished(); // fallback straight to walking
    }
  }

  _onStartAnimFinished() {
    if (!this.player?.object || !this._activeDest) return;

    // Compute "virtual advance" over START_DUR, then snap to that point now
    const v = this._speed();
    const startAdvance = v * this.START_DUR;

    const pos = this.player.object.position.clone();
    const toDest = new THREE.Vector3().subVectors(this._activeDest, pos);
    const dist = toDest.length();
    const advance = Math.min(dist, startAdvance);

    if (advance > 0 && this._dir.lengthSq() > 0) {
      const snapped = pos.addScaledVector(this._dir, advance);
      this.player.object.position.copy(snapped);
    }

    // Remaining after snap
    const remaining = this.player.object.position.distanceTo(this._activeDest);

    if (remaining <= this._epsilon) {
      // We're effectively there → play stop immediately (no physical)
      this.player.object.position.copy(this._activeDest);
      this._startStopWalk();
      return;
    }

    // Begin actual physical movement + walking loop
    this.player.moveTo?.(this._activeDest);
    this._startWalk();
    this._state = 'walking';

    // Pre-schedule STOP to begin 1.9s before arrival
    this._scheduleStop(remaining);
  }

  async _startWalk() {
    if (!this.player?.object) return;
    if (!this._mixer) this._mixer = new THREE.AnimationMixer(this.player.object);
    if (!this._walkClip || !this._walkAction) {
      await this._loadWalkClip();
      if (!this._walkAction) return;
    }
    try {
      this._walkAction.reset();
      this._walkAction.enabled = true;
      this._walkAction.fadeIn(0.12);
      this._walkAction.play();
      this._walkAction.timeScale = 1.0;
      this._isWalking = true;
      this._isIdling = false;
    } catch (e) {
      console.warn('[CharacterMovement] walk play failed:', e);
    }
  }

  _stopWalkImmediate(noFade = false) {
    if (!this._walkAction) return;
    try {
      if (noFade) this._walkAction.stop();
      else { this._walkAction.fadeOut(0.1); setTimeout(() => { try { this._walkAction.stop(); } catch {} }, 120); }
    } catch {}
    this._isWalking = false;
  }

  async _startStopWalk() {
    if (!this.player?.object) return;
    if (!this._mixer) this._mixer = new THREE.AnimationMixer(this.player.object);
    if (!this._stopClip || !this._stopAction) {
      await this._loadStopClip();
      if (!this._stopAction) { this._startIdle(); return; }
    }

    // Ensure physical move is halted and snapped to destination
    this.player.cancelActions?.();
    if (this._activeDest) this.player.object.position.copy(this._activeDest);

    // Cross-fade from walk/idle to stop (no physical motion during the 1.9s)
    try {
      if (this._isWalking) this._stopWalkImmediate(true);
      this._stopIdleImmediate();

      this._stopAction.reset();
      this._stopAction.setLoop(THREE.LoopOnce, 1);
      this._stopAction.clampWhenFinished = true;
      this._stopAction.enabled = true;
      this._stopAction.fadeIn(0.12);
      this._stopAction.play();
      this._state = 'stopping';
    } catch (e) {
      console.warn('[CharacterMovement] stop-walk play failed:', e);
      this._onStopAnimFinished(); // fallback straight to idle
    }
  }

  _onStopAnimFinished() {
    // Transition to idle at final location
    this._activeDest = null;
    this._clearStopTimer();
    this._startIdle();
  }

  // ---------------------------------------------------------------------------
  // Animation clip loading
  // ---------------------------------------------------------------------------

  async _loadClip(url) {
    const loader = new GLTFLoader();
    const gltf = await loader.loadAsync(url);
    const clips = gltf.animations || [];
    if (!clips.length) throw new Error(`${url} contains no animations`);
    // prefer a clip with a matching name when possible
    const want = url.split('/').pop()?.split('.')[0] || '';
    const named = clips.find(c => new RegExp(want, 'i').test(c.name));
    return named || clips[0];
  }

  async _loadIdleClip() {
    if (this._idlePromise) return this._idlePromise;
    this._idlePromise = this._loadClip(this.idleUrl).then((clip) => {
      this._idleClip = clip;
      if (this._mixer) {
        this._idleAction = this._mixer.clipAction(this._idleClip);
        this._idleAction.loop = THREE.LoopRepeat;
        this._idleAction.clampWhenFinished = false;
        this._idleAction.enabled = true;
      }
    }).catch(err => console.warn('[CharacterMovement] idle load failed:', err));
    return this._idlePromise;
  }

  async _loadWalkClip() {
    if (this._walkPromise) return this._walkPromise;
    this._walkPromise = this._loadClip(this.walkUrl).then((clip) => {
      this._walkClip = clip;
      if (this._mixer) {
        this._walkAction = this._mixer.clipAction(this._walkClip);
        this._walkAction.loop = THREE.LoopRepeat;
        this._walkAction.clampWhenFinished = false;
        this._walkAction.enabled = true;
      }
    }).catch(err => console.warn('[CharacterMovement] walk load failed:', err));
    return this._walkPromise;
  }

  async _loadStartClip() {
    if (this._startPromise) return this._startPromise;
    this._startPromise = this._loadClip(this.startUrl).then((clip) => {
      this._startClip = clip;
      if (this._mixer) {
        this._startAction = this._mixer.clipAction(this._startClip);
        this._startAction.loop = THREE.LoopOnce;
        this._startAction.clampWhenFinished = true;
        this._startAction.enabled = true;
      }
    }).catch(err => console.warn('[CharacterMovement] start-walk load failed:', err));
    return this._startPromise;
  }

  async _loadStopClip() {
    if (this._stopPromise) return this._stopPromise;
    this._stopPromise = this._loadClip(this.stopUrl).then((clip) => {
      this._stopClip = clip;
      if (this._mixer) {
        this._stopAction = this._mixer.clipAction(this._stopClip);
        this._stopAction.loop = THREE.LoopOnce;
        this._stopAction.clampWhenFinished = true;
        this._stopAction.enabled = true;
      }
    }).catch(err => console.warn('[CharacterMovement] stop-walk load failed:', err));
    return this._stopPromise;
  }
}