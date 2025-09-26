// file: src/core/viewport.js
import * as THREE from 'three';

/**
 * Viewport = the window to the world.
 * - Creates and owns the WebGLRenderer + canvas
 * - Handles sizing / DPR / resize events
 * - Renders ONLY if a camera is provided (no camera/lighting logic here)
 */
export default class Viewport {
  constructor({
    root = document.body,
    antialias = true,
    alpha = true,
    preserveDrawingBuffer = false,
    powerPreference = 'high-performance'
  } = {}) {
    this._root = root;
    this._scene = null;
    this._camera = null;
    this._running = false;
    this._raf = 0;

    // Canvas + renderer
    this._canvas = document.createElement('canvas');
    this._canvas.id = 'db-viewport';
    this._canvas.style.cssText = `
      position: fixed; inset: 0; width: 100vw; height: 100vh; display: block; touch-action: none;
    `;
    this._root.appendChild(this._canvas);

    this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas,
      antialias,
      alpha,
      preserveDrawingBuffer,
      powerPreference
    });

    // Basic renderer config (no camera/lighting here)
    this._renderer.setClearColor(0x000000, 1);
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._renderer.shadowMap.enabled = false;

    // Overlay to indicate missing camera/scene (helpful during staged bring-up)
    this._overlay = document.createElement('div');
    this._overlay.id = 'db-viewport-overlay';
    this._overlay.style.cssText = `
      position: fixed; left: 50%; top: 20px; transform: translateX(-50%);
      padding: 6px 10px; font: 12px/1.4 Inter, system-ui, sans-serif;
      color: #c3b8a5; background: rgba(26,22,18,.6); border: 1px solid rgba(245,238,218,.08);
      border-radius: 8px; pointer-events: none; z-index: 5;
    `;
    this._root.appendChild(this._overlay);
    this._updateOverlay();

    // Size to viewport
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(document.documentElement);
    window.addEventListener('orientationchange', this._resize, { passive: true });
    this._resize();
  }

  get domElement() { return this._canvas; }
  get renderer() { return this._renderer; }

  setScene(scene) {
    this._scene = scene;
    this._updateOverlay();
  }

  setCamera(camera) {
    // Accept a camera without creating/configuring it.
    this._camera = camera;
    this._updateOverlay();
  }

  setClearColor(color, alpha = 1) {
    this._renderer.setClearColor(color, alpha);
  }

  start() {
    if (this._running) return;
    this._running = true;

    const loop = (t) => {
      if (!this._running) return;
      if (this._scene && this._camera) {
        this._renderer.render(this._scene, this._camera);
      } else {
        // Draw nothing; maintain clear color
        this._renderer.clear(true, true, true);
      }
      this._raf = self.requestAnimationFrame(loop);
    };

    this._raf = self.requestAnimationFrame(loop);
  }

  stop() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  dispose() {
    this.stop();
    this._resizeObserver?.disconnect();
    window.removeEventListener('orientationchange', this._resize);

    this._renderer.dispose();
    this._canvas.remove();
    this._overlay.remove();
  }

  _resize = () => {
    const width = Math.max(1, Math.floor(this._root.clientWidth || window.innerWidth));
    const height = Math.max(1, Math.floor(this._root.clientHeight || window.innerHeight));
    const dpr = Math.min(window.devicePixelRatio || 1, 2); // clamp for iPhone perf
    this._renderer.setPixelRatio(dpr);
    this._renderer.setSize(width, height, false);
  };

  _updateOverlay() {
    if (!this._scene && !this._camera) {
      this._overlay.textContent = 'Viewport ready — waiting for scene & camera…';
    } else if (this._scene && !this._camera) {
      this._overlay.textContent = 'Viewport: scene attached — waiting for camera…';
    } else if (!this._scene && this._camera) {
      this._overlay.textContent = 'Viewport: camera attached — waiting for scene…';
    } else {
      this._overlay.textContent = '';
    }
  }
}