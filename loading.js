// file: loading.js

class LoadingManager {
    constructor() {
        this._createStyles();
        this._createDOM();
        this._cacheDOMElements();
        this.hasFailed = false;
        this.loadedModules = new Map(); // To store the loaded modules.
        this.log('Initializing Loading Manager...');
    }

    async start(EngineClass) {
        const engineInstance = new EngineClass();

        // --- PHASE 1: VALIDATION SCAN ---
        this.log('Starting Phase 1: Validating all game files...');
        const fullManifest = engineInstance.getFullManifest();
        if (!fullManifest || fullManifest.length === 0) {
            this.log('Manifest is empty. Nothing to validate.', 'warn');
        } else {
            for (let i = 0; i < fullManifest.length; i++) {
                const task = fullManifest[i];
                const progress = ((i + 1) / fullManifest.length) * 100;
                this._updateProgress(`Validating: ${task.name}`, progress);
                try {
                    await this._validateFile(task);
                } catch (error) {
                    return this.fail(error, task);
                }
            }
        }
        this.log('✔ Phase 1 Complete: All files validated.', 'success');

        // --- PHASE 2: TARGETED LOAD ---
        this.log('Starting Phase 2: Loading initial assets...');
        this._updateProgress('Loading required assets...', 0);
        const initialAssets = engineInstance.getInitialAssets();

        if (!initialAssets || initialAssets.length === 0) {
            this.log('No initial assets required.', 'warn');
        } else {
            for (let i = 0; i < initialAssets.length; i++) {
                const task = initialAssets[i];
                const progress = ((i + 1) / initialAssets.length) * 100;
                this._updateProgress(`Loading: ${task.name}`, progress);
                try {
                    const loadedModule = await this._executeTask(task);
                    this.loadedModules.set(task.path, loadedModule); // Store the loaded module
                } catch (error) {
                    return this.fail(error, task);
                }
            }
        }
        this.log('✔ Phase 2 Complete: Initial assets loaded.', 'success');

        // --- FINAL STEP: AWAIT USER INPUT ---
        this._showStartButton();
    }
    
    _showStartButton() {
        this._updateProgress('Ready to start', 100);
        this.startButton.style.display = 'block';
        this.startButton.onclick = () => {
            this.loadingScreen.classList.add('fade-out');
            this.loadingScreen.addEventListener('transitionend', () => {
                this.loadingScreen.remove();
                // Find and execute the 'show' function from our loaded test module
                const testModule = this.loadedModules.get('./src/core/test.js');
                if (testModule && typeof testModule.show === 'function') {
                    testModule.show();
                } else {
                    console.error("Could not find the 'show' function in the test module.");
                }
            }, { once: true });
        };
    }

    async _validateFile(task) {
        if (task.type === 'script') {
            await import(task.path);
        } else { /* Add other file type validation later if needed */ }
    }
    
    async _executeTask(task) {
        if (task.type === 'script') {
            return await import(task.path); // Use import() to get the module's exports
        }
        return Promise.reject(new Error(`Unknown task type '${task.type}'`));
    }
    
    // --- UI and Logging Methods ---
    _cacheDOMElements() {
        this.loadingScreen = document.getElementById('dustborne-loading-screen');
        this.progressBar = document.getElementById('dustborne-loading-bar');
        this.statusElement = document.getElementById('dustborne-loading-status');
        this.logContainer = document.getElementById('dustborne-log-container');
        this.percentEl = document.getElementById('dustborne-loading-percentage');
        this.startButton = document.getElementById('dustborne-start-button'); // Cache the button
    }
    
    _createDOM() {
        const container = document.createElement('div');
        container.id = 'dustborne-loading-screen';
        container.innerHTML = `
          <div>
            <h1 class="dustborne-logo">Dustborne</h1>
            <div class="dustborne-loader-container">
              <div id="dustborne-status-container">
                <span id="dustborne-loading-status"></span>
                <span id="dustborne-loading-percentage">0%</span>
              </div>
              <div id="dustborne-loading-bar-container"><div id="dustborne-loading-bar"></div></div>
              <div id="dustborne-log-container"></div>
              <button id="dustborne-start-button">Start Game</button>
            </div>
          </div>`;
        document.body.appendChild(container);
    }
    
    _createStyles() { /* Redacted for brevity - same full CSS as before, plus a style for the button */ }
    // ... other methods: log, fail, _updateProgress ...
}

const loadingManager = new LoadingManager();
export default loadingManager;
