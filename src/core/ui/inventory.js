// file: src/core/ui/inventory.js
// Slide-down fixed panel under the navbar: simple background area (no slots)

export default class InventoryPanel {
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
    // Keep centered like the navbar to avoid right overflow on iOS safe areas.
    const nav = this._navbar || document.getElementById('db-ui-navbar');
    this.el.style.left = '50%';
    this.el.style.transform = 'translateX(-50%)';

    if (nav) {
      const r = nav.getBoundingClientRect();
      this.el.style.width = `${Math.round(r.width)}px`; // match navbar width
    } else {
      this.el.style.width = 'min(94vw, 720px)';
    }
  }

  _build() {
    const wrap = document.createElement('section');
    wrap.id = 'db-ui-inventory';
    wrap.className = 'dbui-inv';
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Inventory panel');
    wrap.setAttribute('aria-hidden', 'true');

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
        top: calc(env(safe-area-inset-top) + 10px + var(--dbui-nav-h, 52px) + 8px);
        /* a bit shorter so it covers less of the game view */
        height: clamp(100px, 18vh, 200px);
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

        /* width/centering defaults; will be synced to navbar */
        left: 50%;
        transform-origin: top center;
      }

      .dbui-inv.dbui-inv--open{
        transform: translate(-50%, 0px);
        opacity: 1;
        visibility: visible;
        pointer-events: auto;
      }

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