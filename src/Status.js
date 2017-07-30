class Status {
  constructor() {
    this.dom = document.createElement('status');
    document.body.appendChild(this.dom);
    this.help = document.createElement('help');
    [
      { key: 'E', action: 'Experimental 3D view' },
      { key: 'W', action: 'Wireframe rendering' },
      { key: 'F', action: 'Go fullscreen' },
    ].forEach(({ key, action }) => {
      const p = document.createElement('p');
      p.innerText = `[${key}] ${action}`;
      this.help.appendChild(p);
    });
    document.body.appendChild(this.help);
  }
  update(text) {
    if (text) {
      this.dom.innerText = text;
      this.dom.style.opacity = 1;
      this.help.style.opacity = 0;
    } else {
      this.dom.style.opacity = 0;
      this.help.style.opacity = 1;
    }
  }
}

export default new Status();
