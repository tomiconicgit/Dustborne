// File: src/ui/Loader.js

export default class Loader {
    constructor() {
        this._createStyles();
        this._createDOM();

        this.loadingScreen = document.getElementById('dustborne-loading-screen');
        this.progressBar = document.getElementById('dustborne-loading-bar');
        this.statusElement = document.getElementById('dustborne-loading-status');
        this.logContainer = document.getElementById('dustborne-log-container');
        
        this.statusElement.textContent = 'Initializing...';
    }

    /**
     * Injects all necessary CSS for the loading screen into the document's head.
     * @private
     */
    _createStyles() {
        const styles = `
            @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Roboto+Mono&display=swap');

            #dustborne-loading-screen {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: #0a0a0a;
                color: #ddd;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-direction: column;
                z-index: 999; /* Changed: Lowered z-index to be below debugger */
                font-family: 'Roboto Mono', monospace;
                transition: opacity 1s ease-out, visibility 1s;
                transition-delay: 0.5s;
                visibility: visible;
                opacity: 1;
            }

            #dustborne-loading-screen.fade-out {
                opacity: 0;
                visibility: hidden;
                pointer-events: none;
            }

            #dustborne-loading-screen::before {
                content: '';
                position: absolute;
                top: 0; left: 0;
                width: 100%; height: 100%;
                background-image:
                    radial-gradient(circle at 15% 50%, rgba(200, 150, 100, 0.1) 0%, transparent 40%),
                    radial-gradient(circle at 85% 30%, rgba(200, 150, 100, 0.08) 0%, transparent 30%);
                animation: slowPulse 15s ease-in-out infinite;
            }
            
            @keyframes slowPulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.1); opacity: 0.8; }
            }

            .dustborne-logo {
                font-family: 'Cinzel', serif;
                font-size: clamp(2.5em, 12vw, 6em);
                margin: 0 20px 40px 20px;
                text-align: center;
                color: #fff;
                z-index: 3;
                background: linear-gradient(180deg, #d3d3d3 0%, #888 25%, #444 50%, #888 75%, #d3d3d3 100%);
                -webkit-background-clip: text;
                background-clip: text;
                -webkit-text-fill-color: transparent;
                text-fill-color: transparent;
                letter-spacing: 3px;
                text-shadow: 1px 1px 0px #111, 2px 2px 0px #111, 3px 3px 1px #222, -1px -1px 2px rgba(255, 255, 255, 0.1);
            }
            
            .dustborne-loader-container {
                width: 90%;
                max-width: 600px;
                z-index: 3;
                padding: 15px;
                background: rgba(20, 20, 20, 0.5);
                border-radius: 4px;
                border: 1px solid #282828;
                box-shadow: 0 0 30px rgba(0,0,0,0.5);
            }

            #dustborne-status-container {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 8px;
                font-size: 0.9em;
                color: #a0a0a0;
            }

            #dustborne-loading-bar-container {
                width: 100%;
                height: 4px;
                background-color: #222;
                border-radius: 2px;
                overflow: hidden;
            }

            #dustborne-loading-bar {
                width: 0%;
                height: 100%;
                background: linear-gradient(90deg, #c0a080, #e0c0a0);
                box-shadow: 0 0 8px #d0b090, 0 0 12px #d0b090;
                transition: width 0.4s ease-out, background-color 0.5s;
                border-radius: 2px;
            }

            #dustborne-loading-bar.error {
                background: #b04040;
                box-shadow: 0 0 8px #f55, 0 0 12px #f55;
            }
            
            #dustborne-log-container {
                margin-top: 15px;
                height: 100px;
                overflow-y: auto;
                background: rgba(0,0,0,0.3);
                border: 1px solid #282828;
                border-radius: 4px;
                padding: 10px;
                text-align: left;
                font-size: 0.8em;
                color: #ccc;
                scrollbar-width: thin;
                scrollbar-color: #444 #222;
            }
            #dustborne-log-container p { margin: 0 0 5px 0; white-space: pre-wrap; color: #87ceeb; }
            #dustborne-log-container p.error { color: #ff6b6b; font-weight: bold; }
        `;
        const styleSheet = document.createElement("style");
        styleSheet.type = "text/css";
        styleSheet.innerText = styles;
        document.head.appendChild(styleSheet);
    }

    /**
     * Creates and appends the loading screen DOM elements to the body.
     * @private
     */
    _createDOM() {
        const container = document.createElement('div');
        container.id = 'dustborne-loading-screen';
        container.innerHTML = `
            <div>
                <h1 class="dustborne-logo">Dustborne</h1>
                <div class="dustborne-loader-container">
                    <div id="dustborne-status-container">
                        <span id="dustborne-loading-status"></span>
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

    updateStatus(message, progress) {
        if (!this.loadingScreen) return;

        // Update main status text and percentage
        this.statusElement.textContent = message;
        document.getElementById('dustborne-loading-percentage').textContent = `${Math.round(progress)}%`;

        // Add a new line to the log
        const logLine = document.createElement('p');
        logLine.textContent = `> ${message}`;
        this.logContainer.appendChild(logLine);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        // Update progress bar
        this.progressBar.style.width = `${progress}%`;
    }

    fail(error) {
        if (!this.loadingScreen) return;
        
        const errorMessage = error.message || 'An unknown error occurred.';
        this.statusElement.textContent = 'Fatal Error';
        document.getElementById('dustborne-loading-percentage').textContent = 'FAIL';

        // Log the detailed error message
        const errorLine = document.createElement('p');
        errorLine.className = 'error';
        errorLine.textContent = `❌ ERROR: ${errorMessage}\n${error.stack || ''}`;
        this.logContainer.appendChild(errorLine);
        this.logContainer.scrollTop = this.logContainer.scrollHeight;

        // Update progress bar to reflect failure
        this.progressBar.classList.add('error');
        this.progressBar.style.width = '100%';
        
        // Log to the real console as well
        console.error("Game initialization failed:", error);
    }

    finish() {
        if (!this.loadingScreen) return;

        this.updateStatus('Initialization complete!', 100);
        setTimeout(() => {
            this.loadingScreen.classList.add('fade-out');
            // After the fade-out transition, remove the element completely
            this.loadingScreen.addEventListener('transitionend', () => {
                this.loadingScreen.remove();
            });
        }, 500);
    }
}
