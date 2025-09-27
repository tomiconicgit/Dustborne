// file: src/developer/gridtoggle.js
import * as THREE from 'three';
import { scene } from '../core/three.js';
import ChunkManager from '../world/chunks/chunkmanager.js';

export default class GridToggle {
  static main = null;

  static create() {
    if (GridToggle.main) return;
    if (!scene || !ChunkManager.instance) {
      console.error('GridToggle cannot be created before scene and ChunkManager.');
      return;
    }
    GridToggle.main = new GridToggle(scene, ChunkManager.instance);
  }

  constructor(scene, world, domOverlayParent = document.body) {
    this.scene = scene;
    this.world = world;
    this.gridMode = 0; // 0: Off, 1: Grid, 2: Grid + Numbers

    this.group = new THREE.Group();
    this.group.name = 'DevGridOverlay';
    // FIX: Make the entire grid system (lines and numbers) invisible to raycasting.
    this.group.raycast = () => {};
    this.group.visible = false;
    this.scene.add(this.group);

    const gridSize = 50;
    const gridDivisions = 50;
    const gridColor = 0x444444;
    this.gridHelper = new THREE.GridHelper(gridSize, gridDivisions, gridColor, gridColor);
    this.gridHelper.material.opacity = 0.5;
    this.gridHelper.material.transparent = true;
    this.gridHelper.position.y = 0.01;
    this.group.add(this.gridHelper);

    this.labelsGroup = new THREE.Group();
    this.labelsGroup.name = 'TileNumberLabels';
    this.labelsGroup.visible = false;
    this.group.add(this.labelsGroup);
    this.labelMaterialCache = new Map();
    this.labelMeshPool = [];
    this.labelGeometry = new THREE.PlaneGeometry(0.7, 0.7);

    this.button = document.createElement('button');
    this.button.textContent = 'Grid: Off';
    this.button.setAttribute('aria-label', 'Toggle grid overlay mode');
    Object.assign(this.button.style, {
      position: 'fixed', top: 'calc(env(safe-area-inset-top) + 10px)', right: 'calc(env(safe-area-inset-right) + 10px)',
      zIndex: '20000', padding: '10px 12px', font: '600 12px/1 Inter, system-ui, sans-serif',
      color: '#111', background: '#f5eeda', border: '1px solid rgba(0,0,0,.2)',
      borderRadius: '10px', opacity: '0.9', boxShadow: '0 2px 8px rgba(0,0,0,.35)',
      '-webkitTapHighlightColor': 'transparent', cursor: 'pointer', minWidth: '90px'
    });
    
    this.button.addEventListener('click', () => {
      this.gridMode = (this.gridMode + 1) % 3;
      switch (this.gridMode) {
        case 0:
          this.group.visible = false;
          this.button.textContent = 'Grid: Off';
          break;
        case 1:
          this.group.visible = true;
          this.labelsGroup.visible = false;
          this.button.textContent = 'Grid: On';
          break;
        case 2:
          this.group.visible = true;
          this.labelsGroup.visible = true;
          this.button.textContent = 'Grid: Nums';
          break;
      }
    });
    domOverlayParent.appendChild(this.button);
  }

  getLabelMaterial(text) {
    if (this.labelMaterialCache.has(text)) return this.labelMaterialCache.get(text);
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const size = 256;
    canvas.width = size; canvas.height = size;
    context.font = 'bold 60px Inter, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillStyle = '#f5eeda';
    context.fillText(text, size / 2, size / 2 + 4);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshBasicMaterial({ map: texture, transparent: true, depthWrite: false, side: THREE.DoubleSide });
    this.labelMaterialCache.set(text, material);
    return material;
  }

  update(playerPosition) {
    if (!this.group.visible) return;

    const snappedX = Math.round(playerPosition.x);
    const snappedZ = Math.round(playerPosition.z);

    this.gridHelper.position.set(snappedX, 0.01, snappedZ);

    if (this.gridMode !== 2) {
      this.labelsGroup.visible = false;
      return;
    }
    this.labelsGroup.visible = true;

    let poolIndex = 0;
    const halfGridSize = Math.floor(this.gridHelper.parameters.size / 2);

    for (let x = -halfGridSize; x <= halfGridSize; x++) {
      for (let z = -halfGridSize; z <= halfGridSize; z++) {
        const worldX = snappedX + x;
        const worldZ = snappedZ + z;

        let labelMesh = this.labelMeshPool[poolIndex];
        if (!labelMesh) {
          labelMesh = new THREE.Mesh(this.labelGeometry);
          this.labelMeshPool.push(labelMesh);
          this.labelsGroup.add(labelMesh);
        }

        labelMesh.material = this.getLabelMaterial(`${worldX},${worldZ}`);
        labelMesh.position.set(worldX, 0.02, worldZ);
        labelMesh.rotation.x = -Math.PI / 2;
        labelMesh.visible = true;
        poolIndex++;
      }
    }
    
    for (let i = poolIndex; i < this.labelMeshPool.length; i++) {
        this.labelMeshPool[i].visible = false;
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.button?.remove();
  }
}
