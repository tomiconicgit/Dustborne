// file: src/core/devtools.js
import * as THREE from 'three';

export default class DevTools {
  constructor(scene, world, domOverlayParent = document.body) {
    this.scene = scene;
    this.world = world;

    this.group = new THREE.Group();
    this.group.name = 'DevGridOverlay';
    this.group.visible = false;
    this.scene.add(this.group);

    // UI toggle (mobile-friendly)
    this.button = document.createElement('button');
    this.button.textContent = 'Grid';
    Object.assign(this.button.style, {
      position: 'fixed',
      top: '10px',
      right: '10px',
      zIndex: 20_000,
      padding: '10px 12px',
      font: '600 12px/1 Inter, system-ui, -apple-system, sans-serif',
      color: '#111',
      background: '#f5eeda',
      border: '1px solid rgba(0,0,0,.2)',
      borderRadius: '8px',
      opacity: '0.85'
    });
    this.button.addEventListener('click', () => {
      this.group.visible = !this.group.visible;
      this.button.style.opacity = this.group.visible ? '1' : '0.85';
    });
    domOverlayParent.appendChild(this.button);
  }

  clear() {
    while (this.group.children.length) {
      const c = this.group.children.pop();
      c.geometry?.dispose();
      if (c.material?.isMaterial) c.material.dispose();
    }
  }

  /**
   * Build grid lines for the mining chunk (0,0) and mark blocked tiles.
   * - Thin line mesh for tile borders (50×50)
   * - Red X markers for !isWalkable tiles
   */
  build() {
    this.clear();
    const TILE = this.world.TILE_SIZE;      // 1
    const SIZE = this.world.CHUNK_SIZE;     // 50
    const HALF = SIZE * 0.5;

    // --- Grid lines (vertical + horizontal) ---
    const gridGeom = new THREE.BufferGeometry();
    const verts = [];

    // 51 lines each direction to outline 50 tiles
    for (let i = 0; i <= SIZE; i++) {
      const x = -HALF + i * TILE;
      // vertical line from z=-HALF to z=+HALF at (x,0)
      verts.push(x, 0.001, -HALF,  x, 0.001,  HALF);
      const z = -HALF + i * TILE;
      // horizontal line from x=-HALF to x=+HALF at (z,0)
      verts.push(-HALF, 0.001, z,  HALF, 0.001, z);
    }

    gridGeom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const gridMat = new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.85 });
    const gridLines = new THREE.LineSegments(gridGeom, gridMat);
    gridLines.renderOrder = 9999;
    this.group.add(gridLines);

    // --- Blocked tile markers (red X) ---
    const xGeom = new THREE.BufferGeometry();
    const xVerts = [];
    const xOffset = 0.35;

    for (const t of this.world.tiles) {
      if (!t.isWalkable) {
        const cx = t.center.x, cz = t.center.z, y = 0.002;
        xVerts.push(
          cx - xOffset, y, cz - xOffset,  cx + xOffset, y, cz + xOffset,
          cx - xOffset, y, cz + xOffset,  cx + xOffset, y, cz - xOffset
        );
      }
    }

    if (xVerts.length) {
      xGeom.setAttribute('position', new THREE.Float32BufferAttribute(xVerts, 3));
      const xMat = new THREE.LineBasicMaterial({ color: 0xff3333, transparent: true, opacity: 1.0 });
      const xLines = new THREE.LineSegments(xGeom, xMat);
      xLines.renderOrder = 10_000;
      this.group.add(xLines);
    }
  }

  dispose() {
    this.clear();
    this.scene.remove(this.group);
    this.button?.remove();
  }
}