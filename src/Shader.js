class Shader {
  constructor(context, vertex, fragment = vertex) {
    const GL = context;

    /* Compile vertex shader */
    this.vertex = GL.createShader(GL.VERTEX_SHADER);
    // eslint-disable-next-line global-require, import/no-dynamic-require
    GL.shaderSource(this.vertex, require(`./shaders/${vertex}.vert`));
    GL.compileShader(this.vertex);
    if (!GL.getShaderParameter(this.vertex, GL.COMPILE_STATUS)) {
      console.error(`${vertex} vertex: ${GL.getShaderInfoLog(this.vertex)}`);
      return;
    }

    /* Compile fragment shader */
    this.fragment = GL.createShader(GL.FRAGMENT_SHADER);
    // eslint-disable-next-line global-require, import/no-dynamic-require
    GL.shaderSource(this.fragment, require(`./shaders/${fragment}.frag`));
    GL.compileShader(this.fragment);
    if (!GL.getShaderParameter(this.fragment, GL.COMPILE_STATUS)) {
      console.error(`${fragment} fragment: ${GL.getShaderInfoLog(this.fragment)}`);
      return;
    }

    /* Create & link the shader program */
    this.program = GL.createProgram();
    GL.attachShader(this.program, this.vertex);
    GL.attachShader(this.program, this.fragment);
    GL.linkProgram(this.program);
    if (!GL.getProgramParameter(this.program, GL.LINK_STATUS)) {
      console.error(`Error linking the shader: ${vertex} + ${fragment}`);
    }

    this.context = context;
    this.attributes = {};
    this.uniforms = {};
  }
  dispose() {
    const { context: GL } = this;
    GL.deleteProgram(this.program);
  }
  attribute(id) {
    const { context: GL } = this;
    if (!this.attributes[id]) this.attributes[id] = GL.getAttribLocation(this.program, id);
    return this.attributes[id];
  }
  uniform(id) {
    const { context: GL } = this;
    if (!this.uniforms[id]) this.uniforms[id] = GL.getUniformLocation(this.program, id);
    return this.uniforms[id];
  }
}

export default Shader;
