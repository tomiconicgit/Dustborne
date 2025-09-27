// file: src/core/ui/inventory.js
// Slide-down fixed panel under the navbar: simple background area,
// no slot containers (5 across x 4 down visual space, but *blank*).

export default class InventoryPanel {
  /**
   * No slots are rendered. This is just the panel surface.
   * It sizes to roughly 5x4 item area visually without covering much of the game.
   *
   * @param {object} opts
   * @param {HTMLElement} [opts.parent=document.body]
   */
  constructor({ parent = document.body } = {}) {
    this.parent = parent;

    this._injectStyles();
    this._build();
    this._resizeHandler = () => this._syncWidthToNavbar();
    window.addEventListener('resize', this._resizeHandler, { passive: true });
    window.addEventListener('orientationchange', this._resizeHandler, { passive: true });
    queueMicrotask(() => this._syncWidthToNavbar());
  }

  get element() { return this.el; }

  open()  { this.el.classList.add('dbui-inv--open');  this._syncWidthToNavbar(); }
  close() { this.el.classList.remove('dbui-inv--open'); }
  toggle(){ this.el.classList.toggle('dbui-inv--open'); this._syncWidthToNavbar(); }
  isOpen(){ return this.el.classList.contains('dbui-inv--open'); }

  dispose() {
    window.removeEventListener('resize', this._resizeHandler);
    window.removeEventListener('orientationchange', this._resizeHandler);
    this.el?.remove();
  }

  attachToNavbar(navbarInstance) {
    this._navbar = navbarInstance?.element || null;
    this._syncWidthToNavbar();
  }

  _syncWidthToNavbar() {
    if (!this._navbar) this._navbar = document.getElementById('db-ui-navbar');
    if (this._navbar) {
      const r = this._navbar.getBoundingClientRect();
      this.el.style.width = `${Math.round(r.width)}px`;
      this.el.style.left = `${Math.round(r.left)}px`;
      this.el.style.removeProperty('transform');
    } else {
      this.el.style.width = 'min(94vw, 720px)';
      this.el.style.left = '50%';
      this.el.style.transform = 'translateX(-50%)';
    }
  }

  _build() {
    const wrap = document.createElement('section');
    wrap.id = 'db-ui-inventory';
    wrap.className = 'dbui-inv';
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Inventory panel');
    wrap.setAttribute('aria-hidden', 'true');

    // Content is intentionally empty (no slot elements).
    // Provide a subtle “sizing” element so the height hints ~5x4 space visually.
    const pad = document.createElement('div');
    pad.className = 'dbui-inv-pad';
    wrap.appendChild(pad);

    document.body.appendChild(wrap);
    this.el = wrap;
  }

  _injectStyles() {
    if (document.getElementById('dbui-inventory-styles')) return;
    const css = `
      :root{
        --dbui-inv-bg: rgba(20,18,15,0.82);
        --dbui-inv-stroke: rgba(245,238,218,0.1);
      }

      .dbui-inv{
        position: fixed;
        top: calc(env(safe-area-inset-top) + 10px + var(--dbui-nav-h, 56px) + 8px);
        /* Short drop so it doesn't cover much of the game */
        height: clamp(120px, 22vh, 240px);
        padding: 10px;
        background: var(--dbui-inv-bg);
        backdrop-filter: blur(14px) saturate(1.2);
        -webkit-backdrop-filter: blur(14px) saturate(1.2);
        border: 1px solid var(--dbui-inv-stroke);
        border-radius: 14px;
        box-shadow: 0 14px 40px rgba(0,0,0,.45);
        z-index: 11990;
        overflow: hidden;
        transform: translateY(-18px);
        opacity: 0;
        visibility: hidden;
        transition: opacity .22s ease, transform .22s ease, visibility .22s ease;
        pointer-events: none;
      }

      .dbui-inv.dbui-inv--open{
        transform: translateY(0px);
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }

      /* purely to give the panel a bit of inner breathing room */
      .dbui-inv-pad{
        width: 100%;
        height: 100%;
      }
    `;
    const style = document.createElement('style');
    style.id = 'dbui-inventory-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }
}