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

    // This group will hold the grid. The button toggles its visibility.
    this.group = new THREE.Group();
    this.group.name = 'DevGridOverlay';
    this.group.visible = false;
    this.scene.add(this.group);

    // --- FIX: Replaced label logic with a proper GridHelper ---
    const gridDivisions = 50;
    const gridSize = 50;
    const gridColor = 0xaaaaaa;

    this.gridHelper = new THREE.GridHelper(gridSize, gridDivisions, gridColor, gridColor);
    this.gridHelper.material.opacity = 0.5;
    this.gridHelper.material.transparent = true;
    this.gridHelper.position.y = 0.01; // Position slightly above ground to prevent z-fighting
    this.group.add(this.gridHelper);
    // --- End of Fix ---

    this.button = document.createElement('button');
    this.button.textContent = 'Grid';
    this.button.setAttribute('aria-label', 'Toggle grid overlay');
    Object.assign(this.button.style, {
      position: 'fixed', top: 'calc(env(safe-area-inset-top) + 10px)', right: 'calc(env(safe-area-inset-right) + 10px)',
      zIndex: '20000', padding: '10px 12px', font: '600 12px/1 Inter, system-ui, sans-serif',
      color: '#111', background: '#f5eeda', border: '1px solid rgba(0,0,0,.2)',
      borderRadius: '10px', opacity: '0.9', boxShadow: '0 2px 8px rgba(0,0,0,.35)',
      '-webkitTapHighlightColor': 'transparent', cursor: 'pointer'
    });
    this.button.addEventListener('click', () => {
      this.group.visible = !this.group.visible;
      this.button.style.opacity = this.group.visible ? '1' : '0.9';
    });
    domOverlayParent.appendChild(this.button);
  }

  /**
   * FIX: This method now updates the grid's position to follow the player.
   * It's called every frame from the character's update loop.
   */
  update(playerPosition) {
    // Do nothing if the grid isn't visible
    if (!this.group.visible) {
      return;
    }

    // Snap the grid's position to the nearest integer, keeping it centered on the player
    if (this.gridHelper) {
      this.gridHelper.position.x = Math.round(playerPosition.x);
      this.gridHelper.position.z = Math.round(playerPosition.z);
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.button?.remove();
  }
}
