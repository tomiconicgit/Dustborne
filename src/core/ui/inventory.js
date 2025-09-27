// file: src/core/ui/inventory.js
export default class InventoryPanel {
  constructor({ parent = document.body } = {}) {
    this.parent = parent;
    this._injectStyles();
    this._build();
  }

  get element() { return this.el; }
  open()  { this.el.classList.add('dbui-inv--open'); }
  close() { this.el.classList.remove('dbui-inv--open'); }
  toggle(){ this.el.classList.toggle('dbui-inv--open'); }
  isOpen(){ return this.el.classList.contains('dbui-inv--open'); }

  dispose() {
    this.el?.remove();
  }
  attachToNavbar(navbarInstance) { 
      this._navbar = navbarInstance?.element || null;
  }
  
  _build() {
    const wrap = document.createElement('section');
    wrap.id = 'db-ui-inventory';
    // CHANGED: Panel now starts in the open state.
    wrap.className = 'dbui-inv dbui-inv--open';
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', 'Inventory panel');
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
        /* Start translated OFF screen (but still "open") */
        transform: translateY(100%);
        visibility: hidden;
        transition: transform .25s ease, visibility .0s ease .25s;
        pointer-events: none;
      }

      /* This class now controls visibility */
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
