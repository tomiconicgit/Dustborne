// file: src/core/engine.js
export default class Engine {
  getFullManifest() {
    console.log("ENGINE: Providing full manifest for validation.");
    return [
      { name: 'Engine Core',           type: 'script', path: './src/core/engine.js' },
      { name: 'Viewport',              type: 'script', path: './src/core/viewport.js' },
      { name: 'Camera',                type: 'script', path: './src/core/camera.js' },
      { name: 'Lighting',              type: 'script', path: './src/core/lighting.js' },
      { name: 'Character',             type: 'script', path: './src/core/logic/charatcer.js' },
      { name: 'Character Movement',    type: 'script', path: './src/core/logic/charactermovement.js' },
      { name: 'Mining Area Chunk',     type: 'script', path: './src/world/chunks/miningarea.js' }
    ];
  }

  getInitialAssets() {
    console.log("ENGINE: Providing initial assets for targeted load.");
    return [
      { name: 'Viewport',              type: 'script', path: './src/core/viewport.js' },
      { name: 'Camera',                type: 'script', path: './src/core/camera.js' },
      { name: 'Lighting',              type: 'script', path: './src/core/lighting.js' },
      { name: 'Character',             type: 'script', path: './src/core/logic/charatcer.js' },
      { name: 'Character Movement',    type: 'script', path: './src/core/logic/charactermovement.js' },
      { name: 'Mining Area Chunk',     type: 'script', path: './src/world/chunks/miningarea.js' }
    ];
  }

  getStartModule() {
    return { path: './src/world/chunks/miningarea.js', fn: 'show' };
  }
}