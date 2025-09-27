// file: src/core/viewport.js
import * as THREE from 'three';
import { scene } from './three.js';

export default class Viewport {
  static instance = null;

  static create() {
    if (Viewport.instance) {
      console.warn('Viewport has already been created.');
      return;
    }
    Viewport.instance = new Viewport();
    Viewport.instance.setScene(scene);
    Viewport.instance.start();
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
    this._attachResizeListeners();
  }

  get domElement() { return this._canvas; }
  get renderer() { return this._renderer; }

  setScene(scene) { this._scene = scene; }
  setCamera(camera) { this._camera = camera; }

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
      position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; 
      display: block; touch-action: none;
    `;
    this._root.appendChild(this._canvas);
  }

  _initializeRenderer() {
    this._renderer = new THREE.WebGLRenderer({
      canvas: this._canvas,
      antialias: true,
      alpha: true,
    });
    this._renderer.setClearColor(0x0b0f14, 1);
    this._renderer.outputColorSpace = THREE.SRGBColorSpace;
    this._renderer.shadowMap.enabled = true;
    this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  _attachResizeListeners() {
    window.addEventListener('resize', this._resize, { passive: true });
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
    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio, 2);
    this._renderer.setPixelRatio(dpr);
    this._renderer.setSize(width, height, false);
  };
}
