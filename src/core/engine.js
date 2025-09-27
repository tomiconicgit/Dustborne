// file: src/core/engine.js

export default class Engine {
  /**
   * Provides a list of all JavaScript modules required for the game.
   */
  getManifest() {
    return [
      // Core Systems
      { name: 'Engine', type: 'script', path: './src/core/engine.js' },
      { name: 'Viewport', type: 'script', path: './src/core/viewport.js' },
      { name: 'Lighting', type: 'script', path: './src/core/lighting.js' },
      { name: 'World', type: 'script', path: './src/core/world.js' },
      { name: 'Chunk', type: 'script', path: './src/core/chunk.js' },
      { name: 'Camera', type: 'script', path: './src/core/camera.js' },
      { name: 'DevTools', type: 'script', path: './src/core/devtools.js' },

      // Game Logic
      { name: 'Character', type: 'script', path: './src/core/logic/character.js' },
      { name: 'Character Movement', type: 'script', path: './src/core/logic/charactermovement.js' },

      // World Assets
      { name: 'Sky', type: 'script', path: './src/world/assets/sky/sky.js' },
      { name: 'Copper Ore', type: 'script', path: './src/world/assets/rocks/copperore.js' },
      { name: 'Mining Area', type: 'script', path: './src/world/chunks/miningarea.js' },
      { name: 'Desert Chunk', type: 'script', path: './src/world/chunks/desert.js' },

      // UI
      { name: 'Navbar', type: 'script', path: './src/core/ui/navbar.js' },
      { name: 'Inventory', type: 'script', path: './src/core/ui/inventory.js' },
    ];
  }

  /**
   * Defines the entry point for each self-contained module.
   * This tells the loader which function to call to start each system.
   */
  getStartModules() {
    return [
      // Core Systems
      { path: './src/core/viewport.js', startFunction: 'create' },
      { path: './src/core/lighting.js', startFunction: 'create' },
      { path: './src/core/world.js', startFunction: 'create' },
      { path: './src/core/camera.js', startFunction: 'create' },
      
      // Game Logic
      { path: './src/core/logic/character.js', startFunction: 'create' },
      { path: './src/core/logic/charactermovement.js', startFunction: 'create' },

      // UI
      { path: './src/core/ui/navbar.js', startFunction: 'create' },
      { path: './src/core/ui/inventory.js', startFunction: 'create' },
      
      // Other assets and systems can be added here as needed
    ];
  }
}
