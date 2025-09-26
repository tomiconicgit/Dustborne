// file: loading.js

class LoadingManager {
  constructor() {
    this.hasFailed = false;
    this.errorCount = 0;
    this.loadedModules = new Map();
    this.engine = null; // <-- keep engine instance for start routing

    this._createStyles();
    this._createDOM();
    this._cacheDOMElements();
    this._wireGlobalErrorCapture();

    this.log('Initializing Loading Manager…');
  }

  async start(EngineClass) {
    const engineInstance = new EngineClass();
    this.engine = engineInstance; // <-- store for Start Game
    const delay = (ms) => new Promise(r => setTimeout(r, ms));

    // --- PHASE 1: VALIDATION ---
    this.log('Phase 1: Validating game files…');
    const manifest = engineInstance.getFullManifest();
    if (!manifest || manifest.length === 0) {
      this.log('Manifest empty. Nothing to validate.', 'warn');
    } else {
      for (let i = 0; i < manifest.length; i++) {
        const task = manifest[i];
        const progress = ((i + 1) / manifest.length) * 100;
        this._updateProgress(`Validating: ${task.name}`, progress);
        await delay(120);
        try { await this._validateFile(task); }
        catch (err) { return this.fail(err, task); }
      }
    }
    this.log('✔ Phase 1 complete.', 'success');

    // --- PHASE 2: LOAD INITIAL ASSETS ---
    this.log('Phase 2: Loading initial assets…');
    const initial = engineInstance.getInitialAssets();
    if (!initial || initial.length === 0) {
      this.log('No initial assets required.', 'warn');
    } else {
      for (let i = 0; i < initial.length; i++) {
        const task = initial[i];
        const progress = ((i + 1) / initial.length) * 100;
        this._updateProgress(`Loading: ${task.name}`, progress);
        await delay(160);
        try {
          const mod = await this._executeTask(task);
          this.loadedModules.set(task.path, mod);
        } catch (err) {
          return this.fail(err, task);
        }
      }
    }
    this.log('✔ Phase 2 complete.', 'success');

    // 100% + green; reveal Start (no layout shift)
    this._updateProgress('Ready to start', 100, { complete: true });
    this._showStartButton();
  }

  _showStartButton() {
    this.startButton.disabled = false;
    this.startButton.setAttribute('aria-disabled', 'false');
    this.startButton.classList.add('show'); // fade in; row height reserved from start

    this.startButton.onclick = null;
    this.startButton.addEventListener('click', () => {
      if (this.loadingScreen.classList.contains('fade-out')) return;
      this.startButton.classList.add('btn-pressed');
      this.loadingScreen.classList.add('fade-out');

      const run = () => {
        this.loadingScreen.remove();

        // --- Ask engine what to boot as the start area
        const startTarget = this.engine?.getStartModule?.();
        if (!startTarget || !startTarget.path) {
          console.error('Engine did not specify a start module.');
          return;
        }

        const mod = this.loadedModules.get(startTarget.path);
        const fnName = startTarget.fn || 'show';

        if (mod && typeof mod[fnName] === 'function') {
          try {
            // Pass a target root id for mounting if desired
            mod[fnName]({ rootId: 'game-root' });
          } catch (err) {
            console.error('Start handler threw:', err);
          }
        } else {
          console.error(`Could not find '${fnName}' in ${startTarget.path}`);
        }
      };

      let fired = false;
      this.loadingScreen.addEventListener('transitionend', () => { if (fired) return; fired = true; run(); }, { once: true });
      setTimeout(() => { if (!fired) run(); }, 1200); // iOS fallback
    }, { once: true });
  }

  async _validateFile(task) {
    if (task.type === 'script') await import(task.path);
  }

  async _executeTask(task) {
    if (task.type === 'script') return import(task.path);
    throw new Error(`Unknown task type '${task.type}'`);
  }

  // --- UI & LOGGING (unchanged below) ---
  log(message, level = 'info') { /* ...unchanged... */ }
  fail(error, task) { /* ...unchanged... */ }
  _updateProgress(message, progress, opts = {}) { /* ...unchanged... */ }
  _copyErrorsToClipboard() { /* ...unchanged... */ }
  _wireGlobalErrorCapture() { /* ...unchanged... */ }
  _cacheDOMElements() { /* ...unchanged... */ }
  _createDOM() { /* ...unchanged... */ }
  _createStyles() { /* ...unchanged... */ }
}

const loadingManager = new LoadingManager();
export default loadingManager;