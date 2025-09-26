// file: src/core/engine.js

export default class Engine {
  /**
   * PHASE 1: All critical scripts to validate.
   */
  getFullManifest() {
    console.log("ENGINE: Providing full manifest for validation.");
    return [
      { name: 'Engine Core',        type: 'script', path: './src/core/engine.js' },
      { name: 'Mining Area Chunk',  type: 'script', path: './src/world/chunks/miningarea.js' }
    ];
  }

  /**
   * PHASE 2: Assets needed right now (preload before Start).
   * We preload the start area chunk so Start is instant.
   */
  getInitialAssets() {
    console.log("ENGINE: Providing initial assets for targeted load.");
    return [
      { name: 'Mining Area Chunk', type: 'script', path: './src/world/chunks/miningarea.js' }
    ];
  }

  /**
   * Tell the loader which module + function to invoke on Start.
   */
  getStartModule() {
    return {
      path: './src/world/chunks/miningarea.js',
      fn: 'show' // the loader will call exported function `show()`
    };
  }
}