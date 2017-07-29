import { vec2 } from 'gl-matrix';

class Input {
  constructor(renderer) {
    this.renderer = renderer;
    this.button = -1;
    this.mouseX = -1;
    this.mouseY = -1;
    window.addEventListener('mousedown', this.onMouseDown.bind(this));
    window.addEventListener('mousemove', this.onMouseMove.bind(this));
    window.addEventListener('mouseup', this.onMouseUp.bind(this));
    window.addEventListener('mousewheel', this.onMouseWheel.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }
  onMouseDown({ button, clientX, clientY }) {
    this.button = button;
    this.mouseX = clientX;
    this.mouseY = clientY;
  }
  onMouseMove({ clientX, clientY }) {
    if (this.button !== 0) return;
    const { renderer } = this;
    const { center, scale } = renderer;
    const diff = vec2.fromValues(
      (this.mouseX - clientX) * scale,
      (clientY - this.mouseY) * scale
    );
    renderer.setCenter(vec2.add(vec2.create(), center, diff));
    this.mouseX = clientX;
    this.mouseY = clientY;
  }
  onMouseUp() {
    this.button = -1;
  }
  onMouseWheel({ wheelDelta }) {
    const { renderer } = this;
    const { center, scale, render3D } = renderer;
    const step = wheelDelta > 0 ? 0.5 : 2;
    renderer.setScale(Math.min(Math.max(scale * step, 0.000001), 0.0001));
    if (render3D) renderer.setCenter(center);
  }
  onKeyDown({ keyCode, repeat }) {
    const { renderer } = this;
    if (repeat) return;
    switch (keyCode) {
      case 87: // W
        renderer.toggleWireframe();
        break;
      case 80: // P
        renderer.toggle3D();
        break;
      default:
    }
  }
}

export default Input;
