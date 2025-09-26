// file: src/world/chunks/miningarea.js
import * as THREE from 'three';
import Viewport from '../../core/viewport.js';
import Camera, { CameraController } from '../../core/camera.js';
import Lighting from '../../core/lighting.js';
import Character from '../../core/logic/character.js';
import CharacterMovement from '../../core/logic/charactermovement.js';
import WorldEngine from '../../core/worldengine.js';

export default class MiningArea {
  constructor() {
    this.mesh = new THREE.Group(); // reserved for future chunk-specific props
  }
  update() {}
}

export async function show({ rootId = 'game-root' } = {}) {
  let root = document.getElementById(rootId);
  if (!root) { root = document.createElement('div'); root.id = rootId; document.body.appendChild(root); }

  // Viewport
  const viewport = new Viewport({ root });
  viewport.setClearColor(0x0b0f14, 1);
  viewport.renderer.shadowMap.enabled = true;
  viewport.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  // Scene + lighting
  const scene = new THREE.Scene();
  const lighting = new Lighting(scene);

  // Camera + orbit
  const camera = new Camera();
  viewport.setScene(scene);
  viewport.setCamera(camera.threeCamera);
  viewport.start();
  const orbitController = new CameraController(viewport.domElement, camera);

  // World tiler: Mining at center + Desert ring around it (8 neighbors)
  const world = new WorldEngine(scene, {
    CHUNK_SIZE: 50,
    TILE_SIZE: 10,
    ACTIVE_HALF: 50,
    PRELOAD_RING_TILES: 5
  });

  // Center
  world.registerChunk('mining', 0, 0);

  // Desert ring (surrounding the mining chunk)
  world.registerChunk('desert',  1,  0); // E
  world.registerChunk('desert', -1,  0); // W
  world.registerChunk('desert',  0,  1); // N
  world.registerChunk('desert',  0, -1); // S
  world.registerChunk('desert',  1,  1); // NE
  world.registerChunk('desert',  1, -1); // SE
  world.registerChunk('desert', -1,  1); // NW
  world.registerChunk('desert', -1, -1); // SW

  world.buildTiles();

  // Character
  const character = new Character(scene);
  await character.init(new THREE.Vector3(0, 0, 2));
  camera.setTarget(character.object);
  camera.handleResize();

  // Tap-to-move
  const movement = new CharacterMovement(
    viewport.domElement,
    { scene },
    camera,
    character,
    world.getLandscapeProxy()
  );

  // Tile state updates around the player
  const step = () => {
    if (character.object) world.update(character.object.position);
    requestAnimationFrame(step);
  };
  requestAnimationFrame(step);

  // Resize
  window.addEventListener('resize', () => camera.handleResize(), { passive: true });

  // Debug
  window.Dustborne = Object.assign(window.Dustborne || {}, {
    viewport, scene, lighting, camera, orbitController, world, character, movement
  });

  console.log('WorldEngine: mining at (0,0) with desert ring. Mining floor matches desert color.');
}