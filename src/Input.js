import { vec2 } from 'gl-matrix';
import mouseWheel from 'mouse-wheel';
import touches from 'touches';

class Input {
  static toggleFullscreen() {
    const e = document.documentElement;
    if ((
      document.fullscreenElement ||
      document.mozFullScreenElement ||
      document.webkitFullscreenElement
    ) === e) {
      if (document.mozCancelFullScreen) document.mozCancelFullScreen();
      else if (document.webkitCancelFullScreen) document.webkitCancelFullScreen();
      else document.cancelFullScreen();
    } else if (e.mozRequestFullScreen) e.mozRequestFullScreen();
    else if (e.webkitRequestFullscreen) e.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    else e.requestFullscreen();
  }
  constructor(renderer) {
    this.renderer = renderer;
    this.button = -1;
    this.mouseX = -1;
    this.mouseY = -1;
    touches(window, { filtered: true })
      .on('start', this.onMouseDown.bind(this))
      .on('move', this.onMouseMove.bind(this))
      .on('end', this.onMouseUp.bind(this));
    mouseWheel(window, this.onMouseWheel.bind(this), true);
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }
  onMouseDown(e, pos) {
    e.preventDefault();
    this.button = e.button || 0;
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
  onMouseWheel(dX, dY) {
    const { renderer } = this;
    const { center, scale, render3D } = renderer;
    renderer.setScale(Math.min(Math.max(scale + (dY * 0.001 * scale), 0.000001), 0.00006));
    // TODO: [Incomplete] While in 2D, this should also update the center
    //                    with the current mouse position?
    if (render3D) renderer.setCenter(center);
  }
  onKeyDown({ keyCode, repeat }) {
    const { renderer } = this;
    const { center, scale } = renderer;
    const step = 50.0 * scale;
    switch (keyCode) {
      case 69: // E
        if (!repeat) renderer.toggle3D();
        break;
      case 87: // W
        if (!repeat) renderer.toggleWireframe();
        break;
      case 70: // F
        if (!repeat) Input.toggleFullscreen();
        break;
      case 38: // UP
        renderer.setCenter(vec2.add(vec2.create(), center, vec2.fromValues(0, step)));
        break;
      case 40: // DOWN
        renderer.setCenter(vec2.add(vec2.create(), center, vec2.fromValues(0, -step)));
        break;
      case 37: // LEFT
        renderer.setCenter(vec2.add(vec2.create(), center, vec2.fromValues(-step, 0)));
        break;
      case 39: // RIGHT
        renderer.setCenter(vec2.add(vec2.create(), center, vec2.fromValues(step, 0)));
        break;
      default:
    }
  }
}

export default Input;
