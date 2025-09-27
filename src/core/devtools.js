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

    // Main overlay group
    this.group = new THREE.Group();
    this.group.name = 'DevGridOverlay';
    this.group.visible = false;
    this.scene.add(this.group);

    // Group specifically for dynamic labels
    this.labelsGroup = new THREE.Group();
    this.labelsGroup.name = 'TileIDLabels';
    this.group.add(this.labelsGroup);

    // Cache for materials and a pool of reusable meshes for performance
    this.labelMaterialCache = new Map();
    this.labelMeshPool = [];
    this.labelGeometry = new THREE.PlaneGeometry(0.7, 0.7);

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
      '-webkitTapHighlightColor': 'transparent'
    });
    this.button.addEventListener('click', () => {
      this.group.visible = !this.group.visible;
      this.button.style.opacity = this.group.visible ? '1' : '0.9';
    });
    domOverlayParent.appendChild(this.button);
  }

  /**
   * Creates and caches a material with the given text rendered on it.
   */
  getLabelMaterial(text) {
    if (this.labelMaterialCache.has(text)) {
      return this.labelMaterialCache.get(text);
    }

    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const size = 128;
    canvas.width = size;
    canvas.height = size;

    context.font = 'bold 52px Inter, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#f5eeda';
    context.fillText(text, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;

    const material = new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    this.labelMaterialCache.set(text, material);
    return material;
  }

  /**
   * Called every frame to show labels only around the player.
   */
  update(playerPosition) {
    // If the entire grid is hidden, hide labels and do nothing.
    if (!this.group.visible) {
      if (this.labelsGroup.visible) this.labelsGroup.visible = false;
      return;
    }
    if (!this.labelsGroup.visible) this.labelsGroup.visible = true;

    // Define the 100x100 render range (50 units in each direction)
    const range = 50;
    const minX = playerPosition.x - range;
    const maxX = playerPosition.x + range;
    const minZ = playerPosition.z - range;
    const maxZ = playerPosition.z + range;

    let poolIndex = 0;

    // Go through all tiles and find which ones are inside the player's range
    this.world.tiles.forEach((tile, index) => {
      if (tile.center.x >= minX && tile.center.x <= maxX &&
          tile.center.z >= minZ && tile.center.z <= maxZ) {
        
        // Get a mesh from the pool, or create a new one if needed
        let mesh = this.labelMeshPool[poolIndex];
        if (!mesh) {
          mesh = new THREE.Mesh(this.labelGeometry);
          this.labelMeshPool.push(mesh);
          this.labelsGroup.add(mesh);
        }

        // Update the mesh with the correct material, position, and rotation
        mesh.material = this.getLabelMaterial(String(index));
        mesh.position.copy(tile.center);
        mesh.position.y += 0.003; // Lift slightly above grid lines
        mesh.rotation.x = -Math.PI / 2;
        mesh.visible = true;
        
        poolIndex++;
      }
    });

    // Hide any remaining, unused meshes in the pool
    for (let i = poolIndex; i < this.labelMeshPool.length; i++) {
      this.labelMeshPool[i].visible = false;
    }
  }

  clear() {
    // A robust way to clear all children from a group
    for (let i = this.group.children.length - 1; i >= 0; i--) {
        this.group.remove(this.group.children[i]);
    }

    // Dispose cached materials and textures
    this.labelMaterialCache.forEach((material) => {
      material.map?.dispose();
      material.dispose();
    });
    this.labelMaterialCache.clear();
  }

  // Build static grid elements (lines and blocked markers)
  build() {
    this.clear(); // Clear previous elements first

    const TILE = this.world.TILE_SIZE;
    const SIZE = this.world.CHUNK_SIZE;
    const HALF = SIZE * 0.5;

    // Grid lines
    const gridGeom = new THREE.BufferGeometry();
    const verts = [];
    for (let i = 0; i <= SIZE; i++) {
      const x = -HALF + i * TILE;
      verts.push(x, 0.001, -HALF, x, 0.001, HALF);
      const z = -HALF + i * TILE;
      verts.push(-HALF, 0.001, z, HALF, 0.001, z);
    }
    gridGeom.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
    const gridMat = new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.85 });
    const gridLines = new THREE.LineSegments(gridGeom, gridMat);
    this.group.add(gridLines);

    // Blocked markers (red X)
    const xGeom = new THREE.BufferGeometry();
    const xVerts = [];
    const o = 0.35;
    for (const t of this.world.tiles) {
      if (!t.isWalkable) {
        const cx = t.center.x, cz = t.center.z, y = 0.002;
        xVerts.push(
          cx - o, y, cz - o, cx + o, y, cz + o,
          cx - o, y, cz + o, cx + o, y, cz - o
        );
      }
    }
    if (xVerts.length) {
      xGeom.setAttribute('position', new THREE.Float32BufferAttribute(xVerts, 3));
      const xMat = new THREE.LineBasicMaterial({ color: 0xff3333, transparent: true, opacity: 1.0 });
      const xLines = new THREE.LineSegments(xGeom, xMat);
      this.group.add(xLines);
    }
    
    // ** THE FIX **
    // Ensure the labelsGroup (which is managed by update()) is part of the main group.
    this.group.add(this.labelsGroup);
  }

  dispose() {
    this.clear();
    this.labelGeometry.dispose();
    this.labelMeshPool.forEach(mesh => {
      this.labelsGroup.remove(mesh);
    });
    this.scene.remove(this.group);
    this.button?.remove();
  }
}
