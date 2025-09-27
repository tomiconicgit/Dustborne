// file: src/core/ui/inventory.js
export default class InventoryPanel {
  constructor({ parent = document.body } = {}) {
    this.parent = parent;
    this._injectStyles();
    this._build();
    // REMOVED: Syncing width is no longer necessary as it's full-width.
  }

  get element() { return this.el; }
  open()  { this.el.classList.add('dbui-inv--open'); }
  close() { this.el.classList.remove('dbui-inv--open'); }
  toggle(){ this.el.classList.toggle('dbui-inv--open'); }
  isOpen(){ return this.el.classList.contains('dbui-inv--open'); }

  dispose() {
    // REMOVED: Event listeners are gone.
    this.el?.remove();
  }
  attachToNavbar(navbarInstance) { 
      // This is still useful for getting the navbar height variable.
      this._navbar = navbarInstance?.element || null;
  }
  
  // REMOVED: _syncWidthToNavbar function is obsolete.

  _build() {
    const wrap = document.createElement('section');
    wrap.id = 'db-ui-inventory';
    wrap.className = 'dbui-inv';
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Inventory panel');
    // The panel now starts open but invisible/translated, so aria-hidden is false.
    wrap.innerHTML = `<div class="dbui-inv-pad"></div>`;
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
      
      /* CHANGED: Entire rule updated for new layout */
      .dbui-inv{
        position: fixed;
        top: 75vh;
        bottom: var(--dbui-nav-h, 50px);
        left: 0;
        width: 100%;
        height: auto;
        padding: 10px;
        box-sizing: border-box;
        background: var(--dbui-inv-bg);
        backdrop-filter: blur(14px) saturate(1.2);
        -webkit-backdrop-filter: blur(14px) saturate(1.2);
        border-top: 1px solid var(--dbui-inv-stroke);
        z-index: 13000;
        overflow: hidden;
        transform: translateY(100%);
        visibility: hidden;
        transition: transform .25s ease, visibility .0s ease .25s;
        pointer-events: none;
      }

      /* CHANGED: Transition updated to slide in from the bottom. */
      .dbui-inv.dbui-inv--open{
        transform: translateY(0);
        visibility: visible;
        transition: transform .25s ease;
        pointer-events: auto;
      }

      .dbui-inv-pad{ width:100%; height:100%; }
    `;
    const style = document.createElement('style');
    style.id = 'dbui-inventory-styles';
    style.textContent = css;
    document.head.appendChild(style);
  }
}
