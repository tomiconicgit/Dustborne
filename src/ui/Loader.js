// File: src/ui/Loader.js

export default class Loader {
  constructor() {
    this._createStyles();
    this._createDOM();

    this.loadingScreen = document.getElementById('dustborne-loading-screen');
    this.progressBar   = document.getElementById('dustborne-loading-bar');
    this.statusElement = document.getElementById('dustborne-loading-status');
    this.logContainer  = document.getElementById('dustborne-log-container');
    this.percentEl     = document.getElementById('dustborne-loading-percentage');

    this.statusElement.textContent = 'Initializing...';
    this.percentEl.textContent = '0%';

    // IMPORTANT: mirror all debugger output into this box
    if (window.debugger && typeof window.debugger.attachExternalLog === 'function') {
      window.debugger.attachExternalLog(this.logContainer);
    }
  }

  _createStyles() {
    const styles = `
      @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700&family=Roboto+Mono&display=swap');

      #dustborne-loading-screen {
        position: fixed; inset: 0;
        background: #0a0a0a; color: #ddd;
        display: flex; align-items: center; justify-content: center; flex-direction: column;
        z-index: 10000; /* above any overlay debugger */
        font-family: 'Roboto Mono', monospace;
        transition: opacity 1s ease-out, visibility 1s; transition-delay: 0.5s;
        visibility: visible; opacity: 1;
      }
      #dustborne-loading-screen.fade-out { opacity: 0; visibility: hidden; pointer-events: none; }

      #dustborne-loading-screen::before {
        content: ''; position: absolute; inset: 0;
        background-image:
          radial-gradient(circle at 15% 50%, rgba(200,150,100,0.1) 0%, transparent 40%),
          radial-gradient(circle at 85% 30%, rgba(200,150,100,0.08) 0%, transparent 30%);
        animation: slowPulse 15s ease-in-out infinite;
      }
      @keyframes slowPulse { 0%,100%{transform:scale(1);opacity:1} 50%{transform:scale(1.1);opacity:.8} }

      .dustborne-logo {
        font-family: 'Cinzel', serif; font-size: clamp(2.5em, 12vw, 6em);
        margin: 0 20px 40px; text-align: center; color: #fff; z-index: 3;
        background: linear-gradient(180deg, #d3d3d3 0%, #888 25%, #444 50%, #888 75%, #d3d3d3 100%);
        -webkit-background-clip: text; background-clip: text;
        -webkit-text-fill-color: transparent; text-fill-color: transparent;
        letter-spacing: 3px;
        text-shadow: 1px 1px 0 #111, 2px 2px 0 #111, 3px 3px 1px #222, -1px -1px 2px rgba(255,255,255,.1);
      }

      .dustborne-loader-container {
        width: 90%; max-width: 600px; z-index: 3; padding: 15px;
        background: rgba(20,20,20,0.5);
        border-radius: 4px; border: 1px solid #282828;
        box-shadow: 0 0 30px rgba(0,0,0,0.5);
      }

      #dustborne-status-container {
        display: flex; justify-content: space-between; align-items: center;
        margin-bottom: 8px; font-size: .9em; color: #a0a0a0;
      }

      #dustborne-loading-bar-container { width: 100%; height: 4px; background: #222; border-radius: 2px; overflow: hidden; }
      #dustborne-loading-bar {
        width: 0%; height: 100%;
        background: linear-gradient(90deg, #c0a080, #e0c0a0);
        box-shadow: 0 0 8px #d0b090, 0 0 12px #d0b090;
        transition: width .4s ease-out, background-color .5s; border-radius: 2px;
      }
      #dustborne-loading-bar.error { background:#b04040; box-shadow:0 0 8px #f55,0 0 12px #f55; }

      #dustborne-log-container {
        margin-top: 15px; height: 100px; overflow-y: auto;
        background: rgba(0,0,0,0.3);
        border: 1px solid #282828; border-radius: 4px;
        padding: 10px; text-align: left; font-size: .8em; color: #ccc;
        scrollbar-width: thin; scrollbar-color: #444 #222;
      }
      #dustborne-log-container p { margin: 0 0 5px 0; white-space: pre-wrap; color: #87ceeb; }
      #dustborne-log-container p.error { color: #ff6b6b; font-weight: bold; }
    `;
    const style = document.createElement('style');
    style.type = 'text/css';
    style.innerText = styles;
    document.head.appendChild(style);
  }

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
    this.statusElement.textContent = message;
    this.percentEl.textContent = `${Math.round(progress)}%`;

    const p = document.createElement('p');
    p.textContent = `> ${message}`;
    this.logContainer.appendChild(p);
    this.logContainer.scrollTop = this.logContainer.scrollHeight;

    this.progressBar.style.width = `${progress}%`;
  }

  fail(error) {
    if (!this.loadingScreen) return;
    const msg = error?.message || 'An unknown error occurred.';
    this.statusElement.textContent = 'Fatal Error';
    this.percentEl.textContent = 'FAIL';

    const p = document.createElement('p');
    p.className = 'error';
    p.textContent = `✖ ERROR: ${msg}\n${error?.stack || ''}`;
    this.logContainer.appendChild(p);
    this.logContainer.scrollTop = this.logContainer.scrollHeight;

    this.progressBar.classList.add('error');
    this.progressBar.style.width = '100%';

    console.error("Game initialization failed:", error); // still mirrored into loader
  }

  finish() {
    if (!this.loadingScreen) return;
    this.updateStatus('Initialization complete!', 100);
    setTimeout(() => {
      this.loadingScreen.classList.add('fade-out');
      this.loadingScreen.addEventListener('transitionend', () => {
        this.loadingScreen.remove();
      }, { once: true });
    }, 500);
  }
}