// file: main.js

import loadingManager from './loading.js';
import Game from './src/core/game.js'; // The "address book" file, named lowercase

// Wait for the basic HTML document to be ready.
document.addEventListener('DOMContentLoaded', () => {
    // Pass the main Game class to the loader.
    loadingManager.start(Game);
});
