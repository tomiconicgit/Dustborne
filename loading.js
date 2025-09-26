// file: loading.js

class LoadingManager {
    constructor() {
        this._createStyles();
        this._createDOM();
        this._cacheDOMElements();
        this.hasFailed = false;
        this.loadedModules = new Map();
        this.log('Initializing Loading Manager...');
    }

    async start(EngineClass) {
        const engineInstance = new EngineClass();
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

        // --- PHASE 1: VALIDATION SCAN ---
        this.log('Starting Phase 1: Validating all game files...');
        const fullManifest = engineInstance.getFullManifest();
        if (fullManifest && fullManifest.length > 0) {
            for (let i = 0; i < fullManifest.length; i++) {
                const task = fullManifest[i];
                const progress = ((i + 1) / fullManifest.length) * 100;
                this._updateProgress(`Validating: ${task.name}`, progress);
                await delay(150);
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
        if (initialAssets && initialAssets.length > 0) {
            for (let i = 0; i < initialAssets.length; i++) {
                const task = initialAssets[i];
                const progress = ((i + 1) / initialAssets.length) * 100;
                this._updateProgress(`Loading: ${task.name}`, progress);
                await delay(250);
                try {
                    const loadedModule = await this._executeTask(task);
                    this.loadedModules.set(task.path, loadedModule);
                } catch (error) {
                    return this.fail(error, task);
                }
            }
        }
        this.log('✔ Phase 2 Complete: Initial assets loaded.', 'success');
        
        this._showStartButton();
    }
    
    _showStartButton() {
        this._updateProgress('Ready to start', 100);
        this.progressBar.classList.add('complete'); // Add .complete class for green bar
        this.startButton.style.display = 'block';
        this.startButton.onclick = () => {
            this.loadingScreen.classList.add('fade-out');
            this.loadingScreen.addEventListener('transitionend', () => {
                this.loadingScreen.remove();
                const testModule = this.loadedModules.get('./src/core/test.js');
                if (testModule && typeof testModule.show === 'function') {
                    testModule.show();
                } else {
                    console.error("Could not find the 'show' function in the test module.");
                }
            }, { once: true });
        };
    }

    fail(error, task) {
        if (this.hasFailed) return;
        this.hasFailed = true;

        const errorMessage = error?.message || 'An unknown error occurred.';
        this.log(`✖ FATAL ERROR during [${task.name}]: ${errorMessage}`, 'error');
        console.error(`[LoadingManager] Failed on task: ${task.name}`, { task, error });

        this.statusElement.textContent = 'Fatal Error';
        this.percentEl.textContent = 'FAIL';
        this.progressBar.classList.add('error');
        this.progressBar.style.width = '100%';

        // --- NEW: Show and enable the copy button ---
        this.copyButton.style.display = 'inline-block';
        this.copyButton.onclick = () => {
            navigator.clipboard.writeText(this.logContainer.innerText).then(() => {
                this.copyButton.textContent = 'Copied!';
                setTimeout(() => { this.copyButton.textContent = 'Copy Errors'; }, 2000);
            }, (err) => {
                this.copyButton.textContent = 'Failed!';
                console.error('Failed to copy errors: ', err);
            });
        };
    }

    // --- Other Methods (Unchanged from previous correct version) ---
    async _validateFile(task) { /* ... */ }
    async _executeTask(task) { /* ... */ }
    log(message, level = 'info') { /* ... */ }
    _updateProgress(message, progress) { /* ... */ }

    // --- UI Methods (Updated) ---
    _cacheDOMElements() {
        this.loadingScreen = document.getElementById('dustborne-loading-screen');
        this.progressBar = document.getElementById('dustborne-loading-bar');
        this.statusElement = document.getElementById('dustborne-loading-status');
        this.logContainer = document.getElementById('dustborne-log-container');
        this.percentEl = document.getElementById('dustborne-loading-percentage');
        this.startButton = document.getElementById('dustborne-start-button');
        this.copyButton = document.getElementById('dustborne-copy-button'); // Cache the new button
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
              <div class="dustborne-button-container">
                <button id="dustborne-copy-button">Copy Errors</button>
                <button id="dustborne-start-button">Start Game</button>
              </div>
            </div>
          </div>`;
        document.body.appendChild(container);
    }
    
    _createStyles() {
        const styles = `
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Roboto+Mono&display=swap');
            #dustborne-loading-screen { /* Unchanged */ }
            #dustborne-loading-screen::before { /* Unchanged */ }
            @keyframes slowPulse { /* Unchanged */ }
            .dustborne-logo { /* Unchanged */ }

            .dustborne-loader-container {
                width: 90%; max-width: 800px; z-index: 3; padding: 25px;
                background: rgba(25, 25, 25, 0.7);
                border-radius: 8px; border: 1px solid rgba(255, 255, 255, 0.1);
                box-shadow: 0 8px 32px 0 rgba(0, 0, 0, 0.37);
                backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
                text-align: center;
                animation: fadeInContainer 0.5s ease-out forwards;
            }
            @keyframes fadeInContainer { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

            #dustborne-status-container { /* Unchanged */ }
            
            #dustborne-loading-bar-container { 
                width: 100%; height: 8px; background: rgba(0,0,0,0.3); border-radius: 4px; overflow: hidden; 
            }
            #dustborne-loading-bar {
                width: 0%; height: 100%;
                background: linear-gradient(90deg, #007bff, #00d4ff);
                box-shadow: 0 0 8px #00aaff, 0 0 12px #00aaff;
                transition: width .4s ease-out, background .5s; border-radius: 4px;
            }
            #dustborne-loading-bar.complete {
                background: linear-gradient(90deg, #28a745, #20c997);
                box-shadow: 0 0 8px #28a745, 0 0 12px #20c997;
            }
            #dustborne-loading-bar.error { 
                background: linear-gradient(90deg, #dc3545, #ff6b81);
                box-shadow: 0 0 8px #dc3545, 0 0 12px #ff6b81;
            }

            #dustborne-log-container { /* Unchanged, but looks better with new modal */ }
            #dustborne-log-container p { /* Unchanged */ }
            .log-timestamp, .log-info, .log-success, .log-warn, .log-error { /* Unchanged */ }

            .dustborne-button-container {
                margin-top: 20px;
                display: flex;
                justify-content: center;
                gap: 15px;
            }

            #dustborne-start-button {
                display: none; /* Hidden by default */
                padding: 12px 30px; font-family: 'Roboto Mono', monospace; font-size: 1.1em; font-weight: bold;
                color: #fff; background-color: #007bff; border: none;
                border-radius: 5px; cursor: pointer;
                transition: transform 0.2s ease, background-color 0.2s ease;
            }
            #dustborne-start-button:hover {
                transform: scale(1.05);
                background-color: #0056b3;
            }

            #dustborne-copy-button {
                display: none; /* Hidden by default */
                padding: 8px 15px; font-family: 'Roboto Mono', monospace; font-size: 0.9em;
                color: #ccc; background-color: #555; border: none;
                border-radius: 5px; cursor: pointer;
                transition: background-color 0.2s ease;
            }
            #dustborne-copy-button:hover {
                background-color: #666;
            }
        `;
        const style = document.createElement('style');
        style.type = 'text/css';
        style.innerText = styles;
        document.head.appendChild(style);
    }
}

const loadingManager = new LoadingManager();
export default loadingManager;
