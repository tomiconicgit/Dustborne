// file: src/core/viewport.js
import * as THREE from 'three';

let viewportInstance = null;

export default class Viewport {
  /**
   * The single, globally accessible instance of the Viewport.
   * @type {Viewport | null}
   */
  static instance = null;

  /**
   * Creates and initializes the single Viewport instance for the game.
   * This function is the entry point called by the loader.
   */
  static create() {
    if (Viewport.instance) {
      console.warn('Viewport has already been created.');
      return;
    }
    Viewport.instance = new Viewport();
    Viewport.instance.start(); // Start the render loop
  }

  constructor(root = document.body) {
    if (Viewport.instance) {
      throw new Error('Viewport is a singleton. Use Viewport.create() to initialize.');
    }

    this._root = root;
    this._scene = null;
    this._camera = null;
    this._running = false;
    this._raf = 0;

    this._initializeCanvas();
    this._initializeRenderer();
    this._initializeOverlay();
    this._attachResizeListeners();
  }

  get domElement() { return this._canvas; }
  get renderer() { return this._renderer; }

  setScene(scene) {
    this._scene = scene;
    this._updateOverlay();
  }

  setCamera(camera) {
    this._camera = camera;
    this._updateOverlay();
  }

  start() {
    if (this._running) return;
    this._running = true;
    this._raf = self.requestAnimationFrame(this._loop);
  }

  stop() {
    this._running = false;
    if (this._raf) cancelAnimationFrame(this._raf);
    this._raf = 0;
  }

  _initializeCanvas() {
    this._canvas = document.createElement('canvas');
    this._canvas.id = 'db-viewport';
    this._canvas.style.cssText = `
      position: fixed; top: 0; left: 0; width: 100vw; height: 75vh; 
      display: block; touch-action: none;
    `;
    this._root.appendChild(this._canvas);
  }

  _initializeRenderer() {
    this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance'
    });

    this._renderer.setClearColor(0x0b0f14, 1);
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  _initializeOverlay() {
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
  }

  _attachResizeListeners() {
    this._resizeObserver = new ResizeObserver(() => this._resize());
    this._resizeObserver.observe(document.documentElement);
    window.addEventListener('orientationchange', this._resize, { passive: true });
    this._resize();
  }

  _loop = () => {
    if (!this._running) return;

    if (this._scene && this._camera) {
      this._renderer.render(this._scene, this._camera);
    } else {
      this._renderer.clear();
    }
    
    this._raf = self.requestAnimationFrame(this._loop);
  };

  _resize = () => {
    const width = Math.max(1, Math.floor(this._root.clientWidth || window.innerWidth));
    const height = Math.max(1, Math.floor((this._root.clientHeight || window.innerHeight) * 0.75));
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    
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
