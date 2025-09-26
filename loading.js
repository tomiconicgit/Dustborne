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
        try {
          await this._validateFile(task);
        } catch (err) {
          return this.fail(err, task);
        }
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

    // 100% + green; reveal Start
    this._updateProgress('Ready to start', 100, { complete: true });
    this._showStartButton();
  }

  _showStartButton() {
    this.startButton.disabled = false;
    this.startButton.setAttribute('aria-disabled', 'false');
    this.startButton.style.display = 'inline-flex';

    this.startButton.onclick = null;
    this.startButton.addEventListener('click', () => {
      if (this.loadingScreen.classList.contains('fade-out')) return;

      this.startButton.classList.add('btn-pressed');
      this.loadingScreen.classList.add('fade-out');

      const run = () => {
        this.loadingScreen.remove();
        const testModule = this.loadedModules.get('./src/core/test.js');
        if (testModule && typeof testModule.show === 'function') {
          try { testModule.show(); } catch (err) { console.error('Start screen handler threw:', err); }
        } else {
          console.error("Could not find the 'show' function in ./src/core/test.js");
        }
      };
      let fired = false;
      this.loadingScreen.addEventListener('transitionend', () => { if (fired) return; fired = true; run(); }, { once: true });
      setTimeout(() => { if (!fired) run(); }, 1200);
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
      this.copyErrorsBtn.style.display = 'inline-flex';
    }

    const consoleLevel = level === 'success' ? 'log' : level;
    (console[consoleLevel] || console.log).call(console, `[LoadingManager] ${message}`);
  }

  fail(error, task) {
    if (this.hasFailed) return;
    this.hasFailed = true;

    const msg = error?.message || 'Unknown error';
    this.log(`✖ FATAL during [${task?.name || 'unknown'}]: ${msg}`, 'error');
    console.error('[LoadingManager] Failure context:', { task, error });

    this.statusElement.textContent = 'Fatal Error';
    this.percentEl.textContent = 'FAIL';

    this.progressBar.classList.remove('complete');
    this.progressBar.classList.add('error');
    this.progressBar.style.width = '100%';

    this.copyErrorsBtn.style.display = 'inline-flex';
  }

  _updateProgress(message, progress, opts = {}) {
    if (this.hasFailed) return;
    this.statusElement.textContent = message;
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
    const doCopy = async () => {
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
    };
    doCopy();
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
    this.progressBar    = document.getElementById('dustborne-loading-bar');
    this.statusElement  = document.getElementById('dustborne-loading-status');
    this.logContainer   = document.getElementById('dustborne-log-container');
    this.percentEl      = document.getElementById('dustborne-loading-percentage');
    this.startButton    = document.getElementById('dustborne-start-button');
    this.copyErrorsBtn  = document.getElementById('dustborne-copy-errors-btn');
  }

  _createDOM() {
    const wrap = document.createElement('div');
    wrap.id = 'dustborne-loading-screen';
    wrap.innerHTML = `
      <h1 class="db-brand" aria-label="Dustborne">Dustborne</h1>

      <div class="db-modal">
        <div class="db-modal-body">
          <div id="dustborne-status-container" class="db-status">
            <span id="dustborne-loading-status" aria-live="polite">Initializing…</span>
            <span id="dustborne-loading-percentage" class="db-percent">0%</span>
          </div>

          <div id="dustborne-loading-bar-container" class="db-bar-outer" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div id="dustborne-loading-bar" class="db-bar-fill"></div>
          </div>

          <div id="dustborne-log-container" class="db-log" aria-live="polite" aria-label="Debugger log"></div>
        </div>

        <div class="db-modal-footer">
          <button id="dustborne-copy-errors-btn" class="db-btn db-btn-ghost" style="display:none" aria-label="Copy errors">Copy errors</button>
          <button id="dustborne-start-button" class="db-btn db-btn-primary" disabled aria-disabled="true">Start</button>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    wrap.addEventListener('click', (e) => {
      if (e.target && e.target.id === 'dustborne-copy-errors-btn') this._copyErrorsToClipboard();
    });
  }

  _createStyles() {
    const css = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');

      /* If you self-host Druk Wide, declare it here (local lookup as fallback) */
      @font-face {
        font-family: 'Druk Wide';
        src: local('Druk Wide'), local('Druk Wide Trial'), local('DrukWide');
        font-weight: 700; font-style: normal; font-display: swap;
      }

      :root {
        --db-bg: #0a0c10;
        --db-glass: rgba(16,18,24,0.6);
        --db-stroke: rgba(255,255,255,0.08);
        --db-text: #e6e9ef;
        --db-subtle: #a1a8b3;
        --db-blue: #42a5ff;
        --db-blue-glow: rgba(66,165,255,0.45);
        --db-green: #25c46a;
        --db-green-glow: rgba(37,196,106,0.45);
        --db-red: #ff4d4d;
        --db-red-glow: rgba(255,77,77,0.45);
      }

      #dustborne-loading-screen {
        position: fixed; inset: 0; z-index: 10000;
        display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px;
        background: radial-gradient(1200px 800px at 20% 10%, rgba(66,165,255,0.08), transparent 60%),
                    radial-gradient(900px 600px at 80% 90%, rgba(37,196,106,0.08), transparent 55%),
                    var(--db-bg);
        color: var(--db-text);
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
        transition: opacity .9s ease, visibility .9s ease;
        opacity: 1; visibility: visible;
        padding: 24px 12px;
      }
      #dustborne-loading-screen.fade-out { opacity: 0; visibility: hidden; pointer-events: none; }

      .db-brand {
        font-family: 'Druk Wide', Impact, 'Arial Black', system-ui, sans-serif;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 2px;
        margin: 0 0 6px 0;
        font-size: clamp(28px, 8vw, 72px);
        line-height: 1;
        background: linear-gradient(180deg, #f0f0f0 0%, #a8a8a8 25%, #6a6a6a 50%, #a8a8a8 75%, #f0f0f0 100%);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent;
        text-shadow: 0 2px 0 rgba(0,0,0,0.35), 0 12px 28px rgba(0,0,0,0.35);
      }

      .db-modal {
        width: min(92vw, 760px);
        border-radius: 16px;
        background: var(--db-glass);
        backdrop-filter: blur(18px) saturate(1.2);
        -webkit-backdrop-filter: blur(18px) saturate(1.2);
        border: 1px solid var(--db-stroke);
        box-shadow: 0 20px 60px rgba(0,0,0,.45), 0 0 0 1px rgba(255,255,255,.02) inset;
        overflow: clip;
      }

      .db-modal-body { padding: 16px; }
      .db-modal-footer {
        display: flex; align-items: center; justify-content: space-between;
        padding: 14px 16px; border-top: 1px solid var(--db-stroke);
      }

      .db-status {
        display: flex; align-items: baseline; justify-content: space-between;
        font-size: 14px; color: var(--db-subtle); margin-bottom: 10px;
      }
      .db-percent { font-variant-numeric: tabular-nums; color: var(--db-text); }

      .db-bar-outer {
        width: 100%; height: 12px; /* thicker */
        background: rgba(255,255,255,0.06);
        border: 1px solid var(--db-stroke);
        border-radius: 999px;
        padding: 2px;
        overflow: hidden;
        box-shadow: inset 0 1px 0 rgba(255,255,255,0.03);
      }
      .db-bar-fill {
        width: 0%; height: 100%;
        border-radius: 999px;
        background: linear-gradient(90deg, var(--db-blue), #7bc4ff);
        box-shadow: 0 0 14px var(--db-blue-glow);
        transition: width .35s ease, background .35s ease, box-shadow .35s ease, transform .35s ease;
        transform: translateZ(0);
      }
      .db-bar-fill.complete {
        background: linear-gradient(90deg, var(--db-green), #7de3a7);
        box-shadow: 0 0 14px var(--db-green-glow);
      }
      .db-bar-fill.error {
        background: linear-gradient(90deg, var(--db-red), #ff8a8a);
        box-shadow: 0 0 14px var(--db-red-glow);
      }

      .db-log {
        margin-top: 14px; height: 160px; overflow: auto;
        border: 1px solid var(--db-stroke);
        background: rgba(0,0,0,0.25);
        border-radius: 12px;
        padding: 10px;
        font-size: 12.5px;
        line-height: 1.55;
        scrollbar-width: thin;
      }
      .db-log p { margin: 0; padding: 2px 0; white-space: pre-wrap; display: flex; gap: 8px; }
      .log-timestamp { color: #6f7682; flex-shrink: 0; }
      .log-info { color: #9acbff; }
      .log-success { color: #8ff2b3; }
      .log-warn { color: #ffd46b; }
      .log-error { color: #ff8484; font-weight: 600; }

      .db-btn {
        appearance: none; border: 0; cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center;
        gap: 8px; padding: 10px 16px; border-radius: 12px;
        font-weight: 600; letter-spacing: .2px; transition: transform .08s ease, box-shadow .2s ease, background .2s ease;
        will-change: transform;
      }
      .db-btn:active { transform: translateY(1px); }

      .db-btn-primary[disabled], .db-btn-primary[aria-disabled="true"] { opacity: .55; cursor: not-allowed; }
      .db-btn-primary {
        color: #0b1220;
        background: linear-gradient(180deg, #8ec9ff, #5bb2ff);
        box-shadow: 0 8px 24px rgba(66,165,255,0.32), inset 0 1px 0 rgba(255,255,255,0.5);
        border: 1px solid rgba(255,255,255,0.4);
      }
      .db-btn-primary:hover { box-shadow: 0 8px 32px rgba(66,165,255,0.45), inset 0 1px 0 rgba(255,255,255,0.6); }

      .db-btn-ghost {
        color: var(--db-text);
        background: rgba(255,255,255,0.06);
        border: 1px solid var(--db-stroke);
      }
      .db-btn-ghost:hover { background: rgba(255,255,255,0.09); }

      .btn-pressed { filter: brightness(.96); }
    `;
    const style = document.createElement('style');
    style.type = 'text/css';
    style.textContent = css;
    document.head.appendChild(style);
  }
}

const loadingManager = new LoadingManager();
export default loadingManager;