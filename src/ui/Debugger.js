// File: src/ui/Debugger.js

export default class Debugger {
  constructor(opts = {}) {
    // --- mode: headless by default on touch/mobile (iOS) ---
    this._isTouch = (('ontouchstart' in window) || navigator.maxTouchPoints > 0);
    this.headless = (opts.headless !== undefined) ? !!opts.headless : this._isTouch;

    // state
    this.logHistory = [];   // plain text for "Copy"
    this._entries = [];     // {timestamp, message, level} for replay/mirroring
    this.externalLogContainer = null;

    // overlay bits (not created in headless)
    this.overlayMounted = false;
    this.container = null;
    this.toolbar = null;
    this.logElement = null;
    this.copyButton = null;
    this.clearButton = null;
    this.toggleButton = null;
    this.isVisible = !this.headless;

    if (!this.headless) this._mountOverlay(); // desktop by default

    this._overrideConsole();
    this._catchGlobalErrors();

    this.log(`[Debugger] Attached${this.headless ? ' (headless)' : ''}. Press \`\` (backtick) to toggle overlay.`);
  }

  // ---------------- overlay lifecycle ----------------
  _mountOverlay() {
    if (this.overlayMounted) return;

    // Container
    this.container = document.createElement('div');
    Object.assign(this.container.style, {
      position: 'fixed', bottom: '0', left: '0',
      width: '100%', maxHeight: '40vh', zIndex: '9999',
      display: 'flex', flexDirection: 'column',
      fontFamily: '"Roboto Mono", monospace', fontSize: '13px',
      backgroundColor: 'rgba(0,0,0,0.8)',
      borderTop: '1px solid #444',
      backdropFilter: 'blur(5px)',
      transition: 'transform 0.3s ease-in-out',
      transform: this.isVisible ? 'translateY(0)' : 'translateY(100%)',
      pointerEvents: 'auto'
    });

    // Toolbar
    this.toolbar = document.createElement('div');
    Object.assign(this.toolbar.style, { display: 'flex', flexShrink: '0', backgroundColor: '#222' });

    // Log area
    this.logElement = document.createElement('pre');
    Object.assign(this.logElement.style, {
      overflowY: 'auto', padding: '8px', margin: '0',
      flexGrow: '1', whiteSpace: 'pre-wrap',
      wordBreak: 'break-all', color: '#0f0',
      scrollbarWidth: 'thin', scrollbarColor: '#555 #333',
    });

    // Buttons
    this.copyButton = this._btn('Copy');
    this.clearButton = this._btn('Clear');
    this.toggleButton = this._btn(this.isVisible ? 'Hide' : 'Show');

    // Assemble
    this.toolbar.appendChild(this.copyButton);
    this.toolbar.appendChild(this.clearButton);
    this.toolbar.appendChild(this.toggleButton);
    this.container.appendChild(this.toolbar);
    this.container.appendChild(this.logElement);
    document.body.appendChild(this.container);

    // Listeners
    this.copyButton.onclick = () => {
      navigator.clipboard.writeText(this.logHistory.join('\n'))
        .then(() => this.log('[Debugger] Log copied to clipboard!'))
        .catch(err => this.error(`[Debugger] Failed to copy: ${err}`));
    };
    this.clearButton.onclick = () => {
      this.logHistory = [];
      this._entries = [];
      if (this.logElement) this.logElement.innerHTML = '';
      if (this.externalLogContainer) this.externalLogContainer.innerHTML = '';
      this.log('[Debugger] Log cleared.');
    };
    this.toggleButton.onclick = () => this.toggle();

    // Flush existing entries into overlay
    for (const e of this._entries) this._renderInOverlay(e);

    // Global shortcut
    this._bindToggleShortcut();

    this.overlayMounted = true;
  }

  _btn(text) {
    const b = document.createElement('button');
    b.innerText = text;
    Object.assign(b.style, {
      padding: '6px 12px', backgroundColor: 'transparent',
      color: '#ccc', border: 'none', cursor: 'pointer',
      borderRight: '1px solid #444',
      fontFamily: 'inherit', fontSize: '12px'
    });
    b.onmouseover = () => b.style.backgroundColor = '#444';
    b.onmouseout = () => b.style.backgroundColor = 'transparent';
    return b;
  }

  _bindToggleShortcut() {
    // Backtick to toggle overlay (desktop). On iPhone you usually won’t use this.
    window.addEventListener('keydown', (e) => {
      if (e.key === '`') this.toggle();
    });
  }

  // --------------- public API ----------------
  attachExternalLog(el) {
    this.externalLogContainer = el || null;
    if (!this.externalLogContainer) return;
    // flush backlog to loader box
    for (const entry of this._entries) this._mirrorToExternal(entry);
  }

  toggle() {
    if (!this.overlayMounted) {
      // first time user requests overlay — create it (even on mobile, *only if toggled*)
      this.headless = false;
      this.isVisible = true;
      this._mountOverlay();
      return;
    }
    this.isVisible = !this.isVisible;
    this.container.style.transform = this.isVisible ? 'translateY(0)' : 'translateY(100%)';
    if (this.toggleButton) this.toggleButton.innerText = this.isVisible ? 'Hide' : 'Show';
  }

  // --------------- logging core ----------------
  log(msg)  { this._add(msg, 'log',  '#00ff00'); }
  warn(msg) { this._add(`[WARN] ${msg}`, 'warn', '#ffff00'); }
  error(msg){ this._add(`[ERROR] ${msg}`, 'error','#ff4444'); }

  _add(message, level, color) {
    const timestamp = new Date().toLocaleTimeString();
    const formatted = `[${timestamp}] ${message}`;

    this.logHistory.push(formatted);
    const entry = { timestamp, message: formatted, level, color };
    this._entries.push(entry);

    // Render to overlay ONLY if it exists (not in headless)
    this._renderInOverlay(entry);

    // Always mirror to loader’s box if available
    this._mirrorToExternal(entry);
  }

  _renderInOverlay(entry) {
    if (!this.logElement) return; // headless/no overlay yet
    const span = document.createElement('span');
    span.style.color = entry.color || '#0f0';
    span.textContent = entry.message + '\n';
    this.logElement.appendChild(span);
    this.logElement.scrollTop = this.logElement.scrollHeight;
  }

  _mirrorToExternal(entry) {
    if (!this.externalLogContainer) return;
    const p = document.createElement('p');
    if (entry.level === 'error') p.className = 'error';
    p.textContent = `> ${entry.message}`;
    this.externalLogContainer.appendChild(p);
    this.externalLogContainer.scrollTop = this.externalLogContainer.scrollHeight;
  }

  // --------------- hooks ----------------
  _overrideConsole() {
    const oldLog = console.log.bind(console);
    const oldWarn = console.warn.bind(console);
    const oldError = console.error.bind(console);

    const fmt = (a) => {
      if (a instanceof Error) return a.stack || a.message;
      if (typeof a === 'object' && a !== null) { try { return JSON.stringify(a, null, 2); } catch { return '[Unserializable Object]'; } }
      return String(a);
    };

    console.log = (...args)  => { oldLog(...args);  this.log(args.map(fmt).join(' ')); };
    console.warn = (...args) => { oldWarn(...args); this.warn(args.map(fmt).join(' ')); };
    console.error = (...args)=> { oldError(...args); this.error(args.map(fmt).join(' ')); };
  }

  _catchGlobalErrors() {
    window.onerror = (message, source, lineno, colno) => {
      this.error(`UNCAUGHT ERROR: ${message}\nSource: ${source}:${lineno}:${colno}`);
      return true;
    };
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason instanceof Error ? (event.reason.stack || event.reason.message) : String(event.reason);
      this.error(`UNHANDLED PROMISE REJECTION: ${reason}`);
    });
  }
}