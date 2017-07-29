import { vec2 } from 'gl-matrix';
import touches from 'touches';

class Input {
  constructor(renderer) {
    this.renderer = renderer;
    this.button = -1;
    this.mouseX = -1;
    this.mouseY = -1;
    this.wheelDebounce = 0;
    touches(window, { filtered: true })
      .on('start', this.onMouseDown.bind(this))
      .on('move', this.onMouseMove.bind(this))
      .on('end', this.onMouseUp.bind(this));
    window.addEventListener('mousewheel', this.onMouseWheel.bind(this));
    window.addEventListener('wheel', this.onMouseWheel.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }
  onMouseDown({ button }, pos) {
    this.button = button || 0;
    this.mouseX = pos[0];
    this.mouseY = pos[1];
  }
  onMouseMove(e, pos) {
    if (this.button !== 0) return;
    const { renderer } = this;
    const { center, scale } = renderer;
    const diff = vec2.fromValues(
      (this.mouseX - pos[0]) * scale,
      (pos[1] - this.mouseY) * scale
    );
    renderer.setCenter(vec2.add(vec2.create(), center, diff));
    this.mouseX = pos[0];
    this.mouseY = pos[1];
  }
  onMouseUp() {
    this.button = -1;
  }
  onMouseWheel({ deltaY }) {
    const { renderer, wheelDebounce: debounce } = this;
    const { center, scale, render3D } = renderer;
    const now = Date.now();
    const step = deltaY > 0 ? 2 : 0.5;
    if (debounce > now) return;
    this.wheelDebounce = now + 100;
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
