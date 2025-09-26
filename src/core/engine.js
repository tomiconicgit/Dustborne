// file: src/core/engine.js

export default class Engine {
    /**
     * This is the manifest. The loader will ask for this list.
     * We are only asking it to load our test script.
     */
    getManifest() {
        return [
            { name: 'Test Screen', type: 'script', path: './src/core/test.js' }
        ];
    }

    /**
     * These methods will be used later when the actual game is running.
     * For now, they can be empty.
     */
    async init() { 
        // Not used in this test
    }

    start() {
        // Not used in this test
    }
}
