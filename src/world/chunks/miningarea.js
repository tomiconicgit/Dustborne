// file: src/world/chunks/miningarea.js
// Chunk files are landscape descriptors only. No camera/viewport/game boot logic here.
export default class MiningArea {
  constructor() {
    // Reserved for future mining-specific props (mineable nodes, decals, etc.)
    this.mesh = null;
  }
  update() {}
}