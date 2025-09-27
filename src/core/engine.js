// file: src/core/engine.js
export default class Engine {
  getFullManifest() {
    return [
      { name: 'Engine Core',           type: 'script', path: './src/core/engine.js' },
      { name: 'Viewport',              type: 'script', path: './src/core/viewport.js' },
      { name: 'Camera',                type: 'script', path: './src/core/camera.js' },
      { name: 'Lighting',              type: 'script', path: './src/core/lighting.js' },
      { name: 'World Engine',          type: 'script', path: './src/core/worldengine.js' },
      { name: 'Character',             type: 'script', path: './src/core/logic/character.js' },
      { name: 'Character Movement',    type: 'script', path: './src/core/logic/charactermovement.js' },
      { name: 'Sky',                   type: 'script', path: './src/world/assets/sky/sky.js' },
      { name: 'Mining Area Chunk',     type: 'script', path: './src/world/chunks/miningarea.js' },
      { name: 'Desert Chunk',          type: 'script', path: './src/world/chunks/desert.js' },
      { name: 'Copper Ore',            type: 'script', path: './src/world/assets/rocks/copperore.js' },
      // UI
      { name: 'UI Navbar',             type: 'script', path: './src/core/ui/navbar.js' },
      { name: 'UI Inventory',          type: 'script', path: './src/core/ui/inventory.js' },
    ];
  }

  getInitialAssets() {
    return [
      { name: 'Viewport',              type: 'script', path: './src/core/viewport.js' },
      { name: 'Camera',                type: 'script', path: './src/core/camera.js' },
      { name: 'Lighting',              type: 'script', path: './src/core/lighting.js' },
      { name: 'World Engine',          type: 'script', path: './src/core/worldengine.js' },
      { name: 'Character',             type: 'script', path: './src/core/logic/character.js' },
      { name: 'Character Movement',    type: 'script', path: './src/core/logic/charactermovement.js' },
      { name: 'Sky',                   type: 'script', path: './src/world/assets/sky/sky.js' },
      { name: 'Mining Area Chunk',     type: 'script', path: './src/world/chunks/miningarea.js' },
      { name: 'Desert Chunk',          type: 'script', path: './src/world/chunks/desert.js' },
      { name: 'Copper Ore',            type: 'script', path: './src/world/assets/rocks/copperore.js' },
      // UI
      { name: 'UI Navbar',             type: 'script', path: './src/core/ui/navbar.js' },
      { name: 'UI Inventory',          type: 'script', path: './src/core/ui/inventory.js' },
    ];
  }

  getStartModule() { return { path: './src/core/worldengine.js', fn: 'show' }; }
}