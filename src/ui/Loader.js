// File: src/ui/Loader.js

export default class Loader {
    constructor() {
        this._createStyles();
        this._createDOM();

        // Make the log container accessible to other modules
        this.logContainer = document.getElementById('dustborne-log-container');
        
        // Other DOM element references
        this.loadingScreen = document.getElementById('dustborne-loading-screen');
        this.progressBar = document.getElementById('dustborne-loading-bar');
        this.statusElement = document.getElementById('dustborne-loading-status');
    }

    updateStatus(message, progress) {
        if (!this.loadingScreen) return;
        this.statusElement.textContent = message;
        document.getElementById('dustborne-loading-percentage').textContent = `${Math.round(progress)}%`;
        this.progressBar.style.width = `${progress}%`;

        // The loader still logs its own main status updates to its container
        const logLine = document.createElement('p');
        logLine.style.color = '#a0e0ff'; // A different color for loader status
        logLine.textContent = `> ${message}`;
        this.logContainer.appendChild(logLine);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;
    }

    fail(error) {
        if (!this.loadingScreen) return;

        // --- NEW: Unpipe and show the debugger on failure ---
        if (window.debugger) {
            window.debugger.unpipe();
            window.debugger.show();
        }
        
        const errorMessage = error.message || 'An unknown error occurred.';
        this.statusElement.textContent = 'Fatal Error';
        document.getElementById('dustborne-loading-percentage').textContent = 'FAIL';

        // Log the error using the debugger itself for consistent formatting
        console.error(`Game initialization failed: ${errorMessage}\n${error.stack || ''}`);

        this.progressBar.classList.add('error');
        this.progressBar.style.width = '100%';
    }

    finish() {
        if (!this.loadingScreen) return;
        this.updateStatus('Initialization complete!', 100);

        // --- NEW: Unpipe and show the debugger before fading out ---
        if (window.debugger) {
            window.debugger.unpipe();
            window.debugger.show();
        }

        setTimeout(() => {
            this.loadingScreen.classList.add('fade-out');
            this.loadingScreen.addEventListener('transitionend', () => {
                this.loadingScreen.remove();
            });
        }, 750); // Slightly longer delay to read the final message
    }

    // --- Unchanged Methods ---
    _createStyles() { /* ... unchanged ... */ }
    _createDOM() {
        const container = document.createElement('div');
        container.id = 'dustborne-loading-screen';
        container.innerHTML = `
            <div>
                <h1 class="dustborne-logo">Dustborne</h1>
                <div class="dustborne-loader-container">
                    <div id="dustborne-status-container">
                        <span id="dustborne-loading-status">Initializing...</span>
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
}
