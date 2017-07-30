attribute vec3 position;
attribute vec3 normal;
varying vec3 fragNormal;
uniform mat4 model;
uniform mat4 view;
uniform mat4 projection;

void main(void) {
  fragNormal = normal;
  gl_Position = projection * view * model * vec4(position, 1.0);
}
