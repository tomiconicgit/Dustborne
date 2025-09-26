// File: src/ui/Debugger.js

export default class Debugger {
    constructor() {
        this.logHistory = [];           // flat text (for copy)
        this._entries = [];             // structured entries for replay
        this.isVisible = true;
        this.externalLogContainer = null;

        this._createDOM();
        this._attachEventListeners();

        this.overrideConsole();
        this.catchGlobalErrors();

        this.log('[Debugger] Attached. Press ` (backtick) to toggle visibility.');
    }

    /**
     * Creates and injects the debugger's HTML and CSS.
     * @private
     */
    _createDOM() {
        // Main container (overlay)
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'fixed', bottom: '0', left: '0',
            width: '100%', maxHeight: '40vh', zIndex: '9999', // stays under loader (loader is 10000)
            display: 'flex', flexDirection: 'column',
            fontFamily: '"Roboto Mono", monospace', fontSize: '13px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderTop: '1px solid #444',
            backdropFilter: 'blur(5px)',
            transition: 'transform 0.3s ease-in-out',
            transform: 'translateY(0)',
            pointerEvents: 'auto'
        });

        // Toolbar
        this.toolbar = document.createElement('div');
        Object.assign(this.toolbar.style, {
            display: 'flex', flexShrink: '0',
            backgroundColor: '#222',
        });

        // Log area
        this.logElement = document.createElement('pre');
        Object.assign(this.logElement.style, {
            overflowY: 'auto', padding: '8px', margin: '0',
            flexGrow: '1', whiteSpace: 'pre-wrap',
            wordBreak: 'break-all', color: '#0f0',
            scrollbarWidth: 'thin', scrollbarColor: '#555 #333',
        });

        // Buttons
        this.copyButton = this._createButton('Copy');
        this.clearButton = this._createButton('Clear');
        this.toggleButton = this._createButton('Hide');

        // Assemble
        this.toolbar.appendChild(this.copyButton);
        this.toolbar.appendChild(this.clearButton);
        this.toolbar.appendChild(this.toggleButton);
        this.container.appendChild(this.toolbar);
        this.container.appendChild(this.logElement);
        document.body.appendChild(this.container);
    }

    /**
     * Helper to create styled buttons for the toolbar.
     * @param {string} text - The button text.
     * @returns {HTMLButtonElement}
     * @private
     */
    _createButton(text) {
        const button = document.createElement('button');
        button.innerText = text;
        Object.assign(button.style, {
            padding: '6px 12px', backgroundColor: 'transparent',
            color: '#ccc', border: 'none', cursor: 'pointer',
            borderRight: '1px solid #444',
            fontFamily: 'inherit', fontSize: '12px'
        });
        button.onmouseover = () => button.style.backgroundColor = '#444';
        button.onmouseout = () => button.style.backgroundColor = 'transparent';
        return button;
    }

    /**
     * Attach buttons + keyboard.
     * @private
     */
    _attachEventListeners() {
        this.copyButton.onclick = () => {
            navigator.clipboard.writeText(this.logHistory.join('\n'))
                .then(() => this.log('[Debugger] Log copied to clipboard!'))
                .catch(err => this.error(`[Debugger] Failed to copy: ${err}`));
        };

        this.clearButton.onclick = () => {
            this.logElement.innerHTML = '';
            this.logHistory = [];
            this._entries = [];
            if (this.externalLogContainer) {
                this.externalLogContainer.innerHTML = '';
            }
            this.log('[Debugger] Log cleared.');
        };

        this.toggleButton.onclick = () => this.toggle();

        window.addEventListener('keydown', (e) => {
            if (e.key === '`') this.toggle();
        });
    }

    /**
     * Public: called by Loader to mirror logs into its box.
     * @param {HTMLElement} el
     */
    attachExternalLog(el) {
        this.externalLogContainer = el || null;
        if (!this.externalLogContainer) return;
        // Flush any earlier entries so nothing is missed
        for (const entry of this._entries) this._mirrorToExternal(entry);
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.transform = this.isVisible ? 'translateY(0)' : 'translateY(100%)';
        this.toggleButton.innerText = this.isVisible ? 'Hide' : 'Show';
    }

    log(message)  { this._addMessage(message, 'log',  '#00ff00'); }
    warn(message) { this._addMessage(`[WARN] ${message}`, 'warn', '#ffff00'); }
    error(message){ this._addMessage(`[ERROR] ${message}`, 'error','#ff4444'); }

    _addMessage(message, level, color) {
        const timestamp = new Date().toLocaleTimeString();
        const formattedMessage = `[${timestamp}] ${message}`;

        // Keep simple text history for Copy
        this.logHistory.push(formattedMessage);

        // Keep structured entry for mirroring
        const entry = { timestamp, message: formattedMessage, level };
        this._entries.push(entry);

        // Render in overlay
        const span = document.createElement('span');
        span.style.color = color;
        span.textContent = formattedMessage + '\n';
        this.logElement.appendChild(span);
        this.logElement.scrollTop = this.logElement.scrollHeight;

        // Mirror into loader's box if available
        this._mirrorToExternal(entry);
    }

    _mirrorToExternal(entry) {
        if (!this.externalLogContainer) return;
        const p = document.createElement('p');
        if (entry.level === 'error') p.className = 'error';
        // Loader’s log style uses a leading "> "
        p.textContent = `> ${entry.message}`;
        this.externalLogContainer.appendChild(p);
        this.externalLogContainer.scrollTop = this.externalLogContainer.scrollHeight;
    }

    overrideConsole() {
        const oldLog = console.log.bind(console);
        const oldWarn = console.warn.bind(console);
        const oldError = console.error.bind(console);

        const formatArg = (arg) => {
            if (arg instanceof Error) return arg.stack || arg.message;
            if (typeof arg === 'object' && arg !== null) {
                try { return JSON.stringify(arg, null, 2); }
                catch { return '[Unserializable Object]'; }
            }
            return String(arg);
        };

        console.log = (...args)  => { oldLog(...args);  this.log(args.map(formatArg).join(' ')); };
        console.warn = (...args) => { oldWarn(...args); this.warn(args.map(formatArg).join(' ')); };
        console.error = (...args)=> { oldError(...args); this.error(args.map(formatArg).join(' ')); };
    }

    catchGlobalErrors() {
        window.onerror = (message, source, lineno, colno) => {
            this.error(`UNCAUGHT ERROR: ${message}\nSource: ${source}:${lineno}:${colno}`);
            return true;
        };

        window.addEventListener('unhandledrejection', (event) => {
            const reason = event.reason instanceof Error
                ? (event.reason.stack || event.reason.message)
                : String(event.reason);
            this.error(`UNHANDLED PROMISE REJECTION: ${reason}`);
        });
    }
}