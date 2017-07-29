import { mat4, vec2, vec3 } from 'gl-matrix';
import requestAnimationFrame from 'raf';
import Input from './Input';
import Shader from './Shader';

class Renderer {
  constructor() {
    const hints = {
      alpha: false,
      antialias: true,
    };
    this.canvas = document.createElement('canvas');
    document.body.appendChild(this.canvas);
    this.context = this.canvas.getContext('webgl', hints) || this.canvas.getContext('experimental-webgl', hints);
    const GL = this.context;
    GL.extensions = {
      VAO: GL.getExtension('OES_vertex_array_object'),
    };
    GL.clearColor(0.9, 0.9, 0.9, 1);
    this.shader = new Shader(GL, 'standard');
    GL.useProgram(this.shader.program);
    this.bounds = {
      min: vec2.create(),
      max: vec2.create(),
    };
    this.viewport = vec2.create();
    this.center = vec2.create();
    this.scale = 0.00001;
    this.renderWireframe = false;
    this.meshes = [];
    window.addEventListener('resize', this.onResize.bind(this));
    this.onResize();
    this.onAnimationFrame = this.onAnimationFrame.bind(this);
    this.onAnimationFrame();
    this.input = new Input(this);
  }
  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const { canvas, context: GL, width, height, scale } = this;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    GL.viewport(0, 0, GL.drawingBufferWidth, GL.drawingBufferHeight);
    this.setScale(scale);
  }
  onAnimationFrame() {
    requestAnimationFrame(this.onAnimationFrame);
    if (!this.needsUpdate) return;
    this.needsUpdate = false;
    this.render();
  }
  toggleWireframe() {
    this.renderWireframe = !this.renderWireframe;
    this.needsUpdate = true;
  }
  render() {
    const { context: GL, meshes, renderWireframe, shader } = this;
    GL.clear(GL.COLOR_BUFFER_BIT);
    meshes.forEach(({ VAO, count, view, albedo, bounds }) => {
      if (!this.isOnBounds(bounds)) return;
      GL.uniformMatrix4fv(shader.uniform('model'), false, view);
      GL.uniform3fv(shader.uniform('albedo'), albedo);
      GL.extensions.VAO.bindVertexArrayOES(VAO);
      GL.drawElements(renderWireframe ? GL.LINE_STRIP : GL.TRIANGLES, count, GL.UNSIGNED_SHORT, 0);
      GL.extensions.VAO.bindVertexArrayOES(null);
    });
  }
  setCenter(center) {
    const { context: GL, shader } = this;
    vec2.copy(this.center, center);
    const view = mat4.fromTranslation(
      mat4.create(),
      vec3.fromValues(-center[0], -center[1], 0)
    );
    GL.uniformMatrix4fv(shader.uniform('view'), false, view);
    this.updateBounds();
    this.needsUpdate = true;
  }
  setScale(scale) {
    const { context: GL, shader, viewport, width, height } = this;
    this.scale = scale;
    vec2.set(viewport, width * 0.5 * scale, height * 0.5 * scale);
    const projection = mat4.ortho(
      mat4.create(),
      viewport[0] * -1.0, viewport[0],
      viewport[1] * -1.0, viewport[1],
      0, 1
    );
    GL.uniformMatrix4fv(shader.uniform('projection'), false, projection);
    this.updateBounds();
    this.needsUpdate = true;
  }
  updateBounds() {
    const { bounds, center, viewport } = this;
    vec2.sub(bounds.min, center, viewport);
    vec2.add(bounds.max, center, viewport);
  }
  isOnBounds(mesh) {
    const { bounds: { min, max } } = this;
    if (min[0] > mesh.max[0]) return false;
    if (min[1] > mesh.max[1]) return false;
    if (max[0] < mesh.min[0]) return false;
    if (max[1] < mesh.min[1]) return false;
    return true;
  }
  addMeshes(meshes, preprocess) {
    meshes.forEach(mesh => this.addMesh(mesh, preprocess));
  }
  addMesh({ vertices, indices, bounds, position, properties }, preprocess = mesh => mesh) {
    const { context: GL, meshes, shader } = this;
    // TODO: [Incomplete] This should be a class?
    const mesh = {
      VAO: GL.extensions.VAO.createVertexArrayOES(),
      vertices: GL.createBuffer(),
      index: GL.createBuffer(),
      count: indices.length,
      view: mat4.fromTranslation(
        mat4.create(),
        vec3.fromValues(position[0], position[1], 0)
      ),
      albedo: vec3.create(),
      bounds,
    };
    GL.extensions.VAO.bindVertexArrayOES(mesh.VAO);
    GL.bindBuffer(GL.ARRAY_BUFFER, mesh.vertices);
    GL.bufferData(GL.ARRAY_BUFFER, vertices, GL.STATIC_DRAW);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, mesh.index);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, indices, GL.STATIC_DRAW);
    GL.vertexAttribPointer(
      shader.attribute('position'), 2, GL.FLOAT, false,
      Float32Array.BYTES_PER_ELEMENT * 2, 0
    );
    GL.enableVertexAttribArray(shader.attribute('position'));
    GL.extensions.VAO.bindVertexArrayOES(null);
    meshes.push(preprocess(mesh, properties));
    this.needsUpdate = true;
  }
}

export default new Renderer();
