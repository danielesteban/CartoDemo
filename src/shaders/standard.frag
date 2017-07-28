precision mediump float;
uniform vec3 albedo;

void main(void) {
  gl_FragColor = vec4(albedo, 1.0);
}
