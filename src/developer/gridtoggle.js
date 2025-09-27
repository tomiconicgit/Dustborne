// file: src/core/devtools.js
import * as THREE from 'three';

export default class DevTools {
  constructor(scene, world, domOverlayParent = document.body) {
    this.scene = scene;
    this.world = world;

    if (!domOverlayParent || String(domOverlayParent.tagName).toLowerCase() === 'canvas') {
      domOverlayParent = document.body;
    }

    this.group = new THREE.Group();
    this.group.name = 'DevGridOverlay';
    this.group.visible = false;
    this.scene.add(this.group);
    
    this.labelsGroup = new THREE.Group();
    this.labelsGroup.name = 'TileIDLabels';
    this.group.add(this.labelsGroup);

    this.labelMaterialCache = new Map();
    this.labelMeshPool = [];
    this.labelGeometry = new THREE.PlaneGeometry(0.7, 0.7);

    this.button = document.createElement('button');
    this.button.textContent = 'Grid';
    this.button.setAttribute('aria-label', 'Toggle grid/blocked overlay');
    Object.assign(this.button.style, {
      position: 'fixed',
      top: 'calc(env(safe-area-inset-top) + 10px)',
      right: 'calc(env(safe-area-inset-right) + 10px)',
      zIndex: '20000', padding: '10px 12px', font: '600 12px/1 Inter, system-ui, sans-serif',
      color: '#111', background: '#f5eeda', border: '1px solid rgba(0,0,0,.2)',
      borderRadius: '10px', opacity: '0.9', boxShadow: '0 2px 8px rgba(0,0,0,.35)',
      '-webkitTapHighlightColor': 'transparent'
    });
    this.button.addEventListener('click', () => {
      this.group.visible = !this.group.visible;
      this.button.style.opacity = this.group.visible ? '1' : '0.9';
    });
    domOverlayParent.appendChild(this.button);
  }

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
    context.fillText(text, size / 2, size / 2 + 4); // Small offset for better vertical centering
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({
      map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this.labelMaterialCache.set(text, material);
    return material;
  }

  update(playerPosition) {
    if (!this.group.visible) {
      if (this.labelsGroup.visible) this.labelsGroup.visible = false;
      return;
    }
    if (!this.labelsGroup.visible) this.labelsGroup.visible = true;

    let poolIndex = 0;
    
    // ** THE FIX **: Only show numbers in a small 20x20 range around the player
    const range = 10;
    const minX = playerPosition.x - range;
    const maxX = playerPosition.x + range;
    const minZ = playerPosition.z - range;
    const maxZ = playerPosition.z + range;

    for (const chunk of this.world.activeChunks.values()) {
        for (const tile of chunk.tiles) {
            // Check if the tile is within our small debug range
            if (tile.center.x >= minX && tile.center.x <= maxX &&
                tile.center.z >= minZ && tile.center.z <= maxZ) {
                
                let mesh = this.labelMeshPool[poolIndex];
                if (!mesh) {
                    mesh = new THREE.Mesh(this.labelGeometry);
                    this.labelMeshPool.push(mesh);
                    this.labelsGroup.add(mesh);
                }
                
                const tileId = `${tile.chunk.chunkX},${tile.chunk.chunkZ}:${tile.localX},${tile.localZ}`;
                mesh.material = this.getLabelMaterial(tileId);
                mesh.position.copy(tile.center);
                mesh.position.y += 0.003;
                mesh.rotation.x = -Math.PI / 2;
                mesh.visible = true;
                
                poolIndex++;
            }
        }
    }
    
    for (let i = poolIndex; i < this.labelMeshPool.length; i++) {
        this.labelMeshPool[i].visible = false;
    }
  }
  
  build() {}

  dispose() {
    this.labelGeometry.dispose();
    this.labelMaterialCache.forEach(m => { m.map?.dispose(); m.dispose(); });
    this.scene.remove(this.group);
    this.button?.remove();
  }
}