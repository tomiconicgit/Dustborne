// file: src/core/inventory.js
export default class Inventory {
  constructor(parentElement) {
    this.element = document.createElement('div');
    this.element.id = 'db-inventory-panel';
    this.element.className = 'db-panel';
    this.element.style.display = 'none';

    this._createGrid(this.element);
    
    parentElement.appendChild(this.element);
  }

  _createGrid(container) {
    const gridContainer = document.createElement('div');
    gridContainer.style.cssText = `
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 8px;
      width: 92%;
      max-width: 400px;
      max-height: 92%;
    `;

    const totalSlots = 15;
    for (let i = 0; i < totalSlots; i++) {
      const slot = document.createElement('div');
      slot.style.cssText = `
        background-color: rgba(0,0,0,0.3);
        border: 1px solid rgba(245, 238, 218, 0.08);
        border-radius: 8px;
        aspect-ratio: 1 / 1;
      `;
      gridContainer.appendChild(slot);
    }
    container.appendChild(gridContainer);
  }

  show() { this.element.style.display = 'flex'; } // ✨ FIX: Changed 'block' to 'flex'
  hide() { this.element.style.display = 'none'; }
}
