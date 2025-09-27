// file: src/core/skilllevels.js
export default class SkillLevels {
  constructor(parentElement) {
    this.element = document.createElement('div');
    this.element.id = 'db-skilllevels-panel';
    this.element.className = 'db-panel';
    this.element.style.display = 'none';

    // Panel content will go here
    const placeholder = document.createElement('p');
    placeholder.textContent = 'Skill Levels Panel';
    placeholder.style.textAlign = 'center';
    placeholder.style.color = 'rgba(255,255,255,0.3)';
    this.element.appendChild(placeholder);
    
    parentElement.appendChild(this.element);
  }

  show() { this.element.style.display = 'block'; }
  hide() { this.element.style.display = 'none'; }
}
