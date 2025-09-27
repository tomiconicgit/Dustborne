// file: src/core/engine.js
export default class Engine {
  getManifest() {
    return [
      // Core Systems
      { name: 'Engine', path: './src/core/engine.js' },
      { name: 'Three', path: './src/core/three.js' },
      { name: 'Viewport', path: './src/core/viewport.js' },
      { name: 'Lighting', path: './src/core/lighting.js' },
      { name: 'Camera', path: './src/core/camera.js' },
      { name: 'Sky', path: './src/world/assets/sky/sky.js' },

      // UI System
      { name: 'NavigationBar', path: './src/core/navigationbar.js' },
      { name: 'Inventory', path: './src/core/inventory.js' },
      { name: 'SkillLevels', path: './src/core/skilllevels.js' },
      { name: 'WorldMap', path: './src/core/worldmap.js' },
      { name: 'Missions', path: './src/core/missions.js' },

      // World Generation
      { name: 'ChunkManager', path: './src/world/chunks/chunkmanager.js' },
      { name: 'MiningArea', path: './src/world/chunks/miningarea.js' },
      { name: 'Desert', path: './src/world/chunks/desert.js' },
      
      // Game Logic & Assets
      { name: 'CharacterLogic', path: './src/models/character/characterlogic.js' },
      { name: 'CopperOreLogic', path: './src/world/assets/rocks/copperore/copperorelogic.js' },

      // Developer Tools
      { name: 'GridToggle', path: './src/developer/gridtoggle.js' },
    ];
  }

  getStartModules() {
    return [
      // Create core singletons first.
      { path: './src/core/viewport.js', startFunction: 'create' },
      { path: './src/core/camera.js', startFunction: 'create' },
      { path: './src/core/lighting.js', startFunction: 'create' },
      { path: './src/world/assets/sky/sky.js', startFunction: 'create' },

      // Create the UI system
      { path: './src/core/navigationbar.js', startFunction: 'create' },
      
      // Initialize world systems (now async to preload assets)
      { path: './src/world/chunks/chunkmanager.js', startFunction: 'create' },
      
      // Create the player character, which starts its own systems
      { path: './src/models/character/characterlogic.js', startFunction: 'create' },

      // FIX: Add the GridToggle to the startup sequence so it gets created.
      { path: './src/developer/gridtoggle.js', startFunction: 'create' },
    ];
  }
}
