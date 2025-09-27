// file: src/core/logic/pathfinding.js

class PriorityQueue {
  constructor() { this.elements = []; }
  enqueue(element, priority) {
    this.elements.push({ element, priority });
    this.elements.sort((a, b) => a.priority - b.priority);
  }
  dequeue() { return this.elements.shift().element; }
  isEmpty() { return this.elements.length === 0; }
}

export class AStarPathfinder {
  constructor(world) {
    this.world = world;
  }

  _key(tile) {
    if (!tile) return '';
    return `${tile.chunk.chunkX},${tile.chunk.chunkZ}:${tile.localX},${tile.localZ}`;
  }

  _cost(a, b) {
    return a.center.distanceTo(b.center);
  }

  _heuristic(a, b) {
    return a.center.distanceTo(b.center);
  }

  findPath(startPos, endPos) {
    const startTile = this.world.getTileAt(startPos);
    const endTile   = this.world.getTileAt(endPos);
    if (!startTile || !endTile || !endTile.isWalkable) return null;

    const frontier = new PriorityQueue();
    const cameFrom = new Map();
    const costSoFar = new Map();

    frontier.enqueue(startTile, 0);
    cameFrom.set(this._key(startTile), null);
    costSoFar.set(this._key(startTile), 0);

    let reached = false;

    while (!frontier.isEmpty()) {
      const current = frontier.dequeue();
      if (current === endTile) { reached = true; break; }

      for (const next of this.world.getNeighbors8(current)) {
        const newCost = costSoFar.get(this._key(current)) + this._cost(current, next);
        const nk = this._key(next);
        if (!costSoFar.has(nk) || newCost < costSoFar.get(nk)) {
          costSoFar.set(nk, newCost);
          const priority = newCost + this._heuristic(next, endTile);
          frontier.enqueue(next, priority);
          cameFrom.set(nk, current);
        }
      }
    }

    if (!reached) return null;

    // Reconstruct path
    const path = [];
    let cur = endTile;
    while (cur) {
      path.push(cur.center.clone());
      cur = cameFrom.get(this._key(cur));
    }
    path.reverse();
    return path.length > 1 ? path : null;
  }
}