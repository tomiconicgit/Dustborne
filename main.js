// File: main.js

import loadingManager from './loading.js';

// Define the entire loading sequence for your game.
// The loader will process these tasks in order.
const gameLoadingTasks = [
  // Core Systems (must be loaded first)
  { name: 'Game Configuration', type: 'json',   path: './src/config/settings.json' },
  { name: 'Core Engine',        type: 'script', path: './src/core/Engine.js' },
  { name: 'Input Manager',      type: 'script', path: './src/core/InputManager.js' },
  { name: 'Audio Manager',      type: 'script', path: './src/core/AudioManager.js' },

  // Game Logic
  { name: 'Entity System',      type: 'script', path: './src/game/entities/Entity.js' },
  { name: 'Player Logic',       type: 'script', path: './src/game/entities/Player.js' },
  { name: 'World Logic',        type: 'script', path: './src/game/world/World.js' },
  
  // Assets (using the simulator, replace with real loaders)
  { name: 'Player Model',       type: 'asset',  path: './assets/models/player.glb' },
  { name: 'Environment Textures',type: 'asset', path: './assets/textures/environment.ktx2' },
  { name: 'UI Sprites',         type: 'asset',  path: './assets/ui/sprites.png' },
  { name: 'Main Theme',         type: 'asset',  path: './assets/audio/theme.mp3' },

  // UI and Final Initialization
  { name: 'UI Manager',         type: 'script', path: './src/ui/UIManager.js' },
  { name: 'Game Initializer',   type: 'script', path: './src/Game.js' } // This script will start the game
];


// Start the loading process. The loader takes full control from here.
document.addEventListener('DOMContentLoaded', () => {
    loadingManager.start(gameLoadingTasks);
});
