// file: src/core/devtools.js
import * as THREE from 'three';

export default class DevTools {
  constructor(scene, world, domOverlayParent = document.body) {
    this.scene = scene;
    this.world = world;

    // If a <canvas> was passed, fall back to <body>
    if (!domOverlayParent || String(domOverlayParent.tagName).toLowerCase() === 'canvas') {
      domOverlayParent = document.body;
    }

    // Overlay group
    this.group = new THREE.Group();
    this.group.name = 'DevGridOverlay';
    this.group.visible = false;
    this.scene.add(this.group);

    // Toggle button
    this.button = document.createElement('button');
    this.button.textContent = 'Grid';
    this.button.setAttribute('aria-label', 'Toggle grid/blocked overlay');
    Object.assign(this.button.style, {
      position: 'fixed',
      top: 'calc(env(safe-area-inset-top) + 10px)',
      right: 'calc(env(safe-area-inset-right) + 10px)',
      zIndex: '20000',
      padding: '10px 12px',
      font: '600 12px/1 Inter, system-ui, -apple-system, sans-serif',
      color: '#111',
      background: '#f5eeda',
      border: '1px solid rgba(0,0,0,.2)',
      borderRadius: '10px',
      opacity: '0.9',
      boxShadow: '0 2px 8px rgba(0,0,0,.35)',
      '-webkitTapHighlightColor': 'transparent' // <-- MUST be quoted
    });
    this.button.addEventListener('click', () => {
      this.group.visible = !this.group.visible;
      this.button.style.opacity = this.group.visible ? '1' : '0.9';
    });
    domOverlayParent.appendChild(this.button);
  }

  clear() {
    while (this.group.children.length) {
      const c = this.group.children.pop();
      c.geometry?.dispose?.();
      if (c.material?.isMaterial) c.material.dispose();
    }
  }

  // Build grid lines + red X on blocked tiles
  build() {
    this.clear();

    const TILE = this.world.TILE_SIZE;   // 1
    const SIZE = this.world.CHUNK_SIZE;  // 50
    const HALF = SIZE * 0.5;

    // Grid lines
    const gridGeom = new THREE.BufferGeometry();
    const verts = [];
    for (let i = 0; i <= SIZE; i++) {
      const x = -HALF + i * TILE;
      verts.push(x, 0.001, -HALF,  x, 0.001,  HALF);  // vertical
      const z = -HALF + i * TILE;
      verts.push(-HALF, 0.001, z,  HALF, 0.001, z);   // horizontal
    }
    gridGeom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const gridMat = new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.85 });
    const gridLines = new THREE.LineSegments(gridGeom, gridMat);
    gridLines.renderOrder = 9999;
    this.group.add(gridLines);

    // Blocked markers (red X)
    const xGeom = new THREE.BufferGeometry();
    const xVerts = [];
    const o = 0.35;
    for (const t of this.world.tiles) {
      if (!t.isWalkable) {
        const cx = t.center.x, cz = t.center.z, y = 0.002;
        xVerts.push(
          cx - o, y, cz - o,  cx + o, y, cz + o,
          cx - o, y, cz + o,  cx + o, y, cz - o
        );
      }
    }
    if (xVerts.length) {
      xGeom.setAttribute('position', new THREE.Float32BufferAttribute(xVerts, 3));
      const xMat = new THREE.LineBasicMaterial({ color: 0xff3333, transparent: true, opacity: 1.0 });
      const xLines = new THREE.LineSegments(xGeom, xMat);
      xLines.renderOrder = 10000;
      this.group.add(xLines);
    }
  }

  dispose() {
    this.clear();
    this.scene.remove(this.group);
    this.button?.remove();
  }
}