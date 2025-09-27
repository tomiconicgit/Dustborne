// file: src/core/camera.js
import * as THREE from 'three';
import Viewport from './viewport.js';

export default class Camera {
  static main = null;

  static create() {
    if (Camera.main) {
      console.warn('Main camera has already been created.');
      return;
    }
    if (!Viewport.instance) {
      throw new Error('Camera cannot be created before the Viewport.');
    }
    const camera = new Camera();
    Camera.main = camera;
    Viewport.instance.setCamera(camera.threeCamera);
    new CameraController(Viewport.instance.domElement, camera);
    window.addEventListener('resize', camera.handleResize, { passive: true });
  }

  constructor() {
    if (Camera.main) {
      throw new Error('Camera is a singleton. Use Camera.create() to initialize.');
    }
    this.target = null;
    this.threeCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight, // Corrected aspect ratio
      0.1,
      5000
    );
    this.orbitAngle = Math.PI / 4;
    this.orbitDistance = 6;
    this.cameraHeight = 3;
  }

  setTarget(target) {
    this.target = target;
    this.update();
  }

  update() {
    if (!this.target) return;
    const tp = this.target.position;
    const ideal = new THREE.Vector3(
      tp.x + this.orbitDistance * Math.sin(this.orbitAngle),
      tp.y + this.cameraHeight,
      tp.z + this.orbitDistance * Math.cos(this.orbitAngle)
    );
    this.threeCamera.position.copy(ideal);
    this.threeCamera.lookAt(tp.x, tp.y + 1, tp.z);
  }

  handleResize = () => {
    this.threeCamera.aspect = window.innerWidth / window.innerHeight; // Corrected aspect ratio
    this.threeCamera.updateProjectionMatrix();
  };
}

class CameraController {
  constructor(domElement, camera) {
    this.domElement = domElement;
    this.camera = camera;
    this.touchState = { isDragging: false, lastDragX: 0, startPos: new THREE.Vector2() };
    this._onStart = this.onTouchStart.bind(this);
    this._onMove = this.onTouchMove.bind(this);
    this._onEnd = this.onTouchEnd.bind(this);
    this.addEventListeners();
  }
  addEventListeners() {
    this.domElement.addEventListener('touchstart', this._onStart, { passive: false });
    this.domElement.addEventListener('touchmove', this._onMove, { passive: false });
    this.domElement.addEventListener('touchend', this._onEnd, { passive: false });
  }
  dispose() { this.domElement.removeEventListener('touchstart', this._onStart); this.domElement.removeEventListener('touchmove', this._onMove); this.domElement.removeEventListener('touchend', this._onEnd); }
  onTouchStart(event) { if (event.touches.length === 1) { this.touchState.isDragging = false; this.touchState.startPos.set(event.touches[0].clientX, event.touches[0].clientY); this.touchState.lastDragX = event.touches[0].clientX; } }
  onTouchMove(event) { event.preventDefault(); if (event.touches.length !== 1) return; const currentPos = new THREE.Vector2(event.touches[0].clientX, event.touches[0].clientY); if (this.touchState.startPos.distanceTo(currentPos) > 10) { this.touchState.isDragging = true; } if (this.touchState.isDragging) { const deltaX = event.touches[0].clientX - this.touchState.lastDragX; this.camera.orbitAngle -= deltaX * 0.01; this.touchState.lastDragX = event.touches[0].clientX; this.camera.update(); } }
  onTouchEnd() { this.touchState.isDragging = false; }
}
