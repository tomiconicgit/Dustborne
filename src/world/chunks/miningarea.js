// file: src/world/chunks/miningarea.js
import * as THREE from 'three';
import Viewport from '../../core/viewport.js';
import Camera, { CameraController } from '../../core/camera.js';
import Lighting from '../../core/lighting.js';
import Character from '../../core/logic/charatcer.js';
import CharacterMovement from '../../core/logic/charactermovement.js';

export default class MiningArea {
  constructor() {
    this.mesh = new THREE.Group();

    // Ground (mark as landscape for controller tests)
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
  }

  update(time) { /* reserved */ }
}

export async function show({ rootId = 'game-root' } = {}) {
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

  // Camera + orbit controller (NO temporary target object)
  const camera = new Camera();
  viewport.setScene(scene);
  viewport.setCamera(camera.threeCamera);
  viewport.start();
  const orbitController = new CameraController(viewport.domElement, camera);

  // Character
  const character = new Character(scene);
  await character.init(new THREE.Vector3(0, 0, 2));

  // Now use the character as the camera target
  camera.setTarget(character.object);
  camera.handleResize();

  // Tap-to-move / interaction controller
  const movement = new CharacterMovement(viewport.domElement, { scene }, camera, character, area);

  // Resize
  window.addEventListener('resize', () => camera.handleResize(), { passive: true });

  // Expose for debugging
  window.Dustborne = Object.assign(window.Dustborne || {}, {
    viewport, scene, area, lighting, camera, orbitController, character, movement
  });

  console.log('MiningArea.show(): character loaded; camera targeting character.');
}