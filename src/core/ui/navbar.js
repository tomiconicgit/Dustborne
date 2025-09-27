// file: src/core/ui/inventory.js
// Slide-down fixed panel under the navbar: 7x5 grid of empty slots.

export default class InventoryPanel {
  /**
   * @param {object} opts
   * @param {HTMLElement} [opts.parent=document.body] - Where to append the panel
   * @param {number} [opts.rows=5]
   * @param {number} [opts.cols=7]
   */
  constructor({ parent = document.body, rows = 5, cols = 7 } = {}) {
    this.parent = parent;
    this.rows = rows;
    this.cols = cols;

    this._injectStyles();
    this._build();
    this._resizeHandler = () => this._syncWidthToNavbar();
    window.addEventListener('resize', this._resizeHandler, { passive: true });
    window.addEventListener('orientationchange', this._resizeHandler, { passive: true });
    // Initial width sync (in case navbar is already present)
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

  /** Optional helper to wire to a Navbar instance */
  attachToNavbar(navbarInstance) {
    this._navbar = navbarInstance?.element || null;
    this._syncWidthToNavbar();
  }

  _syncWidthToNavbar() {
    if (!this._navbar) this._navbar = document.getElementById('db-ui-navbar');
    if (this._navbar) {
      const r = this._navbar.getBoundingClientRect();
      // Match width & horizontal position of the navbar
      this.el.style.width = `${Math.round(r.width)}px`;
      this.el.style.left = `${Math.round(r.left)}px`;
    } else {
      // Fallback to centered width similar to navbar defaults
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
    wrap.setAttribute('aria-label', 'Inventory panel (read-only)');
    wrap.setAttribute('aria-hidden', 'true');

    // Grid
    const grid = document.createElement('div');
    grid.className = 'dbui-inv-grid';
    grid.style.setProperty('--cols', String(this.cols));
    grid.style.setProperty('--rows', String(this.rows));

    const total = this.rows * this.cols;
    for (let i = 0; i < total; i++) {
      const slot = document.createElement('button');
      slot.type = 'button';
      slot.className = 'dbui-inv-slot';
      slot.setAttribute('aria-label', `Slot ${i + 1} empty`);
      slot.disabled = true; // display-only for now
      grid.appendChild(slot);
    }

    wrap.appendChild(grid);
    document.body.appendChild(wrap);
    this.el = wrap;
  }

  _injectStyles() {
    if (document.getElementById('dbui-inventory-styles')) return;
    const css = `
      :root{
        --dbui-inv-bg: rgba(20,18,15,0.82);
        --dbui-inv-stroke: rgba(245,238,218,0.1);
        --dbui-inv-slot: rgba(255,255,255,0.06);
        --dbui-inv-slot-stroke: rgba(245,238,218,0.12);
        --dbui-inv-slot-shadow: inset 0 2px 0 rgba(255,255,255,0.04);
      }

      .dbui-inv{
        position: fixed;
        top: calc(env(safe-area-inset-top) + 10px + var(--dbui-nav-h, 56px) + 8px);
        /* width & left set dynamically to match navbar */
        height: clamp(140px, 26vh, 320px); /* not too tall */
        padding: 10px;
        background: var(--dbui-inv-bg);
        backdrop-filter: blur(14px) saturate(1.2);
        -webkit-backdrop-filter: blur(14px) saturate(1.2);
        border: 1px solid var(--dbui-inv-stroke);
        border-radius: 14px;
        box-shadow: 0 14px 40px rgba(0,0,0,.45);
        z-index: 11990;
        overflow: hidden; /* fixed panel, no scroll */
        transform: translateY(-18px); /* start a bit tucked under bar */
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

      .dbui-inv-grid{
        width: 100%; height: 100%;
        display: grid;
        grid-template-columns: repeat(var(--cols), 1fr);
        grid-template-rows: repeat(var(--rows), 1fr);
        gap: 8px;
      }

      .dbui-inv-slot{
        appearance: none;
        border: 1px dashed var(--dbui-inv-slot-stroke);
        background: var(--dbui-inv-slot);
        border-radius: 10px;
        box-shadow: var(--dbui-inv-slot-shadow);
        pointer-events: none; /* read-only placeholder */
      }
    `;
    const style = document.createElement('style');
    style.id = 'dbui-inventory-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }
}