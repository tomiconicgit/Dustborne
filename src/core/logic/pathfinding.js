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

/**
 * A* over the world's tile grid.
 * - 8-way movement (N,S,E,W + diagonals)
 * - Octile heuristic
 * - Diagonal moves disallowed if it would "cut a corner" between two blocked tiles.
 */
export class AStarPathfinder {
  constructor(world) {
    this.world = world;
    this._map = world._tileMap; // grid key: `${gridX},${gridZ}` -> tile
    this._TP = world.TILES_PER_CHUNK;
  }

  _key(x, z) { return `${x},${z}`; }

  _neighbors8(tile) {
    const res = [];
    const { gridX:x, gridZ:z } = tile;
    const dirs = [
      [ 1,  0], [-1,  0], [ 0,  1], [ 0, -1], // cardinal
      [ 1,  1], [ 1, -1], [-1,  1], [-1, -1] // diagonals
    ];

    for (const [dx, dz] of dirs) {
      const nx = x + dx, nz = z + dz;
      const n = this._map.get(this._key(nx, nz));
      if (!n || !n.isWalkable) continue;

      // Block diagonal "corner cutting": both adjacent cardinals must be walkable
      if (dx !== 0 && dz !== 0) {
        const sideA = this._map.get(this._key(x + dx, z));
        const sideB = this._map.get(this._key(x, z + dz));
        if (!sideA?.isWalkable || !sideB?.isWalkable) continue;
      }
      res.push(n);
    }
    return res;
  }

  _cost(a, b) {
    const dx = Math.abs(a.gridX - b.gridX);
    const dz = Math.abs(a.gridZ - b.gridZ);
    // diagonal costs √2, straight costs 1
    return (dx === 1 && dz === 1) ? Math.SQRT2 : 1;
  }

  _heuristic(a, b) {
    // Octile heuristic for 8-direction grids
    const dx = Math.abs(a.gridX - b.gridX);
    const dz = Math.abs(a.gridZ - b.gridZ);
    const D = 1, D2 = Math.SQRT2;
    return D * (dx + dz) + (D2 - 2 * D) * Math.min(dx, dz);
  }

  findPath(startPos, endPos) {
    const startTile = this.world.getTileAt(startPos);
    const endTile   = this.world.getTileAt(endPos);
    if (!startTile || !endTile || !endTile.isWalkable) return null;

    const frontier = new PriorityQueue();
    frontier.enqueue(startTile, 0);

    const cameFrom = new Map();
    const costSoFar = new Map();
    const keyOf = t => `${t.gridX},${t.gridZ}`;

    cameFrom.set(keyOf(startTile), null);
    costSoFar.set(keyOf(startTile), 0);

    while (!frontier.isEmpty()) {
      const current = frontier.dequeue();
      const cKey = keyOf(current);

      if (current === endTile) break;

      for (const next of this._neighbors8(current)) {
        const nKey = keyOf(next);
        const newCost = costSoFar.get(cKey) + this._cost(current, next);
        if (!costSoFar.has(nKey) || newCost < costSoFar.get(nKey)) {
          costSoFar.set(nKey, newCost);
          const priority = newCost + this._heuristic(next, endTile);
          frontier.enqueue(next, priority);
          cameFrom.set(nKey, current);
        }
      }
    }

    // Reconstruct
    const endKey = keyOf(endTile);
    if (!cameFrom.has(endKey)) return null;

    let cur = endTile;
    const path = [];
    while (cur && cur !== startTile) {
      path.push(cur.center.clone());
      cur = cameFrom.get(keyOf(cur));
    }
    path.reverse();
    if (path.length === 0) path.push(endTile.center.clone());
    return path;
  }
}