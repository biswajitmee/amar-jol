precision highp float;

uniform float uRayLength;

attribute float aRaySeed;
attribute float aRayAlpha;

varying vec2 vUv;
varying float vDepth;
varying float vRaySeed;
varying float vRayAlpha;
varying vec3 vLocalPosition;
varying vec3 vWorldPosition;

void main() {
  vUv = uv;
  vDepth = max(0.0, uRayLength * 0.5 - position.y);
  vRaySeed = aRaySeed;
  vRayAlpha = aRayAlpha;
  vLocalPosition = position;

  vec4 localPosition = vec4(position, 1.0);

  #ifdef USE_INSTANCING
    localPosition = instanceMatrix * localPosition;
  #endif

  vec4 worldPosition = modelMatrix * localPosition;
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
