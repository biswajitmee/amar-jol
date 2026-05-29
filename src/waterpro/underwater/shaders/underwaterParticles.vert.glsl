precision highp float;

uniform float uTime;
uniform float uSize;
uniform float uDriftSpeed;
uniform float uDriftAmount;
uniform float uOpacity;
uniform float uUnderwaterBlend;
uniform vec3 uCameraLocal;
uniform float uNearFade;
uniform float uFarFade;

attribute float aSeed;

varying float vAlpha;

void main() {
  vec3 animated = position;
  animated.x += sin(uTime * uDriftSpeed + aSeed * 17.1 + position.y * 0.7) * uDriftAmount;
  animated.z += cos(uTime * uDriftSpeed * 0.76 + aSeed * 12.3 + position.x * 0.45) * uDriftAmount;
  animated.y += sin(uTime * uDriftSpeed * 0.42 + aSeed * 8.9) * uDriftAmount * 0.26;

  float distanceToCamera = distance(animated, uCameraLocal);
  float nearFade = smoothstep(0.0, max(0.001, uNearFade), distanceToCamera);
  float farFade = 1.0 - smoothstep(max(0.001, uFarFade * 0.72), max(0.001, uFarFade), distanceToCamera);
  float depthFade = smoothstep(0.02, 0.7, -animated.y);
  vAlpha = uOpacity * max(0.28, uUnderwaterBlend) * nearFade * farFade * depthFade;

  vec4 mvPosition = modelViewMatrix * vec4(animated, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uSize * (260.0 / max(1.0, -mvPosition.z));
}
