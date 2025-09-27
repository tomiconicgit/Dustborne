// file: src/core/engine.js

export default class Engine {
  getManifest() {
    return [
      // Core Systems
      { name: 'Engine', type: 'script', path: './src/core/engine.js' },
      { name: 'Scene', type: 'script', path: './src/core/scene.js' },
      { name: 'Viewport', type: 'script', path: './src/core/viewport.js' },
      { name: 'Lighting', type: 'script', path: './src/core/lighting.js' },
      { name: 'Chunk', type: 'script', path: './src/core/chunk.js' },
      { name: 'ChunkManager', type: 'script', path: './src/world/chunks/chunkmanager.js' },
      { name: 'Camera', type: 'script', path: './src/core/camera.js' },
      { name: 'DevTools', type: 'script', path: './src/core/devtools.js' },

      // Game Logic
      { name: 'Character', type: 'script', path: './src/core/logic/character.js' },
      { name: 'Character Movement', type: 'script', path: './src/core/logic/charactermovement.js' },

      // World Assets & UI (Unchanged)
      // ...
    ];
  }

  getStartModules() {
    return [
      // Create core singletons first. Note: scene.js doesn't have a function, it just runs.
      { path: './src/world/chunks/chunkmanager.js', startFunction: 'create' },
      { path: './src/core/viewport.js', startFunction: 'create' },
      { path: './src/core/camera.js', startFunction: 'create' },
      { path: './src/core/lighting.js', startFunction: 'create' },
      
      // Create UI
      { path: './src/core/ui/navbar.js', startFunction: 'create' },
      { path: './src/core/ui/inventory.js', startFunction: 'create' },
      
      // Create the player character, which starts its own systems
      { path: './src/core/logic/character.js', startFunction: 'create' },
    ];
  }
}
