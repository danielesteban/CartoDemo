precision mediump float;
varying vec3 fragNormal;
uniform vec3 albedo;
uniform vec3 sunPosition;

void main(void) {
  vec3 normal = normalize(fragNormal);
	vec3 direction = normalize(sunPosition);
	float diffuse = max(dot(normal, direction), 0.0);
  gl_FragColor = vec4(albedo * max(diffuse, 0.3), 1.0);
}
