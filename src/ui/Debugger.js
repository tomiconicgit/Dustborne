// File: src/ui/Debugger.js

export default class Debugger {
    constructor() {
        this.logHistory = [];
        this.isVisible = true;

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
        // Main container
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'fixed', bottom: '0', left: '0',
            width: '100%', maxHeight: '40vh', zIndex: '9999',
            display: 'flex', flexDirection: 'column',
            fontFamily: '"Roboto Mono", monospace', fontSize: '13px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderTop: '1px solid #444',
            backdropFilter: 'blur(5px)',
            transition: 'transform 0.3s ease-in-out',
            transform: 'translateY(0)',
        });
        
        // Toolbar for buttons
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
     * Attaches event listeners for buttons and keyboard shortcuts.
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
            this.log('[Debugger] Log cleared.');
        };
        
        this.toggleButton.onclick = () => this.toggle();

        window.addEventListener('keydown', (e) => {
            if (e.key === '`') {
                this.toggle();
            }
        });
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.container.style.transform = this.isVisible ? 'translateY(0)' : 'translateY(100%)';
        this.toggleButton.innerText = this.isVisible ? 'Hide' : 'Show';
    }

    log(message) { this._addMessage(message, '#00ff00'); }
    warn(message) { this._addMessage(`[WARN] ${message}`, '#ffff00'); }
    error(message) { this._addMessage(`[ERROR] ${message}`, '#ff4444'); }

    _addMessage(message, color) {
        const timestamp = new Date().toLocaleTimeString();
        const formattedMessage = `[${timestamp}] ${message}`;
        this.logHistory.push(formattedMessage);
        
        const span = document.createElement('span');
        span.style.color = color;
        span.textContent = formattedMessage + '\n';

        this.logElement.appendChild(span);
        this.logElement.scrollTop = this.logElement.scrollHeight;
    }

    overrideConsole() {
        const oldLog = console.log;
        const oldWarn = console.warn;
        const oldError = console.error;

        const formatArg = (arg) => {
            if (arg instanceof Error) return arg.stack || arg.message;
            if (typeof arg === 'object' && arg !== null) {
                try { return JSON.stringify(arg, null, 2); } 
                catch (e) { return '[Unserializable Object]'; }
            }
            return String(arg);
        };

        console.log = (...args) => { oldLog.apply(console, args); this.log(args.map(formatArg).join(' ')); };
        console.warn = (...args) => { oldWarn.apply(console, args); this.warn(args.map(formatArg).join(' ')); };
        console.error = (...args) => { oldError.apply(console, args); this.error(args.map(formatArg).join(' ')); };
    }

    catchGlobalErrors() {
        window.onerror = (message, source, lineno, colno, error) => {
            this.error(`UNCAUGHT ERROR: ${message}\nSource: ${source}:${lineno}:${colno}`);
            return true;
        };
        
        window.addEventListener('unhandledrejection', event => {
            const reason = event.reason instanceof Error ? (event.reason.stack || event.reason.message) : String(event.reason);
            this.error(`UNHANDLED PROMISE REJECTION: ${reason}`);
        });
    }
}
