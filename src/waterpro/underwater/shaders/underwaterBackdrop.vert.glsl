precision highp float;

uniform float uBackdropHeight;

varying vec2 vUv;
varying float vDepth;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vDepth = max(0.0, (1.0 - uv.y) * uBackdropHeight);
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
