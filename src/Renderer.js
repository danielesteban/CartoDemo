import { glMatrix, mat4, vec2, vec3 } from 'gl-matrix';
import requestAnimationFrame from 'raf';
import Input from './Input';
import Shader from './Shader';

class Renderer {
  constructor() {
    /* Setup rendering context */
    const hints = {
      alpha: false,
      antialias: true,
      preserveDrawingBuffer: false,
    };
    this.canvas = document.createElement('canvas');
    document.body.appendChild(this.canvas);
    this.context = this.canvas.getContext('webgl', hints) || this.canvas.getContext('experimental-webgl', hints);
    const GL = this.context;
    GL.enable(GL.DEPTH_TEST);
    GL.depthFunc(GL.LESS);
    GL.enable(GL.CULL_FACE);
    GL.cullFace(GL.BACK);
    GL.extensions = {
      VAO: GL.getExtension('OES_vertex_array_object'),
    };
    GL.clearColor(0.9, 0.9, 0.9, 1);
    /* Compile and setup standard shader */
    this.shader = new Shader(GL, 'standard');
    GL.useProgram(this.shader.program);
    /* Initialize variables */
    this.bounds = {
      min: vec2.create(),
      max: vec2.create(),
    };
    this.center = vec2.create();
    this.meshes = [];
    this.input = new Input(this);
    this.renderWireframe = false;
    this.render3D = false;
    this.scale = 0.00001;
    this.sunPosition = vec3.fromValues(0.3, -0.6, 0.9);
    this.setSunPosition(this.sunPosition);
    this.viewport = vec2.create();
    /* Handle window resizing */
    window.addEventListener('resize', this.onResize.bind(this));
    this.onResize();
    /* Start animation loop */
    this.onAnimationFrame = this.onAnimationFrame.bind(this);
    this.onAnimationFrame();
  }
  onResize() {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    const { canvas, context: GL, width, height, scale } = this;
    const pixelRatio = (window.devicePixelRatio || 1) * 2;
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
  toggle3D() {
    // TODO: [Hack] This is just an experimental addendum feature
    const { center, scale } = this;
    this.render3D = !this.render3D;
    this.setScale(scale);
    this.setCenter(center);
  }
  render() {
    const { context: GL, meshes, renderWireframe, render3D, shader } = this;
    GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
    meshes.forEach(({ VAO, view, albedo, bounds, count2D, count3D }) => {
      if (!this.isOnBounds(bounds)) return;
      /* Update uniforms */
      GL.uniformMatrix4fv(shader.uniform('model'), false, view);
      GL.uniform3fv(shader.uniform('albedo'), albedo);
      /* Draw mesh */
      GL.extensions.VAO.bindVertexArrayOES(VAO);
      GL.drawElements(
        renderWireframe ? GL.LINE_STRIP : GL.TRIANGLES,
        render3D ? count3D : count2D,
        GL.UNSIGNED_SHORT,
        0
      );
      GL.extensions.VAO.bindVertexArrayOES(null);
    });
  }
  setCenter(center) {
    const { context: GL, shader, scale, render3D } = this;
    vec2.copy(this.center, center);
    if (render3D) {
      const view = mat4.lookAt(
        mat4.create(),
        vec3.fromValues(center[0], center[1] - (480 * scale), 320 * scale),
        vec3.fromValues(center[0], center[1] - (220 * scale), 0),
        vec3.fromValues(0, 0, 1),
      );
      GL.uniformMatrix4fv(shader.uniform('view'), false, view);
    } else {
      const view = mat4.fromTranslation(
        mat4.create(),
        vec3.fromValues(-center[0], -center[1], 0)
      );
      GL.uniformMatrix4fv(shader.uniform('view'), false, view);
    }
    this.updateBounds();
    this.needsUpdate = true;
  }
  setScale(scale) {
    const { context: GL, shader, viewport, width, height, render3D } = this;
    this.scale = scale;
    /* Store new viewport dimensions (for bounds calculation) */
    vec2.set(viewport, width * 0.5 * scale, height * 0.5 * scale);
    if (render3D) {
      // TODO: This should really be updated only while coming from onResize
      //       Because the aspect ratio is our only variable here...
      //       But, like I stated in toggle3D: 3D rendering is only a experimental last minute hack
      const projection = mat4.perspective(
        mat4.create(),
        glMatrix.toRadian(60),
        width / height,
        0.0001, 0.1
      );
      GL.uniformMatrix4fv(shader.uniform('projection'), false, projection);
    } else {
      /* Accommodate the projection to the new scale  */
      const projection = mat4.ortho(
        mat4.create(),
        viewport[0] * -1.0, viewport[0],
        viewport[1] * -1.0, viewport[1],
        0, -0.1
      );
      /* Tell the GPU about it */
      GL.uniformMatrix4fv(shader.uniform('projection'), false, projection);
    }
    this.updateBounds();
    this.needsUpdate = true;
  }
  setSunPosition(position) {
    const { context: GL, shader } = this;
    /* Store the new position */
    vec3.copy(this.sunPosition, position);
    /* Tell the standard shader about it */
    GL.uniform3fv(shader.uniform('sunPosition'), position);
    this.needsUpdate = true;
  }
  updateBounds() {
    // TODO: [Incomplete] Pre-calculate fustrum planes if we are rendering 3D
    const { bounds, center, viewport } = this;
    vec2.sub(bounds.min, center, viewport);
    vec2.add(bounds.max, center, viewport);
  }
  isOnBounds(mesh) {
    // TODO: [Incomplete] Fustrum culling if we are rendering 3D
    const { bounds: { min, max } } = this;
    if (min[0] > mesh.max[0]) return false;
    if (min[1] > mesh.max[1]) return false;
    if (max[0] < mesh.min[0]) return false;
    if (max[1] < mesh.min[1]) return false;
    return true;
  }
  addMeshes(meshes) {
    meshes.forEach(mesh => this.addMesh(mesh));
  }
  addMesh({ vertices, indices, position, albedo, bounds, count2D, count3D }) {
    const { context: GL, meshes, shader } = this;
    // TODO: [Incomplete] This should be a class?
    const mesh = {
      VAO: GL.extensions.VAO.createVertexArrayOES(),
      vertices: GL.createBuffer(),
      index: GL.createBuffer(),
      view: mat4.fromTranslation(
        mat4.create(),
        vec3.fromValues(position[0], position[1], 0)
      ),
      albedo,
      bounds,
      count2D,
      count3D,
    };
    /* Upload vertex data to the GPU and let the garbage collector do it's job */
    GL.extensions.VAO.bindVertexArrayOES(mesh.VAO);
    GL.bindBuffer(GL.ARRAY_BUFFER, mesh.vertices);
    GL.bufferData(GL.ARRAY_BUFFER, vertices, GL.STATIC_DRAW);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, mesh.index);
    GL.bufferData(GL.ELEMENT_ARRAY_BUFFER, indices, GL.STATIC_DRAW);
    /* Store vertex attributes into the VAO */
    GL.enableVertexAttribArray(shader.attribute('position'));
    GL.vertexAttribPointer(
      shader.attribute('position'), 3, GL.FLOAT, false,
      Float32Array.BYTES_PER_ELEMENT * 6, 0
    );
    GL.enableVertexAttribArray(shader.attribute('normal'));
    GL.vertexAttribPointer(
      shader.attribute('normal'), 3, GL.FLOAT, false,
      Float32Array.BYTES_PER_ELEMENT * 6, Float32Array.BYTES_PER_ELEMENT * 3
    );
    GL.extensions.VAO.bindVertexArrayOES(null);
    /* Add the mesh to the rendering list and request an update */
    meshes.push(mesh);
    this.needsUpdate = true;
  }
}

export default new Renderer();
