// file: src/core/logic/pathfinding.js

/**
 * A simple Priority Queue implementation for the A* algorithm.
 */
class PriorityQueue {
  constructor() {
    this.elements = [];
  }

  enqueue(element, priority) {
    this.elements.push({ element, priority });
    this.elements.sort((a, b) => a.priority - b.priority);
  }

  dequeue() {
    return this.elements.shift().element;
  }

  isEmpty() {
    return this.elements.length === 0;
  }
}

/**
 * Implements the A* pathfinding algorithm on the world's tile grid.
 */
export class AStarPathfinder {
  constructor(world) {
    this.world = world;
  }

  /**
   * Calculates the Manhattan distance heuristic between two tiles.
   * @param {object} a - The first tile.
   * @param {object} b - The second tile.
   * @returns {number} The heuristic distance.
   */
  _heuristic(a, b) {
    return Math.abs(a.gridX - b.gridX) + Math.abs(a.gridZ - b.gridZ);
  }

  /**
   * Finds the shortest path between two positions on the world grid.
   * @param {THREE.Vector3} startPos - The starting world position.
   * @param {THREE.Vector3} endPos - The ending world position.
   * @returns {THREE.Vector3[] | null} An array of world-space waypoints, or null if no path is found.
   */
  findPath(startPos, endPos) {
    const startTile = this.world.getTileAt(startPos);
    const endTile = this.world.getTileAt(endPos);

    if (!startTile || !endTile || !endTile.isWalkable) {
      return null; // No path if start/end is invalid or end is blocked
    }

    const frontier = new PriorityQueue();
    frontier.enqueue(startTile, 0);

    const cameFrom = new Map();
    const costSoFar = new Map();
    cameFrom.set(startTile, null);
    costSoFar.set(startTile, 0);

    while (!frontier.isEmpty()) {
      const current = frontier.dequeue();

      if (current === endTile) {
        break; // Path found
      }

      for (const next of this.world.getNeighbors(current)) {
        if (!next.isWalkable) continue;

        const newCost = costSoFar.get(current) + 1; // All steps have a cost of 1
        if (!costSoFar.has(next) || newCost < costSoFar.get(next)) {
          costSoFar.set(next, newCost);
          const priority = newCost + this._heuristic(endTile, next);
          frontier.enqueue(next, priority);
          cameFrom.set(next, current);
        }
      }
    }

    // Reconstruct the path from the end tile backwards
    let current = endTile;
    const path = [];
    if (!cameFrom.has(current)) {
      return null; // No path found
    }
    
    while (current !== startTile) {
      path.push(current.center.clone());
      current = cameFrom.get(current);
    }
    path.reverse(); // The path is backwards, so reverse it

    // If the path is empty, it means the start and end are the same or adjacent.
    // Ensure there's at least one point to move to.
    if (path.length === 0) {
      path.push(endTile.center.clone());
    }
    
    return path;
  }
}
