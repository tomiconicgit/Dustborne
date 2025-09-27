// file: src/core/navigationbar.js
import Inventory from './inventory.js';
import SkillLevels from './skilllevels.js';
import WorldMap from './worldmap.js';
import Missions from './missions.js';

export default class NavigationBar {
  static main = null;

  static create() {
    if (NavigationBar.main) return;
    NavigationBar.main = new NavigationBar(document.body);
  }

  constructor(root) {
    this.panels = {};
    this.buttons = {};
    this.activePanelKey = null;

    this._createStyles();
    const uiContainer = document.createElement('div');
    uiContainer.id = 'db-ui-container';

    const navElement = document.createElement('nav');
    navElement.id = 'db-navbar';

    const panelContainer = document.createElement('div');
    panelContainer.id = 'db-panel-container';

    const panelDefs = [
      { key: 'inventory', label: 'Inventory', Ctor: Inventory },
      { key: 'skilllevels', label: 'Skill Levels', Ctor: SkillLevels },
      { key: 'worldmap', label: 'World Map', Ctor: WorldMap },
      { key: 'missions', label: 'Missions', Ctor: Missions },
    ];

    panelDefs.forEach(({ key, label, Ctor }) => {
      // Create panel
      this.panels[key] = new Ctor(panelContainer);
      
      // Create button
      const button = document.createElement('button');
      button.textContent = label;
      button.dataset.key = key;
      button.addEventListener('click', () => this.setActivePanel(key));
      navElement.appendChild(button);
      this.buttons[key] = button;
    });

    uiContainer.appendChild(navElement);
    uiContainer.appendChild(panelContainer);
    root.appendChild(uiContainer);

    // Set default active panel
    this.setActivePanel('inventory');
  }

  setActivePanel(key) {
    if (this.activePanelKey === key) return;

    // Deactivate previous panel and button
    if (this.activePanelKey && this.panels[this.activePanelKey]) {
      this.panels[this.activePanelKey].hide();
      this.buttons[this.activePanelKey].classList.remove('active');
    }

    // Activate new panel and button
    if (this.panels[key]) {
      this.panels[key].show();
      this.buttons[key].classList.add('active');
      this.activePanelKey = key;
    }
  }

  _createStyles() {
    const s = document.createElement('style');
    s.textContent = `
      #db-ui-container {
        position: fixed;
        top: 60vh;
        bottom: 0;
        left: 0;
        right: 0;
        background-color: #1a1612;
        color: #f5eeda;
        font-family: system-ui, sans-serif;
      }
      #db-navbar {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 50px;
        display: flex;
        justify-content: space-around;
        align-items: stretch;
        border-top: 1px solid rgba(245, 238, 218, 0.1);
        background-color: #1f1a15;
      }
      #db-navbar button {
        flex: 1;
        background: transparent;
        border: none;
        border-right: 1px solid rgba(245, 238, 218, 0.1);
        color: #c3b8a5;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }
      #db-navbar button:last-child {
        border-right: none;
      }
      #db-navbar button:hover {
        background-color: rgba(245, 238, 218, 0.05);
      }
      #db-navbar button.active {
        color: #e88b33;
        background-color: rgba(232, 139, 51, 0.1);
        box-shadow: inset 0 -2px 0 #e88b33;
      }
      #db-panel-container {
        position: absolute;
        top: 50px;
        bottom: 0;
        left: 0;
        right: 0;
        overflow-y: hidden;
      }
      .db-panel {
        padding: 16px;
        box-sizing: border-box;
        background-color: rgba(0,0,0,0.2);
        position: absolute;
        inset: 0;
      }
    `;
    document.head.appendChild(s);
  }
}
