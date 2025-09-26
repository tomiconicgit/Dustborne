// file: src/core/engine.js
export default class Engine {
  getFullManifest() {
    return [
      { name: 'Engine Core',           type: 'script', path: './src/core/engine.js' },
      { name: 'Viewport',              type: 'script', path: './src/core/viewport.js' },
      { name: 'Camera',                type: 'script', path: './src/core/camera.js' },
      { name: 'Lighting',              type: 'script', path: './src/core/lighting.js' },
      { name: 'Character',             type: 'script', path: './src/core/logic/character.js' },           // ← fix
      { name: 'Character Movement',    type: 'script', path: './src/core/logic/charactermovement.js' },
      { name: 'Mining Area Chunk',     type: 'script', path: './src/world/chunks/miningarea.js' }
    ];
  }

  getInitialAssets() {
    return [
      { name: 'Viewport',              type: 'script', path: './src/core/viewport.js' },
      { name: 'Camera',                type: 'script', path: './src/core/camera.js' },
      { name: 'Lighting',              type: 'script', path: './src/core/lighting.js' },
      { name: 'Character',             type: 'script', path: './src/core/logic/character.js' },           // ← fix
      { name: 'Character Movement',    type: 'script', path: './src/core/logic/charactermovement.js' },
      { name: 'Mining Area Chunk',     type: 'script', path: './src/world/chunks/miningarea.js' }
    ];
  }

  getStartModule() { return { path: './src/world/chunks/miningarea.js', fn: 'show' }; }
}