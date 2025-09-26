// File: src/ui/Debugger.js

export default class Debugger {
    constructor() {
        this.logHistory = [];
        this.isVisible = true;

        this._createDOM();
        this._attachEventListeners();
        
        // The current target for log messages. Defaults to its own log element.
        this.outputTarget = this.logElement; 

        this.overrideConsole();
        this.catchGlobalErrors();
        
        // Don't log the initial message here, as it might appear before piping
    }

    // --- NEW: Methods for controlling the debugger's UI and output ---

    /** Hides the main debugger panel. */
    hide() {
        this.container.style.display = 'none';
    }

    /** Shows the main debugger panel. */
    show() {
        this.container.style.display = 'flex';
    }

    /**
     * Redirects all new log messages to a different DOM element.
     * @param {HTMLElement} element The element to append log messages to.
     */
    pipeTo(element) {
        if (element && element instanceof HTMLElement) {
            this.outputTarget = element;
            this.log('[Debugger] Output piped to loader.');
        }
    }

    /** Restores log output to the default debugger panel. */
    unpipe() {
        this.log('[Debugger] Output unpiped.');
        this.outputTarget = this.logElement;
    }

    // --- Core Methods (Modified) ---

    _createDOM() {
        // ... (DOM creation code is unchanged)
        // Main container
        this.container = document.createElement('div');
        Object.assign(this.container.style, {
            position: 'fixed', bottom: '0', left: '0',
            width: '100%', maxHeight: '40vh', zIndex: '99999',
            display: 'flex', flexDirection: 'column',
            fontFamily: '"Roboto Mono", monospace', fontSize: '13px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            borderTop: '1px solid #444',
            backdropFilter: 'blur(5px)',
            transition: 'transform 0.3s ease-in-out',
            transform: 'translateY(0)',
            pointerEvents: 'auto',
        });
        
        // Toolbar for buttons
        this.toolbar = document.createElement('div');
        Object.assign(this.toolbar.style, { display: 'flex', flexShrink: '0', backgroundColor: '#222' });

        // Log area (this is the default, but not always the target)
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

    /** Modified to append messages to the current outputTarget */
    _addMessage(message, color) {
        const timestamp = new Date().toLocaleTimeString();
        const formattedMessage = `[${timestamp}] ${message}`;
        this.logHistory.push(formattedMessage);
        
        // Create a styled paragraph for better compatibility with different containers
        const p = document.createElement('p');
        p.style.color = color;
        p.style.margin = '0 0 5px 0';
        p.style.whiteSpace = 'pre-wrap';
        p.textContent = formattedMessage;

        // Use the current output target
        if (this.outputTarget) {
            this.outputTarget.appendChild(p);
            this.outputTarget.scrollTop = this.outputTarget.scrollHeight;
        }
    }
    
    // --- Unchanged Methods ---
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
    
    _attachEventListeners() { /* ... unchanged ... */ }
    toggle() { /* ... unchanged ... */ }
    log(message) { this._addMessage(`> ${message}`, '#87ceeb'); } // Adjusted style for loader
    warn(message) { this._addMessage(`[WARN] ${message}`, '#ffff00'); }
    error(message) { this._addMessage(`[ERROR] ${message}`, '#ff6b6b'); } // Adjusted style for loader
    overrideConsole() { /* ... unchanged ... */ }
    catchGlobalErrors() { /* ... unchanged ... */ }
}

