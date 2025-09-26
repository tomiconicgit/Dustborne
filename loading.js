// File: loading.js
// Placed in the project root directory.
// This class manages the entire game loading sequence, including UI,
// asset loading, and an integrated on-screen debugger.

class LoadingManager {
  constructor() {
    // --- DOM Element References ---
    this.loadingScreen = null;
    this.progressBar = null;
    this.statusElement = null;
    this.logContainer = null;
    this.percentEl = null;

    // --- State ---
    this.hasFailed = false;

    // Immediately build the UI so it's the first thing on screen
    this._createStyles();
    this._createDOM();
    this._cacheDOMElements();

    this.log('Initializing Loading Manager...');
  }

  // =================================================================
  // PUBLIC API
  // =================================================================

  /**
   * Starts the loading process.
   * @param {Array<Object>} tasks - An array of task objects to be processed.
   * Each object should have { name: string, type: string, path: string }
   */
  async start(tasks = []) {
    if (!tasks.length) {
      this.log('No loading tasks provided. Finishing immediately.', 'warn');
      this.finish();
      return;
    }

    this.log(`Starting loading sequence with ${tasks.length} tasks...`);
    const totalTasks = tasks.length;

    for (let i = 0; i < totalTasks; i++) {
      const task = tasks[i];
      const progress = ((i + 1) / totalTasks) * 100;

      if (this.hasFailed) {
        this.log(`Halting sequence due to previous error.`, 'warn');
        return;
      }
      
      this._updateProgress(`Loading ${task.name}...`, progress);
      this.log(`[${Math.floor(progress)}%] Loading ${task.name} from '${task.path}'`);

      try {
        await this._executeTask(task);
        this.log(`✔ Success: ${task.name} loaded.`, 'success');
      } catch (error) {
        this.fail(error, task); // fail() sets this.hasFailed to true
        return; // Stop the loading process
      }
    }

    this.finish();
  }
  
  /**
   * Finalizes the loading screen and fades it out.
   */
  finish() {
    if (this.hasFailed) return;
    this.log('Initialization complete! Starting the game.', 'success');
    this._updateProgress('Ready!', 100);
    
    setTimeout(() => {
      this.loadingScreen.classList.add('fade-out');
      this.loadingScreen.addEventListener('transitionend', () => {
        this.loadingScreen.remove();
      }, { once: true });
    }, 750); // A brief delay to show "Ready!"
  }

  /**
   * Halts the loading process on a fatal error.
   * @param {Error} error - The error object.
   * @param {Object} task - The task that failed.
   */
  fail(error, task) {
    if (this.hasFailed) return; // Prevent multiple failure logs
    this.hasFailed = true;

    const errorMessage = error?.message || 'An unknown error occurred.';
    this.log(`✖ FATAL ERROR while loading ${task.name}: ${errorMessage}`, 'error');
    console.error(`[LoadingManager] Failed on task: ${task.name}`, { task, error });

    this.statusElement.textContent = 'Fatal Error';
    this.percentEl.textContent = 'FAIL';
    this.progressBar.classList.add('error');
    this.progressBar.style.width = '100%';

    // Also log the stack trace to the on-screen debugger for more detail
    if (error.stack) {
        const stackElement = document.createElement('p');
        stackElement.className = 'error-stack';
        stackElement.textContent = error.stack;
        this.logContainer.appendChild(stackElement);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }
  }


  // =================================================================
  // ADVANCED DEBUGGER / LOGGER
  // =================================================================

  /**
   * Logs a message to the on-screen debugger and the browser console.
   * @param {string} message - The message to log.
   * @param {string} level - 'info', 'success', 'warn', or 'error'.
   */
  log(message, level = 'info') {
    if (!this.logContainer) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    const p = document.createElement('p');
    p.className = `log-${level}`;
    p.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> ${message}`;
    
    this.logContainer.appendChild(p);
    this.logContainer.scrollTop = this.logContainer.scrollHeight;

    // Mirror to browser console for standard debugging
    switch (level) {
      case 'success':
      case 'info':
        console.log(`[LoadingManager] ${message}`);
        break;
      case 'warn':
        console.warn(`[LoadingManager] ${message}`);
        break;
      case 'error':
        // The fail() method already calls console.error with more context
        break;
    }
  }

  // =================================================================
  // CORE TASK EXECUTION & ASSET LOADING
  // =================================================================
  
  /**
   * Routes a task to the correct loader based on its type.
   * @param {Object} task - The task object.
   */
  _executeTask(task) {
    switch (task.type) {
      case 'script':
        return this._loadScript(task.path);
      case 'json':
        return this._loadJSON(task.path);
      case 'asset':
        // Placeholder for loading game models, textures, audio, etc.
        // Replace with your actual asset loading logic (e.g., using THREE.js loaders)
        return this._simulateAssetLoad(task.path);
      default:
        return Promise.reject(new Error(`Unknown task type '${task.type}'`));
    }
  }

  _loadScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module'; // Essential for modern JS
      script.src = path;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Script failed to load: ${path}`));
      document.head.appendChild(script);
    });
  }

  async _loadJSON(path) {
    try {
      const response = await fetch(path);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      // You might want to store this data somewhere accessible globally
      // e.g., window.gameConfig = data;
      return data;
    } catch (error) {
      throw new Error(`Failed to fetch or parse JSON from ${path}: ${error.message}`);
    }
  }
  
  _simulateAssetLoad(path) {
    // SIMULATION: Replace with actual asset loading library calls
    return new Promise(resolve => {
        // Simulate network latency and asset processing time
        const randomDelay = 50 + Math.random() * 200;
        setTimeout(() => resolve(), randomDelay);
    });
  }


  // =================================================================
  // UI & DOM MANIPULATION
  // =================================================================

  _updateProgress(message, progress) {
    if (this.hasFailed) return;
    this.statusElement.textContent = message;
    this.percentEl.textContent = `${Math.floor(progress)}%`;
    this.progressBar.style.width = `${progress}%`;
  }

  _cacheDOMElements() {
    this.loadingScreen = document.getElementById('dustborne-loading-screen');
    this.progressBar   = document.getElementById('dustborne-loading-bar');
    this.statusElement = document.getElementById('dustborne-loading-status');
    this.logContainer  = document.getElementById('dustborne-log-container');
    this.percentEl     = document.getElementById('dustborne-loading-percentage');
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
        transition: opacity 1s ease-out, visibility 1s; transition-delay: 0.5s;
        visibility: visible; opacity: 1;
      }
      #dustborne-loading-screen.fade-out { opacity: 0; visibility: hidden; pointer-events: none; }

      #dustborne-loading-screen::before {
        content: ''; position: absolute; inset: 0;
        background-image:
          radial-gradient(circle at 15% 50%, rgba(200,150,100,0.1) 0%, transparent 40%),
          radial-gradient(circle at 85% 30%, rgba(200,150,100,0.08) 0%, transparent 30%);
        animation: slowPulse 15s ease-in-out infinite;
      }
      @keyframes slowPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.1);opacity:.8} }

      .dustborne-logo {
        font-family: 'Cinzel', serif; font-size: clamp(2.5em, 12vw, 6em);
        margin: 0 20px 40px; text-align: center; color: #fff; z-index: 3;
        background: linear-gradient(180deg, #d3d3d3 0%, #888 25%, #444 50%, #888 75%, #d3d3d3 100%);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent; text-fill-color: transparent;
        letter-spacing: 3px;
        text-shadow: 1px 1px 0 #111, 2px 2px 0 #111, 3px 3px 1px #222, -1px -1px 2px rgba(255,255,255,.1);
      }

      .dustborne-loader-container {
        width: 90%; max-width: 800px; z-index: 3; padding: 15px;
        background: rgba(20,20,20,0.5);
        border-radius: 4px; border: 1px solid #282828;
        box-shadow: 0 0 30px rgba(0,0,0,0.5);
      }

      #dustborne-status-container {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 8px; font-size: .9em; color: #a0a0a0;
      }

      #dustborne-loading-bar-container { width: 100%; height: 4px; background: #222; border-radius: 2px; overflow: hidden; }
      #dustborne-loading-bar {
        width: 0%; height: 100%;
        background: linear-gradient(90deg, #c0a080, #e0c0a0);
        box-shadow: 0 0 8px #d0b090, 0 0 12px #d0b090;
        transition: width .4s ease-out, background-color .5s; border-radius: 2px;
      }
      #dustborne-loading-bar.error { background:#b04040; box-shadow:0 0 8px #f55,0 0 12px #f55; }

      /* --- Debugger Box Styles --- */
      #dustborne-log-container {
        margin-top: 15px; height: 150px; overflow-y: auto;
        background: rgba(0,0,0,0.4);
        border: 1px solid #282828; border-radius: 4px;
        padding: 10px; text-align: left; font-size: .8em; color: #ccc;
        scrollbar-width: thin; scrollbar-color: #444 #222;
        line-height: 1.5;
      }
      #dustborne-log-container p { margin: 0; padding: 2px 0; white-space: pre-wrap; display: flex; }
      .log-timestamp { color: #666; margin-right: 8px; flex-shrink: 0; }
      
      .log-info { color: #87ceeb; /* Sky Blue */ }
      .log-success { color: #98fb98; /* Pale Green */ }
      .log-warn { color: #ffd700; /* Gold */ }
      .log-error { color: #ff6b6b; /* Bright Red */ font-weight: bold; }
      .error-stack { color: #ff6b6b; opacity: 0.7; font-size: 0.9em; white-space: pre-wrap; padding-left: 10px; border-left: 2px solid #ff6b6b; margin: 5px 0 5px 1em; }
    `;
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerText = styles;
    document.head.appendChild(style);
  }

  _createDOM() {
    const container = document.createElement('div');
    container.id = 'dustborne-loading-screen';
    container.innerHTML = `
      <div>
        <h1 class="dustborne-logo">Dustborne</h1>
        <div class="dustborne-loader-container">
          <div id="dustborne-status-container">
            <span id="dustborne-loading-status">Initializing...</span>
            <span id="dustborne-loading-percentage">0%</span>
          </div>
          <div id="dustborne-loading-bar-container">
            <div id="dustborne-loading-bar"></div>
          </div>
          <div id="dustborne-log-container"></div>
        </div>
      </div>
    `;
    document.body.appendChild(container);
  }
}

// Create and export a single instance to be used throughout the application.
const loadingManager = new LoadingManager();
export default loadingManager;
