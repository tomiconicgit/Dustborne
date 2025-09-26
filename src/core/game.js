// file: src/core/game.js

export default class Game {
    constructor() {
        console.log("Game constructor called.");
    }

    /**
     * This is the "address book" for the loader.
     * Since no other files exist in `src` yet, this is empty.
     * As you create new files (e.g., inputmanager.js, world.js),
     * you will add them to this array to be loaded.
     */
    getLoadingTasks() {
        return [
            // Example of what you will add later:
            // { name: 'Game Configuration', type: 'json', path: './src/config/settings.json' },
            // { name: 'Player Logic', type: 'script', path: './src/game/player.js' },
        ];
    }

    /**
     * Called by the loader *after* all tasks are complete.
     */
    async init() {
        console.log("Game.init() called.");
        // Your game's initial setup logic will go here.
    }

    /**
     * Called by the loader after init() is complete.
     */
    start() {
        console.log("Game.start() called. Beginning game loop.");
        // The main game loop (e.g., requestAnimationFrame) will start here.
    }
}
