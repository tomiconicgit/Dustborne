// file: src/core/logic/charactermovement.js
import * as THREE from 'three';

export default class CharacterMovement {
  constructor(domElement, game, camera, player, landscape) {
    this.domElement = domElement;
    this.game = game;                 // { scene }
    this.camera = camera;             // Camera instance (with .threeCamera)
    this.player = player;             // Character instance
    this.landscape = landscape;       // MiningArea instance
    this.raycaster = new THREE.Raycaster();

    this.touchState = {
      isDragging: false,
      startPos: new THREE.Vector2(),
    };

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

      this.player?.update(dt);
      this.camera?.update();

      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }

  dispose() {
    this._running = false;
    this.domElement.removeEventListener('touchstart', this._onStart);
    this.domElement.removeEventListener('touchmove',  this._onMove);
    this.domElement.removeEventListener('touchend',   this._onEnd);
  }

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

  handleTap(touch) {
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
        this.player.setHighlightedObject(hit.object);
        this.player.startMining(hit.object);
        return;
      }
      if (this.landscape?.mesh?.children?.includes(hit.object)) {
        if (!landscapeHit) landscapeHit = hit;
      }
    }

    if (landscapeHit) {
      this.player.setHighlightedObject(null);
      this.player.showTapMarkerAt(landscapeHit.point);
      this.player.cancelActions();
      this.player.moveTo(landscapeHit.point);
    }
  }
}