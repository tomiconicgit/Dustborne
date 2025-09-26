// File: loading.js

class LoadingManager {
  constructor() {
    this.loadingScreen = null;
    this.progressBar = null;
    this.statusElement = null;
    this.logContainer = null;
    this.percentEl = null;
    this.hasFailed = false;

    this._createStyles();
    this._createDOM();
    this._cacheDOMElements();

    this.log('Initializing Loading Manager...');
  }

  // The async start method you provided is correct.
  async start(GameClass) {
    this.log('Loader received Game class.');
    
    if (!GameClass) {
      this.fail(new Error("GameClass was not provided to the loader."), { name: 'Bootstrap' });
      return;
    }

    const gameInstance = new GameClass();
    this.log('Game instance created.');

    if (typeof gameInstance.getLoadingTasks !== 'function') {
        this.fail(new Error("Game instance does not have a 'getLoadingTasks' method."), { name: 'Manifest' });
        return;
    }
    const tasks = gameInstance.getLoadingTasks();
    
    if (!tasks || !tasks.length) {
      this.log('No loading tasks provided by the game. Moving to initialization.', 'warn');
    } else {
      this.log(`Starting loading sequence with ${tasks.length} tasks from game manifest...`);
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
          this.fail(error, task);
          return;
        }
      }
    }

    try {
      this.log('All tasks complete. Initializing game...');
      this._updateProgress('Initializing game...', 100);
      await gameInstance.init();
      
      this.log('Game initialized. Starting game loop...');
      gameInstance.start();
    } catch (error) {
        this.fail(error, { name: 'Game Initialization' });
        return;
    }
    this.finish();
  }

  // --- The rest of the class (debugger, UI, etc.) ---

  log(message, level = 'info') {
    if (!this.logContainer) return;
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 });
    const p = document.createElement('p');
    p.className = `log-${level}`;
    p.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> ${message}`;
    this.logContainer.appendChild(p);
    this.logContainer.scrollTop = this.logContainer.scrollHeight;
    if (level === 'warn' || level === 'error') console[level](`[LoadingManager] ${message}`);
    else console.log(`[LoadingManager] ${message}`);
  }
  
  fail(error, task) {
    if (this.hasFailed) return;
    this.hasFailed = true;
    const errorMessage = error?.message || 'An unknown error occurred.';
    this.log(`✖ FATAL ERROR while loading ${task.name}: ${errorMessage}`, 'error');
    console.error(`[LoadingManager] Failed on task: ${task.name}`, { task, error });
    this.statusElement.textContent = 'Fatal Error';
    this.percentEl.textContent = 'FAIL';
    this.progressBar.classList.add('error');
    this.progressBar.style.width = '100%';
    if (error.stack) {
        const stackElement = document.createElement('p');
        stackElement.className = 'error-stack';
        stackElement.textContent = error.stack;
        this.logContainer.appendChild(stackElement);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }
  }

  finish() {
    if (this.hasFailed) return;
    this.log('Initialization complete! Starting the game.', 'success');
    this._updateProgress('Ready!', 100);
    setTimeout(() => {
      this.loadingScreen.classList.add('fade-out');
      this.loadingScreen.addEventListener('transitionend', () => this.loadingScreen.remove(), { once: true });
    }, 750);
  }
  
  _executeTask(task) {
    switch (task.type) {
      case 'script': return this._loadScript(task.path);
      case 'json': return this._loadJSON(task.path);
      case 'asset': return this._simulateAssetLoad(task.path);
      default: return Promise.reject(new Error(`Unknown task type '${task.type}'`));
    }
  }

  _loadScript(path) {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.type = 'module';
      script.src = path;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Script failed to load: ${path}`));
      document.head.appendChild(script);
    });
  }

  async _loadJSON(path) { /* ... fetch logic ... */ }
  _simulateAssetLoad(path) { return new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 200)); }
  _updateProgress(message, progress) { /* ... UI update logic ... */ }
  _cacheDOMElements() { /* ... getElementById logic ... */ }
  _createStyles() { /* ... CSS injection logic ... */ }
  _createDOM() { /* ... innerHTML logic ... */ }

  // NOTE: I've truncated some of the UI methods for brevity, but you should use the full versions from our previous conversation.
}

const loadingManager = new LoadingManager();
export default loadingManager;
