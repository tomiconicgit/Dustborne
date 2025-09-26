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
        
        // Helper function to introduce a small delay for visual feedback
        const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

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
                
                await delay(150); // Artificial delay to make progress visible

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

                await delay(250); // Artificial delay to make progress visible

                try {
                    const loadedModule = await this._executeTask(task);
                    this.loadedModules.set(task.path, loadedModule);
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
    log(message, level = 'info') {
        if (!this.logContainer) return;

        const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
        const p = document.createElement('p');
        p.className = `log-${level}`;
        p.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> ${message}`;
        
        this.logContainer.appendChild(p);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        const consoleLevel = level === 'success' ? 'log' : level;
        if (console[consoleLevel]) {
            console[consoleLevel](`[LoadingManager] ${message}`);
        } else {
            console.log(`[LoadingManager] ${message}`);
        }
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
    }

    _updateProgress(message, progress) {
        if (this.hasFailed) return;
        this.statusElement.textContent = message;
        this.percentEl.textContent = `${Math.floor(progress)}%`;
        this.progressBar.style.width = `${progress}%`;
    }

    _cacheDOMElements() {
        this.loadingScreen = document.getElementById('dustborne-loading-screen');
        this.progressBar = document.getElementById('dustborne-loading-bar');
        this.statusElement = document.getElementById('dustborne-loading-status');
        this.logContainer = document.getElementById('dustborne-log-container');
        this.percentEl = document.getElementById('dustborne-loading-percentage');
        this.startButton = document.getElementById('dustborne-start-button');
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
    
    _createStyles() {
        const styles = `
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Roboto+Mono:wght@400;700&display=swap');
            #dustborne-loading-screen {
                position: fixed; inset: 0;
                background: #0a0a0a; color: #ddd;
                display: flex; align-items: center; justify-content: center; flex-direction: column;
                z-index: 10000;
                font-family: 'Roboto Mono', monospace;
                transition: opacity 1s ease-out, visibility 1s;
                visibility: visible; opacity: 1;
            }
            #dustborne-loading-screen.fade-out { opacity: 0; visibility: hidden; pointer-events: none; }
            #dustborne-loading-screen::before {
                content: ''; position: absolute; inset: 0;
                background-image: radial-gradient(circle at 15% 50%, rgba(200,150,100,0.1) 0%, transparent 40%), radial-gradient(circle at 85% 30%, rgba(200,150,100,0.08) 0%, transparent 30%);
                animation: slowPulse 15s ease-in-out infinite;
            }
            @keyframes slowPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.1);opacity:.8} }
            .dustborne-logo {
                font-family: 'Cinzel', serif; font-size: clamp(2.5em, 12vw, 6em); margin: 0 20px 40px; text-align: center; color: #fff; z-index: 3;
                background: linear-gradient(180deg, #d3d3d3 0%, #888 25%, #444 50%, #888 75%, #d3d3d3 100%);
                -webkit-background-clip: text; background-clip: text;
                -webkit-text-fill-color: transparent; text-fill-color: transparent;
                letter-spacing: 3px;
                text-shadow: 1px 1px 0 #111, 2px 2px 0 #111, 3px 3px 1px #222, -1px -1px 2px rgba(255,255,255,.1);
            }
            .dustborne-loader-container {
                width: 90%; max-width: 800px; z-index: 3; padding: 15px; background: rgba(20,20,20,0.5);
                border-radius: 4px; border: 1px solid #282828; box-shadow: 0 0 30px rgba(0,0,0,0.5); text-align: center;
            }
            #dustborne-status-container {
                display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; font-size: .9em; color: #a0a0a0;
            }
            #dustborne-loading-bar-container { width: 100%; height: 4px; background: #222; border-radius: 2px; overflow: hidden; }
            #dustborne-loading-bar {
                width: 0%; height: 100%; background: linear-gradient(90deg, #c0a080, #e0c0a0);
                box-shadow: 0 0 8px #d0b090, 0 0 12px #d0b090; transition: width .4s ease-out, background-color .5s; border-radius: 2px;
            }
            #dustborne-loading-bar.error { background:#b04040; box-shadow:0 0 8px #f55,0 0 12px #f55; }
            #dustborne-log-container {
                margin-top: 15px; height: 150px; overflow-y: auto; background: rgba(0,0,0,0.4); border: 1px solid #282828; border-radius: 4px;
                padding: 10px; text-align: left; font-size: .8em; color: #ccc; scrollbar-width: thin; scrollbar-color: #444 #222; line-height: 1.5;
            }
            #dustborne-log-container p { margin: 0; padding: 2px 0; white-space: pre-wrap; display: flex; }
            .log-timestamp { color: #666; margin-right: 8px; flex-shrink: 0; }
            .log-info { color: #87ceeb; } .log-success { color: #98fb98; } .log-warn { color: #ffd700; } .log-error { color: #ff6b6b; font-weight: bold; }
            #dustborne-start-button {
                display: none; /* Hidden by default */
                margin-top: 20px; padding: 12px 30px; font-family: 'Cinzel', serif; font-size: 1.2em;
                color: #e0e0e0; background: linear-gradient(180deg, #3a3a3a, #2a2a2a); border: 1px solid #555;
                border-radius: 4px; cursor: pointer; text-transform: uppercase; letter-spacing: 1px;
                transition: background 0.3s, box-shadow 0.3s, color 0.3s;
            }
            #dustborne-start-button:hover {
                background: linear-gradient(180deg, #4a4a4a, #3a3a3a); color: #fff;
                box-shadow: 0 0 10px rgba(200, 160, 120, 0.5);
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
