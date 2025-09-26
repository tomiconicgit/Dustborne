// file: src/world/chunks/miningarea.js
import * as THREE from 'three';
import Viewport from '../../core/viewport.js';
import Camera, { CameraController } from '../../core/camera.js';
import Lighting from '../../core/lighting.js';

export default class MiningArea {
  constructor() {
    this.mesh = new THREE.Group();

    // Ground
    const baseColor = new THREE.Color('#8B4513'); // saddle brown
    const outerGeo = new THREE.PlaneGeometry(50, 50);
    const outerMat = new THREE.MeshStandardMaterial({ color: baseColor, roughness: 1, metalness: 0 });
    const outerMesh = new THREE.Mesh(outerGeo, outerMat);
    outerMesh.rotation.x = -Math.PI / 2;
    outerMesh.receiveShadow = true;
    this.mesh.add(outerMesh);

    const innerGeo = new THREE.PlaneGeometry(25, 25);
    const innerColor = baseColor.clone().multiplyScalar(0.75);
    const innerMat = new THREE.MeshStandardMaterial({ color: innerColor, roughness: 1, metalness: 0 });
    const innerMesh = new THREE.Mesh(innerGeo, innerMat);
    innerMesh.rotation.x = -Math.PI / 2;
    innerMesh.position.y = 0.01;
    innerMesh.receiveShadow = true;
    this.mesh.add(innerMesh);

    // Simple marker (casts a shadow so you can see lighting immediately)
    const markerGeo = new THREE.CylinderGeometry(0.25, 0.25, 1.2, 24);
    const markerMat = new THREE.MeshStandardMaterial({ color: 0xd4b97a });
    const marker = new THREE.Mesh(markerGeo, markerMat);
    marker.castShadow = true;
    marker.position.set(0, 0.6, 0);
    this.mesh.add(marker);
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

  // Viewport
  const viewport = new Viewport({ root });
  viewport.setClearColor(0x0b0f14, 1);
  viewport.renderer.shadowMap.enabled = true;
  viewport.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Scene
  const scene = new THREE.Scene();

  // Area content
  const area = new MiningArea();
  scene.add(area.mesh);

  // Lighting
  const lighting = new Lighting(scene);

  // Camera + controller
  const camera = new Camera();
  const lookAnchor = new THREE.Object3D(); // target to look at (origin)
  lookAnchor.position.set(0, 0, 0);
  scene.add(lookAnchor);
  camera.setTarget(lookAnchor);

  // Attach camera to viewport and start rendering
  viewport.setScene(scene);
  viewport.setCamera(camera.threeCamera);
  viewport.start();

  // Touch orbit controller on the viewport canvas
  const controller = new CameraController(viewport.domElement, camera);

  // Resize handling
  const onResize = () => camera.handleResize();
  window.addEventListener('resize', onResize, { passive: true });
  camera.handleResize();

  // Expose for debugging
  window.Dustborne = Object.assign(window.Dustborne || {}, {
    viewport, scene, area, lighting, camera, controller
  });

  console.log('MiningArea.show(): scene, lighting, and camera ready.');
}