// file: src/core/engine.js

export default class Engine {
    /**
     * PHASE 1: Provides a complete manifest of all critical game scripts.
     * The loader will use this list to validate every file.
     */
    getFullManifest() {
        console.log("ENGINE: Providing full manifest for validation.");
        return [
            // Add every single script file for your game here as you create them.
            { name: 'Engine Core', type: 'script', path: './src/core/engine.js' },
            { name: 'Test Screen', type: 'script', path: './src/core/test.js' },
            { name: 'Mining Area Chunk', type: 'script', path: './src/world/chunks/miningarea.js' }
            // { name: 'Player Logic', type: 'script', path: './src/game/player.js' },
            // { name: 'UI Manager',   type: 'script', path: './src/ui/uimanager.js' },
        ];
    }

    /**
     * PHASE 2: Provides the specific assets needed right now.
     * The loader will call this after validation to load only what's required to start.
     */
    getInitialAssets() {
        console.log("ENGINE: Providing initial assets for targeted load.");
        return [
            { name: 'Test Screen', type: 'script', path: './src/core/test.js' }
        ];
    }
}
