// file: src/world/chunks/miningarea.js

import * as THREE from 'three';

/**
 * Retained for future 3D use; not mounted yet (no camera/player logic).
 */
export default class MiningArea {
  constructor() {
    this.mesh = new THREE.Group();

    const baseColor = new THREE.Color('#8B4513'); // saddle brown
    const outerGeo = new THREE.PlaneGeometry(50, 50);
    const outerMat = new THREE.MeshBasicMaterial({ color: baseColor });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.rotation.x = -Math.PI / 2;
    this.mesh.add(outerMesh);

    const innerGeo = new THREE.PlaneGeometry(25, 25);
    const innerColor = baseColor.clone().multiplyScalar(0.75);
    const innerMat = new THREE.MeshBasicMaterial({ color: innerColor });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.rotation.x = -Math.PI / 2;
    innerMesh.position.y = 0.01;
    this.mesh.add(innerMesh);
  }

  update(time) {
    // Reserved for future chunk updates.
  }
}

/**
 * Minimal on-screen placeholder (no camera, no player).
 * Lets the user see that "Mining Area" is the active area after Start.
 */
export function show({ rootId = 'game-root' } = {}) {
  let root = document.getElementById(rootId);
  if (!root) {
    root = document.createElement('div');
    root.id = rootId;
    document.body.appendChild(root);
  }

  const css = `
    #${rootId} {
      position: fixed; inset: 0; display: grid; place-items: center;
      background:
        radial-gradient(900px 600px at 60% 70%, rgba(139,69,19,0.15), transparent 60%),
        #000;
      color: #f5eeda; font-family: Inter, system-ui, sans-serif;
    }
    .ma-wrap { display:flex; flex-direction:column; align-items:center; gap:6px; }
    .ma-title { text-transform: uppercase; letter-spacing: 2px; font-size: 22px; }
    .ma-sub { font-size: 12px; color: #c3b8a5; opacity:.85; }
  `;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  root.innerHTML = `
    <div class="ma-wrap" data-chunk="miningarea">
      <div class="ma-title">Mining Area</div>
      <div class="ma-sub">placeholder — no camera/player yet</div>
    </div>
  `;

  console.log('MiningArea.show(): placeholder mounted. Scene setup to follow later.');
}