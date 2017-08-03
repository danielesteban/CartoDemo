attribute vec3 position;
attribute vec3 normal;
attribute vec3 color;
varying vec3 fragNormal;
varying vec3 fragColor;
uniform vec2 model;
uniform mat4 view;
uniform mat4 projection;

void main(void) {
  fragNormal = normal;
  fragColor = color;
  gl_Position = projection * view * vec4(vec3(model, 0.0) + position, 1.0);
}
