class Status {
  constructor() {
    this.dom = document.createElement('status');
    document.body.appendChild(this.dom);
  }
  update(text) {
    if (text) {
      this.dom.innerText = text;
      this.dom.style.opacity = 1;
    } else {
      this.dom.style.opacity = 0;
    }
  }
}

export default new Status();
