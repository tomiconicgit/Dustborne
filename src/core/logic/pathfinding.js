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
    frontier.enqueue(startTile, 0);

    const cameFrom = new Map();
    const costSoFar = new Map();

    const startKey = this._key(startTile);
    cameFrom.set(startKey, null);
    costSoFar.set(startKey, 0);

    while (!frontier.isEmpty()) {
      const current = frontier.dequeue();
      
      if (current === endTile) break;
      
      for (const next of this.world.getNeighbors8(current)) {
        const newCost = costSoFar.get(this._key(current)) + this._cost(current, next);
        const nextKey = this._key(next);
        if (!costSoFar.has(nextKey) || newCost < costSoFar.get(nextKey)) {
          costSoFar.set(nextKey, newCost);
          const priority = newCost + this._heuristic(next, endTile);
          frontier.enqueue(next, priority);
          cameFrom.set(nextKey, current);
        }
      }
    }

    const path = [];
    let current = endTile;
    while (current) {
        path.push(current.center.clone());
        const prevKey = this._key(cameFrom.get(this._key(current)));
        // This is complex, simply find the tile from the map
        current = cameFrom.get(this._key(current));
    }
    path.reverse();
    
    // ** THE FIX **: Allow single-step paths.
    return path.length > 0 ? path : null;
  }
}
