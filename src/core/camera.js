// file: src/core/camera.js
import * as THREE from 'three';
import Viewport from './viewport.js';

export default class Camera {
  /**
   * The single, globally accessible main game camera.
   * @type {Camera | null}
   */
  static main = null;

  /**
   * Creates and initializes the main Camera and its controller.
   * This is the entry point called by the loader.
   */
  static create() {
    if (Camera.main) {
      console.warn('Main camera has already been created.');
      return;
    }

    // This system depends on the Viewport, so we ensure it exists first.
    if (!Viewport.instance) {
      throw new Error('Camera cannot be created before the Viewport.');
    }

    // 1. Create the camera instance and store it globally.
    const camera = new Camera();
    Camera.main = camera;

    // 2. Connect the camera to the viewport for rendering.
    Viewport.instance.setCamera(camera.threeCamera);

    // 3. Create the orbit controller for this camera.
    new CameraController(Viewport.instance.domElement, camera);
    
    // 4. Listen for resize events to update the aspect ratio.
    window.addEventListener('resize', camera.handleResize, { passive: true });
  }

  constructor() {
    if (Camera.main) {
      throw new Error('Camera is a singleton. Use Camera.create() to initialize.');
    }

    this.target = null;
    this.threeCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / (window.innerHeight * 0.75),
      0.1,
      5000
    );

    // Orbit state
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
    this.threeCamera.aspect = window.innerWidth / (window.innerHeight * 0.75);
    this.threeCamera.updateProjectionMatrix();
  };
}

/** Integrated touch controller for orbiting */
class CameraController {
  constructor(domElement, camera) {
    this.domElement = domElement;
    this.camera = camera;

    this.touchState = {
      isDragging: false,
      lastDragX: 0,
      startPos: new THREE.Vector2(),
    };

    this._onStart = this.onTouchStart.bind(this);
    this._onMove  = this.onTouchMove.bind(this);
    this._onEnd   = this.onTouchEnd.bind(this);

    this.addEventListeners();
  }

  addEventListeners() {
    this.domElement.addEventListener('touchstart', this._onStart, { passive: false });
    this.domElement.addEventListener('touchmove',  this._onMove,  { passive: false });
    this.domElement.addEventListener('touchend',   this._onEnd,   { passive: false });
  }
  
  // --- The rest of the CameraController class is unchanged ---
  dispose() { this.domElement.removeEventListener('touchstart', this._onStart); this.domElement.removeEventListener('touchmove', this._onMove); this.domElement.removeEventListener('touchend', this._onEnd); }
  onTouchStart(event) { if (event.touches.length === 1) { this.touchState.isDragging = false; this.touchState.startPos.set(event.touches[0].clientX, event.touches[0].clientY); this.touchState.lastDragX = event.touches[0].clientX; } }
  onTouchMove(event) { event.preventDefault(); if (event.touches.length !== 1) return; const currentPos = new THREE.Vector2(event.touches[0].clientX, event.touches[0].clientY); if (this.touchState.startPos.distanceTo(currentPos) > 10) { this.touchState.isDragging = true; } if (this.touchState.isDragging) { const deltaX = event.touches[0].clientX - this.touchState.lastDragX; this.camera.orbitAngle -= deltaX * 0.01; this.touchState.lastDragX = event.touches[0].clientX; this.camera.update(); } }
  onTouchEnd() { this.touchState.isDragging = false; }
}
