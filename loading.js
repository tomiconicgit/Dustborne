// file: loading.js
class LoadingManager {
  constructor() {
    this.hasFailed = false;
    this.errorCount = 0;
    this.loadedModules = new Map();
    this._createStyles();
    this._createDOM();
    this._cacheDOMElements();
    this._wireGlobalErrorCapture();
    this.log('Initializing Loading Manager...');
  }

  async start(EngineClass) {
    const engineInstance = new EngineClass();
    const delay = (ms) => new Promise(r => setTimeout(r, ms));
    this.log('Phase 1: Loading game modules...');
    this._updateProgress('Loading modules...', 0);
    const manifest = engineInstance.getManifest();
    if (!manifest || manifest.length === 0) return this.fail(new Error('Manifest is empty.'));
    for (let i = 0; i < manifest.length; i++) {
      const task = manifest[i];
      const progress = ((i + 1) / manifest.length) * 80;
      this._updateProgress(`Loading: ${task.name}`, progress);
      await delay(25);
      try {
        const mod = await import(task.path);
        this.loadedModules.set(task.path, mod);
      } catch (err) {
        return this.fail(err, task);
      }
    }
    this.log('✔ Phase 1 complete.', 'success');
    this.log('Phase 2: Initializing systems...');
    this._updateProgress('Initializing systems...', 80);
    const startModules = engineInstance.getStartModules();
    if (!startModules || startModules.length === 0) return this.fail(new Error('No start modules defined in engine.js'));
    for (let i = 0; i < startModules.length; i++) {
      const task = startModules[i];
      const progress = 80 + ((i + 1) / startModules.length) * 20;
      const module = this.loadedModules.get(task.path);
      if (!module) return this.fail(new Error(`Module not found for path: ${task.path}`), task);
      const ModuleClass = module.default;
      if (!ModuleClass || typeof ModuleClass[task.startFunction] !== 'function') return this.fail(new Error(`'${task.startFunction}' is not a static function on module: ${task.path}`), task);
      this._updateProgress(`Starting: ${task.path.split('/').pop()}`, progress);
      await delay(50);
      try {
        await ModuleClass[task.startFunction]();
      } catch (err) {
        return this.fail(err, task);
      }
    }
    this.log('✔ Phase 2 complete.', 'success');
    this._updateProgress('Ready', 100, { complete: true });
    this._showStartButton();
  }

  _showStartButton() {
    this.startButton.disabled = false;
    this.startButton.setAttribute('aria-disabled', 'false');
    this.startButton.classList.add('show');
    this.startButton.addEventListener('click', () => {
      if (this.loadingScreen.classList.contains('fade-out')) return;
      this.startButton.classList.add('btn-pressed');
      this.loadingScreen.classList.add('fade-out');
      const removeLoader = () => this.loadingScreen.remove();
      let fired = false;
      this.loadingScreen.addEventListener('transitionend', () => { if (fired) return; fired = true; removeLoader(); }, { once: true });
      setTimeout(() => { if (!fired) removeLoader(); }, 1200);
    }, { once: true });
  }

  reportBootError(error, ctx = {}) { const mod = ctx.module || '(boot)'; const msg = (error && (error.stack || error.message || String(error))) || 'Unknown boot error'; this.log(`Boot import failed for ${mod}: ${msg}`, 'error'); this.statusElement.textContent = 'Boot Error'; this.progressBar.classList.remove('complete'); this.progressBar.classList.add('error'); this.progressBar.style.width = '100%'; this.percentEl.textContent = 'FAIL'; this.copyErrorsBtn.classList.add('show'); }
  log(message, level = 'info') { if (!this.logContainer) return; const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 }); const p = document.createElement('p'); p.className = `log-${level}`; p.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> ${message}`; this.logContainer.appendChild(p); this.logContainer.scrollTop = this.logContainer.scrollHeight; if (level === 'error') { this.errorCount++; this.copyErrorsBtn.classList.add('show'); } const consoleLevel = level === 'success' ? 'log' : level; (console[consoleLevel] || console.log).call(console, `[LoadingManager] ${message}`); }
  fail(error, task) { if (this.hasFailed) return; this.hasFailed = true; const msg = error?.message || 'Unknown error'; this.log(`❌ FATAL during [${task?.name || task?.path || 'unknown'}]: ${msg}`, 'error'); console.error('[LoadingManager] Failure context:', { task, error }); this.statusElement.textContent = 'Fatal Error'; this.progressBar.classList.remove('complete'); this.progressBar.classList.add('error'); this.progressBar.style.width = '100%'; this.percentEl.textContent = 'FAIL'; this.copyErrorsBtn.classList.add('show'); }
  _updateProgress(message, progress, opts = {}) { if (this.hasFailed) return; this.statusElement.textContent = message; const pct = Math.max(0, Math.min(100, Math.floor(progress))); this.percentEl.textContent = `${pct}%`; this.progressBar.style.width = `${pct}%`; this.progressBar.setAttribute('aria-valuenow', String(pct)); if (opts.complete || pct >= 100) { this.progressBar.classList.remove('error'); this.progressBar.classList.add('complete'); } }
  _copyErrorsToClipboard() { const errs = [...this.logContainer.querySelectorAll('.log-error')].map(p => p.textContent.trim()); const text = errs.length ? errs.join('\n') : 'No errors logged.'; (async () => { try { await navigator.clipboard.writeText(text); this.log('Copied errors to clipboard.', 'success'); } catch { const ta = document.createElement('textarea'); ta.value = text; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); this.log('Copied errors to clipboard (fallback).', 'success'); } })(); }
  _wireGlobalErrorCapture() { window.addEventListener('error', (e) => { const where = e?.filename ? ` @ ${e.filename}:${e.lineno}:${e.colno}` : ''; this.log(`Error: ${e?.message || 'Unknown'}${where}`, 'error'); }); window.addEventListener('unhandledrejection', (e) => { const reason = e?.reason?.message || e?.reason || 'Unhandled promise rejection'; this.log(`UnhandledRejection: ${reason}`, 'error'); }); }
  _cacheDOMElements() { this.loadingScreen = document.getElementById('dustborne-loading-screen'); this.progressOuter = document.getElementById('dustborne-loading-bar-container'); this.progressBar = document.getElementById('dustborne-loading-bar'); this.percentEl = document.getElementById('dustborne-bar-label'); this.statusElement = document.getElementById('dustborne-loading-status'); this.startButton = document.getElementById('dustborne-start-button'); this.copyErrorsBtn = document.getElementById('dustborne-copy-errors-btn'); this.logContainer = document.getElementById('dustborne-log-container'); this.copyErrorsBtn.addEventListener('click', () => this._copyErrorsToClipboard()); }
  _createDOM() { document.body.insertAdjacentHTML('afterbegin', `<div id="dustborne-loading-screen"><div id="dustborne-loading-content"><h1 id="dustborne-loading-title">Dustborne</h1><div id="dustborne-loading-bar-container" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"><div id="dustborne-loading-bar"></div><span id="dustborne-bar-label">0%</span></div><p id="dustborne-loading-status">Initializing...</p><div id="dustborne-log-container"></div><div id="dustborne-loading-actions"><button id="dustborne-start-button" disabled aria-disabled="true">Start</button><button id="dustborne-copy-errors-btn">Copy Errors</button></div></div></div>`); }
  _createStyles() { const s = document.createElement('style'); s.textContent = `...`; document.head.appendChild(s); }
}
const loadingManager = new LoadingManager();
export default loadingManager;
