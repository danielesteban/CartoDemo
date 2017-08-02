attribute vec3 position;
attribute vec3 normal;
varying vec3 fragNormal;
uniform vec2 model;
uniform mat4 view;
uniform mat4 projection;

void main(void) {
  fragNormal = normal;
  gl_Position = projection * view * vec4(vec3(model, 0.0) + position, 1.0);
}
