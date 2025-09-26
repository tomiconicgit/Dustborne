// File: loading.js

class LoadingManager {
  /**
   * The constructor runs immediately when this module is imported.
   * Its job is to create and display the loading screen UI instantly.
   */
  constructor() {
    this.loadingScreen = null;
    this.progressBar = null;
    this.statusElement = null;
    this.logContainer = null;
    this.percentEl = null;
    this.hasFailed = false;

    // These two methods create the visible loading screen.
    this._createStyles();
    this._createDOM();
    this._cacheDOMElements();

    this.log('Initializing Loading Manager...');
  }

  // =================================================================
  // MAIN LOADING LOGIC (YOUR NEW TWO-PHASE METHOD)
  // =================================================================

  /**
   * Starts a two-phase loading process.
   * Phase 1: Validates all game files listed in a manifest.
   * Phase 2: Asks the Engine what's needed and loads only those assets.
   * @param {class} EngineClass - The main Engine class.
   */
  async start(EngineClass) {
    if (!EngineClass) {
      this.fail(new Error("EngineClass was not provided to the loader."), { name: 'Bootstrap' });
      return;
    }

    // --- PHASE 1: VALIDATION ---
    this.log('Starting Phase 1: Validating all game files...');
    this._updateProgress('Validating game files...', 0);
    
    let allFiles;
    try {
      const response = await fetch('./file-manifest.json');
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const manifest = await response.json();
      allFiles = manifest.files;
      this.log(`Manifest loaded. Found ${allFiles.length} files to validate.`);
    } catch (error) {
      this.fail(error, { name: 'Manifest Loading' });
      return;
    }

    if (allFiles && allFiles.length > 0) {
      for (let i = 0; i < allFiles.length; i++) {
        const fileInfo = allFiles[i];
        const progress = ((i + 1) / allFiles.length) * 100;
        this._updateProgress(`Validating: ${fileInfo.path}`, progress);
        try {
          await this._validateFile(fileInfo);
        } catch (error) {
          this.fail(error, { name: `Validation of ${fileInfo.path}` });
          return;
        }
      }
    }
    this.log('✔ Phase 1 Complete: All game files validated successfully.', 'success');

    // --- PHASE 2: TARGETED LOADING ---
    this.log('Starting Phase 2: Loading initial scene assets...');
    this._updateProgress('Loading initial assets...', 0);
    
    const engineInstance = new EngineClass();
    if (typeof engineInstance.getInitialRequiredAssets !== 'function') {
      this.fail(new Error("Engine instance does not have a 'getInitialRequiredAssets' method."), { name: 'Asset Interrogation' });
      return;
    }

    const requiredAssets = engineInstance.getInitialRequiredAssets();
    this.log(`Engine requires ${requiredAssets.length} assets for the initial scene.`);
    
    if (requiredAssets.length > 0) {
      for (let i = 0; i < requiredAssets.length; i++) {
        const assetInfo = requiredAssets[i];
        const progress = ((i + 1) / requiredAssets.length) * 100;
        this._updateProgress(`Loading: ${assetInfo.name}`, progress);
        try {
          await this._executeTask(assetInfo);
          this.log(`✔ Loaded: ${assetInfo.name}`, 'success');
        } catch (error) {
          this.fail(error, { name: `Loading of ${assetInfo.name}` });
          return;
        }
      }
    }
    this.log('✔ Phase 2 Complete: Initial scene assets are loaded.', 'success');

    // --- FINAL BOOTSTRAP ---
    try {
      this.log('All phases complete. Initializing engine...');
      await engineInstance.init();
      this.log('Engine initialized. Starting game...');
      engineInstance.start();
    } catch (error) {
      this.fail(error, { name: 'Engine Initialization' });
      return;
    }
    
    this.finish();
  }

  // =================================================================
  // HELPER METHODS (VALIDATION, LOGGING, ETC.)
  // =================================================================

  async _validateFile(fileInfo) {
    try {
      if (fileInfo.type === 'script') {
        await import(fileInfo.path);
      } else {
        const response = await fetch(fileInfo.path);
        if (!response.ok) {
          throw new Error(`File not found or inaccessible (HTTP ${response.status})`);
        }
      }
    } catch (error) {
      throw new Error(`Validation failed for ${fileInfo.path}: ${error.message}`);
    }
  }

  _executeTask(task) {
    switch (task.type) {
      case 'script': return this._loadScript(task.path);
      case 'json': return this._loadJSON(task.path);
      case 'model':
      case 'texture':
      case 'audio':
        return this._simulateAssetLoad(task.path);
      default: return Promise.reject(new Error(`Unknown task type '${task.type}'`));
    }
  }

  _loadScript(path) { /* Redacted for brevity */ }
  async _loadJSON(path) { /* Redacted for brevity */ }
  _simulateAssetLoad(path) { return new Promise(resolve => setTimeout(resolve, 50 + Math.random() * 200)); }

  log(message, level = 'info') { /* Redacted for brevity */ }
  fail(error, task) { /* Redacted for brevity */ }
  finish() { /* Redacted for brevity */ }
  _updateProgress(message, progress) { /* Redacted for brevity */ }

  // =================================================================
  // UI CREATION METHODS (THE MISSING PIECE)
  // =================================================================

  _cacheDOMElements() {
    this.loadingScreen = document.getElementById('dustborne-loading-screen');
    this.progressBar   = document.getElementById('dustborne-loading-bar');
    this.statusElement = document.getElementById('dustborne-loading-status');
    this.logContainer  = document.getElementById('dustborne-log-container');
    this.percentEl     = document.getElementById('dustborne-loading-percentage');
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
          <div id="dustborne-loading-bar-container">
            <div id="dustborne-loading-bar"></div>
          </div>
          <div id="dustborne-log-container"></div>
        </div>
      </div>
    `;
    document.body.appendChild(container);
  }

  _createStyles() {
    const styles = `
      /* Redacted for brevity - this is the full CSS block from our previous conversations */
    `;
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerText = styles;
    document.head.appendChild(style);
  }
}

// Create and export the single instance. The constructor runs here.
const loadingManager = new LoadingManager();
export default loadingManager;
