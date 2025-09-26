// In loading.js, replace the entire start() method with this new logic.

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
    this.log('✔ Phase 1 Complete: All game files validated successfully.', 'success');


    // --- PHASE 2: TARGETED LOADING ---
    this.log('Starting Phase 2: Loading initial scene assets...');
    this._updateProgress('Loading initial assets...', 0);
    
    const engineInstance = new EngineClass();
    if (typeof engineInstance.getInitialRequiredAssets !== 'function') {
      this.fail(new Error("Engine instance does not have a 'getInitialRequiredAssets' method."), { name: 'Asset Interrogation' });
      return;
    }

    // Ask the engine what it needs for the default game state.
    const requiredAssets = engineInstance.getInitialRequiredAssets();
    this.log(`Engine requires ${requiredAssets.length} assets for the initial scene.`);
    
    if (requiredAssets.length > 0) {
        for (let i = 0; i < requiredAssets.length; i++) {
            const assetInfo = requiredAssets[i];
            const progress = ((i + 1) / requiredAssets.length) * 100;
            this._updateProgress(`Loading: ${assetInfo.name}`, progress);
            try {
                // Use the existing _executeTask to actually load the file
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

  /**
   * Validates a file without fully loading it into memory.
   * For scripts, it checks for syntax errors. For assets, it checks for existence.
   */
  async _validateFile(fileInfo) {
    try {
      if (fileInfo.type === 'script') {
        // Dynamic import() is perfect for validation. It parses the script
        // and throws an error if there's a syntax issue, without executing it.
        await import(fileInfo.path);
      } else {
        // For any other file, a fetch request checks if it's accessible (not 404).
        const response = await fetch(fileInfo.path);
        if (!response.ok) {
          throw new Error(`File not found or inaccessible (HTTP ${response.status})`);
        }
      }
    } catch (error) {
      // Re-throw with more context.
      throw new Error(`Validation failed for ${fileInfo.path}: ${error.message}`);
    }
  }

