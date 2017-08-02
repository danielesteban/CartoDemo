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
    this.projection = mat4.create();
    this.view = mat4.create();
    this.model = mat4.create();
    this.modelPosition = vec3.create();
    this.needsUpdate = false;
    this.needsProjectionUpdate = false;
    this.needsViewUpdate = false;
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
    const { canvas, context: GL, width, height, center, scale, render3D } = this;
    const pixelRatio = window.devicePixelRatio || 1;
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    GL.viewport(0, 0, GL.drawingBufferWidth, GL.drawingBufferHeight);
    this.setScale(scale);
    if (render3D) this.setCenter(center);
  }
  onAnimationFrame() {
    requestAnimationFrame(this.onAnimationFrame);
    if (!this.needsUpdate) return;
    this.needsUpdate = false;
    if (this.needsProjectionUpdate) {
      this.context.uniformMatrix4fv(this.shader.uniform('projection'), false, this.projection);
      this.needsProjectionUpdate = false;
    }
    if (this.needsViewUpdate) {
      this.context.uniformMatrix4fv(this.shader.uniform('view'), false, this.view);
      this.needsViewUpdate = false;
    }
    this.render();
  }
  toggleWireframe() {
    this.renderWireframe = !this.renderWireframe;
    this.needsUpdate = true;
  }
  toggle3D() {
    // TODO: [Hack] This is just an experimental addendum feature
    const { center, scale, sunPosition } = this;
    this.render3D = !this.render3D;
    this.setScale(scale);
    this.setCenter(center);
    this.setSunPosition(sunPosition);
  }
  render() {
    const {
      context: GL,
      center,
      meshes,
      model,
      modelPosition,
      renderWireframe,
      render3D,
      shader,
    } = this;
    if (render3D) {
      GL.clear(GL.COLOR_BUFFER_BIT | GL.DEPTH_BUFFER_BIT);
      GL.enable(GL.DEPTH_TEST);
    } else {
      GL.clear(GL.COLOR_BUFFER_BIT);
      GL.disable(GL.DEPTH_TEST);
    }
    meshes.forEach(({ VAO, albedo, bounds, count2D, count3D, position }) => {
      if (!this.isOnBounds(bounds)) return;
      /* Update uniforms */
      vec3.set(modelPosition, position[0] - center[0], position[1] - center[1], 0);
      mat4.fromTranslation(model, modelPosition);
      GL.uniformMatrix4fv(shader.uniform('model'), false, model);
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
    const { render3D, height, scale, view } = this;
    vec2.copy(this.center, center);
    if (render3D) {
      mat4.lookAt(
        view,
        vec3.fromValues(0, -height * 0.46 * scale, height * 0.46 * scale),
        vec3.fromValues(0, -height * 0.2 * scale, 0),
        vec3.fromValues(0, 0, 1),
      );
    } else {
      mat4.identity(view);
    }
    this.updateBounds();
    this.needsViewUpdate = true;
    this.needsUpdate = true;
  }
  setScale(scale) {
    const { viewport, width, height, projection, render3D } = this;
    this.scale = scale;
    /* Store new viewport dimensions (for bounds calculation) */
    vec2.set(viewport, width * 0.5 * scale, height * 0.5 * scale);
    if (render3D) {
      // TODO: This should really be updated only while coming from onResize
      //       Because the aspect ratio is our only variable here...
      //       But, like I stated in toggle3D: 3D rendering is only a experimental last minute hack
      mat4.perspective(
        projection,
        glMatrix.toRadian(70),
        width / height,
        0.0001, 0.1
      );
    } else {
      /* Accommodate the projection to the new scale  */
      mat4.ortho(
        projection,
        viewport[0] * -1.0, viewport[0],
        viewport[1] * -1.0, viewport[1],
        0, -0.1
      );
    }
    this.updateBounds();
    this.needsProjectionUpdate = true;
    this.needsUpdate = true;
  }
  setSunPosition(position) {
    const { context: GL, shader, render3D } = this;
    /* Store the new position */
    vec3.copy(this.sunPosition, position);
    /* Tell the standard shader about it */
    GL.uniform3fv(shader.uniform('sunPosition'), position);
    if (render3D) {
      GL.uniform1f(shader.uniform('diffuseFactor'), -1);
    } else {
      /* 2D diffuse pre-calculation */
      GL.uniform1f(shader.uniform('diffuseFactor'), Math.max(vec3.dot(vec3.fromValues(0, 0, 1), position), 0.3));
    }
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
      VBO: GL.createBuffer(),
      EBO: GL.createBuffer(),
      albedo,
      bounds,
      count2D,
      count3D,
      position,
    };
    /* Upload vertex data to the GPU and let the garbage collector do it's job */
    GL.extensions.VAO.bindVertexArrayOES(mesh.VAO);
    GL.bindBuffer(GL.ARRAY_BUFFER, mesh.VBO);
    GL.bufferData(GL.ARRAY_BUFFER, vertices, GL.STATIC_DRAW);
    GL.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, mesh.EBO);
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
