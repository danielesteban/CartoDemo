precision mediump float;
varying vec3 fragNormal;
uniform vec3 albedo;
uniform vec3 sunPosition;
uniform float diffuseFactor;

void main(void) {
  float diffuse;
  if (diffuseFactor == -1.0) {
    vec3 normal = normalize(fragNormal);
    vec3 direction = normalize(sunPosition);
    diffuse = max(dot(normal, direction), 0.3);
  } else {
    diffuse = diffuseFactor;
  }
  gl_FragColor = vec4(albedo * diffuse, 1.0);
}
