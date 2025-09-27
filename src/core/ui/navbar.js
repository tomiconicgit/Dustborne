// file: src/core/ui/navbar.js
// Floating top navigation bar for mobile (Inventory, Skills, Missions, Map)

export default class Navbar {
  /**
   * @param {object} opts
   * @param {HTMLElement} [opts.parent=document.body] - Where to append the navbar
   * @param {object} [opts.hooks] - Optional callbacks
   * @param {Function} [opts.hooks.onInventory] - Called when Inventory is tapped
   * @param {Function} [opts.hooks.onSkills]
   * @param {Function} [opts.hooks.onMissions]
   * @param {Function} [opts.hooks.onMap]
   */
  constructor({ parent = document.body, hooks = {} } = {}) {
    this.parent = parent;
    this.hooks = hooks;
    this._injectStyles();
    this._build();
    this._bind();
    this._updateNavHeightVar();
    this._resizeHandler = () => this._updateNavHeightVar();
    window.addEventListener('resize', this._resizeHandler, { passive: true });
    window.addEventListener('orientationchange', this._resizeHandler, { passive: true });
  }

  get element() { return this.el; }

  dispose() {
    window.removeEventListener('resize', this._resizeHandler);
    window.removeEventListener('orientationchange', this._resizeHandler);
    this.el?.remove();
  }

  setActive(key) {
    const map = {
      inventory: this.btnInventory,
      skills: this.btnSkills,
      missions: this.btnMissions,
      map: this.btnMap,
    };
    Object.values(map).forEach(b => b?.classList.remove('dbui-nav-btn--active'));
    if (map[key]) map[key].classList.add('dbui-nav-btn--active');
  }

  _updateNavHeightVar() {
    const h = this.el.getBoundingClientRect().height;
    document.documentElement.style.setProperty('--dbui-nav-h', `${Math.ceil(h)}px`);
  }

  _build() {
    const wrap = document.createElement('nav');
    wrap.id = 'db-ui-navbar';
    wrap.className = 'dbui-nav';
    wrap.setAttribute('role', 'navigation');
    wrap.setAttribute('aria-label', 'Game');

    wrap.innerHTML = `
      <button class="dbui-nav-btn" id="dbui-nav-inventory" aria-label="Inventory">
        ${svg.inventory}
        <span>Inventory</span>
      </button>
      <button class="dbui-nav-btn" id="dbui-nav-skills" aria-label="Skills">
        ${svg.skills}
        <span>Skills</span>
      </button>
      <button class="dbui-nav-btn" id="dbui-nav-missions" aria-label="Missions">
        ${svg.missions}
        <span>Missions</span>
      </button>
      <button class="dbui-nav-btn" id="dbui-nav-map" aria-label="Map">
        ${svg.map}
        <span>Map</span>
      </button>
    `;

    this.parent.appendChild(wrap);
    this.el = wrap;

    this.btnInventory = wrap.querySelector('#dbui-nav-inventory');
    this.btnSkills    = wrap.querySelector('#dbui-nav-skills');
    this.btnMissions  = wrap.querySelector('#dbui-nav-missions');
    this.btnMap       = wrap.querySelector('#dbui-nav-map');
  }

  _bind() {
    const tapOpts = { passive: true };
    this.btnInventory.addEventListener('click', () => this.hooks.onInventory?.(), tapOpts);
    this.btnSkills.addEventListener('click',    () => this.hooks.onSkills?.(), tapOpts);
    this.btnMissions.addEventListener('click',  () => this.hooks.onMissions?.(), tapOpts);
    this.btnMap.addEventListener('click',       () => this.hooks.onMap?.(), tapOpts);
  }

  _injectStyles() {
    if (document.getElementById('dbui-navbar-styles')) return;
    const css = `
      :root{
        --dbui-bg: rgba(20,18,15,0.75);
        --dbui-stroke: rgba(245,238,218,0.12);
        --dbui-text: #f5eeda;
        --dbui-subtle:#c3b8a5;
        --dbui-active:#ffd46b;
        --dbui-shadow: 0 12px 30px rgba(0,0,0,.45);
      }

      .dbui-nav{
        position: fixed;
        top: calc(env(safe-area-inset-top) + 10px);
        left: 50%;
        transform: translateX(-50%);
        width: min(94vw, 720px);
        height: 52px;                 /* slightly shorter */
        padding: 4px;                 /* slightly tighter */
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
        align-items: center;
        background: var(--dbui-bg);
        backdrop-filter: blur(14px) saturate(1.2);
        -webkit-backdrop-filter: blur(14px) saturate(1.2);
        border: 1px solid var(--dbui-stroke);
        border-radius: 14px;
        box-shadow: var(--dbui-shadow);
        z-index: 12000;
        -webkit-tap-highlight-color: transparent;
      }

      .dbui-nav-btn{
        appearance: none;
        margin: 0;
        padding: 4px 4px;
        height: 40px;                 /* shorter buttons */
        border: 0;
        border-radius: 10px;
        background: transparent;
        color: var(--dbui-text);
        display: grid;
        grid-template-columns: 22px auto;
        justify-content: center;
        align-items: center;
        column-gap: 8px;
        font: 600 12px/1 Inter, system-ui, sans-serif;
        letter-spacing: .2px;
      }
      .dbui-nav-btn svg{
        width: 22px; height: 22px; display: block;
        opacity: .92;
      }
      .dbui-nav-btn span{
        white-space: nowrap;
        opacity: .92;
      }
      .dbui-nav-btn:active{ transform: translateY(1px); }
      .dbui-nav-btn:hover{ background: rgba(255,255,255,.06); }

      .dbui-nav-btn--active{
        background: rgba(255,255,255,.10);
        outline: 1px solid rgba(255,255,255,.12);
        box-shadow: inset 0 0 0 1px rgba(0,0,0,.15);
      }

      .dbui-nav-btn svg path{ fill: var(--dbui-subtle); }
      .dbui-nav-btn--active svg path{ fill: var(--dbui-active); }
    `;
    const style = document.createElement('style');
    style.id = 'dbui-navbar-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }
}

const svg = {
  inventory: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 7h10a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-7a3 3 0 0 1 3-3Zm1-4h8a1 1 0 0 1 1 1v2H7V4a1 1 0 0 1 1-1Zm3 9h2a1 1 0 0 1 0 2h-2a1 1 0 1 1 0-2Z"/>
    </svg>
  `,
  skills: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2 9.8 8.2 3 9l5 3.9L6.6 20 12 16.7 17.4 20 16 12.9 21 9l-6.8-.8L12 2Z"/>
    </svg>
  `,
  missions: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M6 3h12a2 2 0 0 1 2 2v14l-4-3H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Zm3 5h6a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2Zm0 4h4a1 1 0 1 1 0 2H9a1 1 0 1 1 0-2Z"/>
    </svg>
  `,
  map: `
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M9 3 3 5.5v15L9 18l6 2.5 6-2.5v-15L15 5.5 9 3Zm6 3.7 4-1.6v11.2l-4 1.6V6.7ZM5 7.1l4-1.6v11.2l-4 1.6V7.1Z"/>
    </svg>
  `
};