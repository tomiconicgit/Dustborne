// file: src/world/chunks/miningarea.js
import * as THREE from 'three';
import Viewport from '../../core/viewport.js';

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

  update(time) { /* reserved */ }
}

export function show({ rootId = 'game-root' } = {}) {
  let root = document.getElementById(rootId);
  if (!root) {
    root = document.createElement('div');
    root.id = rootId;
    document.body.appendChild(root);
  }

  // 1) Bring up the Viewport (no camera or lights here)
  const viewport = new Viewport({ root });
  viewport.setClearColor(0x000000, 1);

  // 2) Scene + environment content (no camera/lighting/player)
  const scene = new THREE.Scene();
  const area = new MiningArea();
  scene.add(area.mesh);

  // 3) Attach and run; will render once a camera is provided later
  viewport.setScene(scene);
  viewport.start();

  // Expose minimal handle for future wiring (optional)
  window.Dustborne = Object.assign(window.Dustborne || {}, {
    viewport, scene, area
  });

  console.log('MiningArea.show(): Viewport mounted; scene ready. Waiting for camera.');
}