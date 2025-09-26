// file: bootstrap.js
import loadingManager from './loading.js';

document.addEventListener('DOMContentLoaded', async () => {
  try {
    // Dynamic import so boot errors from src/* show in the loader instead of a black screen.
    const { default: Engine } = await import('./src/core/engine.js');
    loadingManager.start(Engine);
  } catch (err) {
    loadingManager.reportBootError(err, { module: './src/core/engine.js' });
  }
});