// file: bootstrap.js

import loadingManager from './loading.js';
import Engine from './src/core/engine.js'; // Updated to import from engine.js

// Wait for the basic HTML document to be ready.
document.addEventListener('DOMContentLoaded', () => {
    // Pass the main Engine class to the loader.
    loadingManager.start(Engine);
});
