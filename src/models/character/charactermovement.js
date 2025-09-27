// file: src/core/logic/charactermovement.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

class PriorityQueue { /* ... OMITTED ... */ }
class AStarPathfinder { /* ... OMITTED ... */ }

export default class CharacterMovement {
  constructor(domElement, camera, world, character) {
    this.domElement = domElement;
    this.camera = camera;
    this.world = world;
    this.player = character;
    this.scene = world.scene;

    // Movement properties
    this._moving = false;
    this._dest = new THREE.Vector3();
    this._speed = 3.0;
    this._epsilon = 0.05;

    this.raycaster = new THREE.Raycaster();
    this.pathfinder = new AStarPathfinder(world);

    // Internal state
    this._path = null;
    this._currentWaypointIndex = 0;
    this.touchState = { isDragging: false, startPos: new THREE.Vector2() };
    this.walkUrl = './src/assets/models/animations/walking.glb';
    this.idleUrl = './src/assets/models/animations/idle.glb';
    this._mixer = null;
    this._walkAction = null;
    this._idleAction = null;
    this._walkPlaying = false;
    this._idlePlaying = false;
    this._prewarmed = false;
    this._running = false;
    this._lastT = 0;
  }

  // This is now the main entry point for creating a controller.
  static async create(domElement, camera, world, character) {
    const controller = new CharacterMovement(domElement, camera, world, character);
    await controller.init();
    return controller;
  }

  async init() {
    if (!this.player.object) {
      console.error("Character model not initialized before CharacterMovement init.");
      return;
    }
    this.camera.setTarget(this.player.object);
    await this._prewarmAnimations();
    this._attachInputListeners();
    this._startTick();
  }
  
  // ... The rest of the file is unchanged ...
  // OMITTED CODE (PASTE THE REST OF THE FILE'S FUNCTIONS HERE)
}

// PASTE THE FOLLOWING OMITTED CODE INTO THE FILE:
/*
class PriorityQueue { constructor() { this.elements = []; } enqueue(element, priority) { this.elements.push({ element, priority }); this.elements.sort((a, b) => a.priority - b.priority); } dequeue() { return this.elements.shift().element; } isEmpty() { return this.elements.length === 0; } }
class AStarPathfinder { constructor(world) { this.world = world; } _key(tile) { if (!tile) return ''; return `${tile.chunk.chunkX},${tile.chunk.chunkZ}:${tile.localX},${tile.localZ}`; } _cost(a, b) { return a.center.distanceTo(b.center); } _heuristic(a, b) { return a.center.distanceTo(b.center); } findPath(startPos, endPos) { const startTile = this.world.getTileAt(startPos); const endTile = this.world.getTileAt(endPos); if (!startTile || !endTile || !endTile.isWalkable) return null; const frontier = new PriorityQueue(); const cameFrom = new Map(); const costSoFar = new Map(); frontier.enqueue(startTile, 0); cameFrom.set(this._key(startTile), null); costSoFar.set(this._key(startTile), 0); let reached = false; while (!frontier.isEmpty()) { const current = frontier.dequeue(); if (current === endTile) { reached = true; break; } for (const next of this.world.getNeighbors8(current)) { const newCost = costSoFar.get(this._key(current)) + this._cost(current, next); const nk = this._key(next); if (!costSoFar.has(nk) || newCost < costSoFar.get(nk)) { costSoFar.set(nk, newCost); const priority = newCost + this._heuristic(next, endTile); frontier.enqueue(next, priority); cameFrom.set(nk, current); } } } if (!reached) return null; const path = []; let cur = endTile; while (cur) { path.push(cur.center.clone()); cur = cameFrom.get(this._key(cur)); } path.reverse(); return path.length > 1 ? path : null; } }
CharacterMovement.prototype.moveTo = function(point) { if (!this.player.object) return; this._dest.copy(point); this._dest.y = this.player.object.position.y; this._moving = true; };
CharacterMovement.prototype.isMoving = function() { return this._moving; };
CharacterMovement.prototype.cancelActions = function() { this._moving = false; };
CharacterMovement.prototype.updatePosition = function(dt) { if (!this._moving || !this.player.object) return; const pos = this.player.object.position; const to = new THREE.Vector3().subVectors(this._dest, pos); const dist = to.length(); if (dist < this._epsilon) { pos.copy(this._dest); this._moving = false; return; } to.normalize(); const step = Math.min(dist, this._speed * dt); pos.addScaledVector(to, step); if (step > 0.0001) { const yaw = Math.atan2(this._dest.x - pos.x, this._dest.z - pos.z); this.player.object.rotation.set(0, yaw, 0); } };
CharacterMovement.prototype._startTick = function() { if (this._running) return; this._running = true; this._lastT = performance.now(); requestAnimationFrame(this.tick.bind(this)); };
CharacterMovement.prototype.tick = function(t) { if (!this._running || !this.player.object) return; const dt = Math.min(0.05, (t - this._lastT) / 1000); this._lastT = t; this.updatePosition(dt); this.camera.update(); if (this._path) { if (!this.isMoving()) { this._currentWaypointIndex++; if (this._currentWaypointIndex < this._path.length) { this.moveTo(this._path[this._currentWaypointIndex]); } else { this._path = null; this.cancelActions(); this._startIdle().catch((err) => console.error('Failed to start idle:', err)); } } } else if (!this.isMoving()) { if (!this._idlePlaying) { this._startIdle().catch((err) => console.error('Failed to start idle:', err)); } } if (this._mixer) this._mixer.update(dt); requestAnimationFrame(this.tick.bind(this)); };
CharacterMovement.prototype._attachInputListeners = function() { this._onStart = this.onTouchStart.bind(this); this._onMove = this.onTouchMove.bind(this); this._onEnd = this.onTouchEnd.bind(this); this.domElement.addEventListener('touchstart', this._onStart, { passive: false }); this.domElement.addEventListener('touchmove', this._onMove, { passive: false }); this.domElement.addEventListener('touchend', this._onEnd, { passive: false }); };
CharacterMovement.prototype.onTouchStart = function(e) { e.preventDefault(); if (e.touches.length === 1) { this.touchState.isDragging = false; this.touchState.startPos.set(e.touches[0].clientX, e.touches[0].clientY); } };
CharacterMovement.prototype.onTouchMove = function(e) { e.preventDefault(); if (e.touches.length !== 1) return; const currentPos = new THREE.Vector2(e.touches[0].clientX, e.touches[0].clientY); if (this.touchState.startPos.distanceTo(currentPos) > 10) { this.touchState.isDragging = true; } };
CharacterMovement.prototype.onTouchEnd = function(e) { e.preventDefault(); if (!this.touchState.isDragging && e.changedTouches.length === 1 && e.touches.length === 0) { this.handleTap(e.changedTouches[0]); } this.touchState.isDragging = false; };
CharacterMovement.prototype.handleTap = async function(touch) { if (!this.camera?.threeCamera || !this.player?.object || !this.domElement) return; const rect = this.domElement.getBoundingClientRect(); const ndc = new THREE.Vector2( ((touch.clientX - rect.left) / rect.width) * 2 - 1, -((touch.clientY - rect.top) / rect.height) * 2 + 1 ); this.raycaster.setFromCamera(ndc, this.camera.threeCamera); const hits = this.raycaster.intersectObjects(this.scene.children, true); let groundPoint = null; for (const hit of hits) { if (hit.object?.userData?.isLandscape) { groundPoint = hit.point; break; } } if (!groundPoint) return; const endTile = this.world.getTileAt(groundPoint); if (!endTile || !endTile.isWalkable) return; this._goTo(endTile.center); };
CharacterMovement.prototype._goTo = function(targetCenter) { const path = this.pathfinder.findPath(this.player.object.position, targetCenter); if (path && path.length > 0) { this._path = path; this._currentWaypointIndex = 0; this.moveTo(this._path[0]); this._startWalk().catch((err) => console.error('Failed to start walk:', err)); } };
CharacterMovement.prototype._prewarmAnimations = async function() { if (this._prewarmed || !this.player.object) return; this._mixer = new THREE.AnimationMixer(this.player.object); await Promise.all([this._ensureIdle(), this._ensureWalk()]); this._idleAction.reset().setLoop(THREE.LoopRepeat).play(); this._walkAction.reset().setLoop(THREE.LoopRepeat).play(); this._idleAction.setEffectiveWeight(1); this._walkAction.setEffectiveWeight(0); this._idlePlaying = true; this._walkPlaying = false; this._mixer.update(0); this._prewarmed = true; };
CharacterMovement.prototype._ensureIdle = async function() { if (!this._idleAction) { const clip = await this._loadClip(this.idleUrl); this._idleAction = this._mixer.clipAction(clip); } };
CharacterMovement.prototype._ensureWalk = async function() { if (!this._walkAction) { const clip = await this._loadClip(this.walkUrl); this._walkAction = this._mixer.clipAction(clip); } };
CharacterMovement.prototype._loadClip = async function(url) { const gltf = await new GLTFLoader().loadAsync(url); const clip = gltf.animations?.[0]; if (!clip) throw new Error(`No animation in ${url}`); return clip; };
CharacterMovement.prototype._startIdle = async function() { if (!this._idleAction) await this._ensureIdle(); if (this._walkAction && this._walkPlaying) { this._idleAction.reset().crossFadeFrom(this._walkAction, 0.25, false); this._walkPlaying = false; } else if (!this._idlePlaying) { this._idleAction.play(); this._idleAction.fadeIn(0.25); } this._idlePlaying = true; };
CharacterMovement.prototype._startWalk = async function() { if (!this._walkAction) await this._ensureWalk(); if (this._idleAction && this._idlePlaying) { this._walkAction.reset().crossFadeFrom(this._idleAction, 0.25, false); this._idlePlaying = false; } else if (!this._walkPlaying) { this._walkAction.play(); this._walkAction.fadeIn(0.25); } this._walkPlaying = true; };
*/
