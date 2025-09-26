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

    this.log('Initializing Loading Manager…');
  }

  async start(EngineClass) {
    const engineInstance = new EngineClass();
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
        const testModule = this.loadedModules.get('./src/core/test.js');
        if (testModule && typeof testModule.show === 'function') {
          try { testModule.show(); } catch (err) { console.error('Start handler threw:', err); }
        } else {
          console.error("Could not find the 'show' function in ./src/core/test.js");
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

  // --- UI & LOGGING ---------------------------------------------------------
  log(message, level = 'info') {
    if (!this.logContainer) return;
    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3
    });

    const p = document.createElement('p');
    p.className = `log-${level}`;
    p.innerHTML = `<span class="log-timestamp">[${timestamp}]</span> ${message}`;
    this.logContainer.appendChild(p);
    this.logContainer.scrollTop = this.logContainer.scrollHeight;

    if (level === 'error') {
      this.errorCount++;
      this.copyErrorsBtn.classList.add('show'); // fade in; space reserved
    }

    const consoleLevel = level === 'success' ? 'log' : level;
    (console[consoleLevel] || console.log).call(console, `[LoadingManager] ${message}`);
  }

  fail(error, task) {
    if (this.hasFailed) return;
    this.hasFailed = true;

    const msg = error?.message || 'Unknown error';
    this.log(`❌ FATAL during [${task?.name || 'unknown'}]: ${msg}`, 'error');
    console.error('[LoadingManager] Failure context:', { task, error });

    this.statusElement.textContent = 'Fatal Error'; // hidden but kept for code simplicity

    this.progressBar.classList.remove('complete');
    this.progressBar.classList.add('error');
    this.progressBar.style.width = '100%';
    this.percentEl.textContent = 'FAIL';

    this.copyErrorsBtn.classList.add('show');
  }

  _updateProgress(message, progress, opts = {}) {
    if (this.hasFailed) return;
    this.statusElement.textContent = message; // hidden (sr-only)
    const pct = Math.max(0, Math.min(100, Math.floor(progress)));
    this.percentEl.textContent = `${pct}%`;
    this.progressBar.style.width = `${pct}%`;
    this.progressBar.setAttribute('aria-valuenow', String(pct));
    if (opts.complete || pct >= 100) {
      this.progressBar.classList.remove('error');
      this.progressBar.classList.add('complete'); // green
    }
  }

  _copyErrorsToClipboard() {
    const errs = [...this.logContainer.querySelectorAll('.log-error')].map(p => p.textContent.trim());
    const text = errs.length ? errs.join('\n') : 'No errors logged.';
    (async () => {
      try {
        await navigator.clipboard.writeText(text);
        this.log('Copied errors to clipboard.', 'success');
      } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        ta.remove();
        this.log('Copied errors to clipboard (fallback).', 'success');
      }
    })();
  }

  _wireGlobalErrorCapture() {
    window.addEventListener('error', (e) => {
      const where = e?.filename ? ` @ ${e.filename}:${e.lineno}:${e.colno}` : '';
      this.log(`Error: ${e?.message || 'Unknown'}${where}`, 'error');
    });
    window.addEventListener('unhandledrejection', (e) => {
      const reason = e?.reason?.message || e?.reason || 'Unhandled promise rejection';
      this.log(`UnhandledRejection: ${reason}`, 'error');
    });
  }

  _cacheDOMElements() {
    this.loadingScreen  = document.getElementById('dustborne-loading-screen');
    this.progressOuter  = document.getElementById('dustborne-loading-bar-container');
    this.progressBar    = document.getElementById('dustborne-loading-bar');
    this.percentEl      = document.getElementById('dustborne-bar-label');
    this.statusElement  = document.getElementById('dustborne-loading-status'); // sr-only
    this.startButton    = document.getElementById('dustborne-start-button');
    this.copyErrorsBtn  = document.getElementById('dustborne-copy-errors-btn');
    this.logContainer   = document.getElementById('dustborne-log-container');

    this.copyErrorsBtn.addEventListener('click', () => this._copyErrorsToClipboard());
  }

  _createDOM() {
    const wrap = document.createElement('div');
    wrap.id = 'dustborne-loading-screen';
    // Reverted to the simpler, correct DOM structure
    wrap.innerHTML = `
      <div class="db-center">
        <h1 class="db-brand" aria-label="Dustborne">Dustborne</h1>
      
        <span id="dustborne-loading-status" class="sr-only">Initializing…</span>

        <div id="dustborne-loading-bar-container" class="db-bar-outer"
             role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"
             aria-label="Loading progress">
          <div id="dustborne-loading-bar" class="db-bar-fill"></div>
          <div id="dustborne-bar-label" class="db-bar-label">0%</div>
        </div>

        <div class="db-controls" aria-live="polite">
          <button id="dustborne-start-button" class="db-btn db-btn-primary" disabled aria-disabled="true">Start Game</button>
          <button id="dustborne-copy-errors-btn" class="db-btn db-btn-ghost" aria-label="Copy errors">Copy Errors</button>
        </div>
      </div>

      <div class="db-debug-card" role="region" aria-label="Log">
        <div id="dustborne-log-container" class="db-log"></div>
      </div>
    `;
    document.body.appendChild(wrap);
  }

  _createStyles() {
    const css = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
      @font-face { font-family: 'Druk Wide';
        src: local('Druk Wide'), local('Druk Wide Trial'), local('DrukWide');
        font-weight: 700; font-style: normal; font-display: swap;
      }

      @keyframes float-slow {
        0% { transform: translate(0, 0); }
        50% { transform: translate(20px, -25px); opacity: 1; }
        100% { transform: translate(0, 0); }
      }
      @keyframes float-fast {
        0% { transform: translate(0, 0); }
        50% { transform: translate(-30px, 20px); opacity: 0.5; }
        100% { transform: translate(0, 0); }
      }

      :root {
        --db-bg: #1a1612;
        --db-text: #f5eeda;
        --db-subtle: #c3b8a5;
        --db-stroke: rgba(245, 238, 218, 0.1);
        --db-green: #28a745;
        --db-green-glow: rgba(40, 167, 69, 0.45);
        --db-red: #dc3545;
        --db-red-glow: rgba(220, 53, 69, 0.45);
        --db-blue: #42a5ff;
        --db-blue-glow: rgba(66,165,255,0.45);
      }

      .sr-only { position:absolute; width:1px; height:1px; padding:0; margin:-1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; border:0; }

      #dustborne-loading-screen {
        position: fixed; inset: 0; z-index: 10000;
        display: flex; flex-direction: column; align-items: center;
        background: radial-gradient(1200px 800px at 20% 10%, rgba(210, 180, 140, 0.12), transparent 60%),
                    radial-gradient(900px 600px at 80% 90%, rgba(139, 69, 19, 0.1), transparent 55%),
                    var(--db-bg);
        color: var(--db-text);
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        opacity: 1; visibility: visible; transition: opacity .9s ease, visibility .9s ease;
        padding: 24px 12px;
        position: relative;
        overflow: hidden;
      }
      #dustborne-loading-screen.fade-out { opacity: 0; visibility: hidden; pointer-events: none; }
      
      #dustborne-loading-screen::before, #dustborne-loading-screen::after {
        content: '';
        position: absolute;
        inset: -200px;
        pointer-events: none;
      }
      #dustborne-loading-screen::before {
        background-image:
          radial-gradient(3px 3px at 10% 40%, rgba(245, 238, 218, 0.1), transparent),
          radial-gradient(2px 2px at 50% 20%, rgba(245, 238, 218, 0.15), transparent),
          radial-gradient(3px 3px at 85% 60%, rgba(245, 238, 218, 0.1), transparent),
          radial-gradient(2px 2px at 30% 90%, rgba(245, 238, 218, 0.15), transparent);
        animation: float-slow 50s linear infinite;
        z-index: 1;
      }
      #dustborne-loading-screen::after {
        background-image:
          radial-gradient(1px 1px at 20% 15%, rgba(245, 238, 218, 0.3), transparent),
          radial-gradient(1px 1px at 70% 35%, rgba(245, 238, 218, 0.3), transparent),
          radial-gradient(2px 2px at 40% 70%, rgba(245, 238, 218, 0.25), transparent),
          radial-gradient(1px 1px at 90% 85%, rgba(245, 238, 218, 0.3), transparent);
        animation: float-fast 35s linear infinite;
        z-index: 2;
      }

      .db-brand {
        font-family: 'Druk Wide', Impact, 'Arial Black', system-ui, sans-serif;
        font-weight: 700; text-transform: uppercase; letter-spacing: 2px;
        margin: 12px 0 20px;
        font-size: clamp(28px, 8vw, 72px); line-height: 1;
        background: linear-gradient(180deg, #fdf5e6 0%, #e8d7ab 50%, #d4b97a 100%);
        -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent;
        text-shadow: 0 2px 0 rgba(0,0,0,0.35), 0 12px 28px rgba(0,0,0,0.35);
      }

      .db-center {
        flex: 1; width: 100%;
        display: flex; flex-direction: column; align-items: center; justify-content: center;
        gap: 14px;
        position: relative; z-index: 10; /* Ensures this content is above the dust */
      }

      .db-bar-outer {
        width: min(92vw, 760px); height: 14px;
        background: rgba(255,255,255,0.06);
        border: 1px solid var(--db-stroke);
        border-radius: 999px; padding: 2px; overflow: hidden; position: relative;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
      }
      .db-bar-fill {
        width: 0%; height: 100%; border-radius: 999px;
        background: linear-gradient(90deg, var(--db-blue), #7bc4ff);
        box-shadow: 0 0 14px var(--db-blue-glow);
        transition: width .35s ease, background .35s ease, box-shadow .35s ease;
        transform: translateZ(0);
      }
      .db-bar-fill.complete {
        background: linear-gradient(90deg, var(--db-green), #5cb85c);
        box-shadow: 0 0 14px var(--db-green-glow);
      }
      .db-bar-fill.error {
        background: linear-gradient(90deg, var(--db-red), #e4606d);
        box-shadow: 0 0 14px var(--db-red-glow);
      }
      .db-bar-label {
        position: absolute; inset: 0; display: grid; place-items: center;
        font-size: 12px; font-weight: 700; letter-spacing: .4px; color: #0b1220;
        text-shadow: 0 1px 0 rgba(255,255,255,0.35); pointer-events: none;
      }

      .db-controls {
        width: min(92vw, 760px); height: 48px;
        display: flex; align-items: center; justify-content: center; gap: 12px;
      }
      .db-btn {
        appearance: none; border: 0; cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center;
        gap: 8px; border-radius: 8px; font-weight: 700;
        transition: opacity .35s ease, visibility .35s ease, transform .15s ease, box-shadow .2s ease, background .2s ease, border-color .2s ease;
        will-change: opacity, transform; opacity: 0; visibility: hidden; pointer-events: none;
      }
      .db-btn.show { opacity: 1; visibility: visible; pointer-events: auto; }
      .db-btn:active {
        transform: translateY(2px); filter: brightness(0.95);
      }

      .db-btn-primary[disabled], .db-btn-primary[aria-disabled="true"] { opacity: .55; cursor: not-allowed; }
      
      .db-btn-primary {
        color: var(--db-text); background: #4a3f32;
        font-size: 14px; text-transform: uppercase; letter-spacing: 1px;
        padding: 14px 28px; border: 1px solid #7c6841;
        box-shadow: inset 0 0 0 1px rgba(245, 238, 218, 0.1), 0 4px 12px rgba(0,0,0,0.5);
        text-shadow: 0 1px 2px rgba(0,0,0,0.4);
      }
      .db-btn-primary:not([disabled]):hover {
        background: #5a4f42; border-color: #a18a5b;
        box-shadow: inset 0 0 0 1px rgba(245, 238, 218, 0.2), 0 6px 16px rgba(0,0,0,0.5);
        transform: translateY(-1px);
      }
      .db-btn-primary:active { transform: translateY(1px); }

      .db-btn-ghost {
        color: var(--db-text); background: rgba(255,255,255,0.06);
        border: 1px solid var(--db-stroke); padding: 10px 16px;
      }
      .db-btn-ghost:hover { background: rgba(255,255,255,0.09); }

      .db-debug-card {
        position: fixed; left: 50%; transform: translateX(-50%); bottom: 16px;
        width: min(92vw, 760px); background: rgba(26, 22, 18, 0.7);
        backdrop-filter: blur(14px) saturate(1.2); -webkit-backdrop-filter: blur(14px) saturate(1.2);
        border: 1px solid var(--db-stroke); border-radius: 14px;
        box-shadow: 0 14px 40px rgba(0,0,0,.45);
        overflow: hidden;
        z-index: 10; /* Ensures this content is above the dust */
      }
      .db-log {
        max-height: 28vh; min-height: 120px;
        overflow: auto; padding: 10px 12px;
        font-size: 12.5px; line-height: 1.55; scrollbar-width: thin;
      }
      .db-log p { margin: 0; padding: 2px 0; white-space: pre-wrap; display: flex; gap: 8px; }
      .log-timestamp { color: var(--db-subtle); flex-shrink: 0; }
      .log-info { color: #e6c891; }
      .log-success { color: var(--db-green); }
      .log-warn { color: #ffd46b; }
      .log-error { color: var(--db-red); font-weight: 600; }
    `;
    const style = document.createElement('style');
    style.type = 'text/css';
    style.textContent = css;
    document.head.appendChild(style);
  }
}

const loadingManager = new LoadingManager();
export default loadingManager;
