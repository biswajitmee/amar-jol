precision highp float;

uniform float uTime;
uniform float uBurstStart;
uniform float uSize;
uniform float uRiseSpeed;
uniform float uWobble;
uniform float uOpacity;
uniform vec3 uEmitter;

attribute float aSeed;
attribute float aDelay;

varying float vAlpha;
varying float vRing;

void main() {
  float age = uTime - uBurstStart - aDelay;
  float lifetime = 8.0 + fract(aSeed * 9.17) * 2.4;
  float activeMask = step(0.0, age) * (1.0 - step(lifetime, age));
  float t = clamp(age / lifetime, 0.0, 1.0);
  vec3 animated = uEmitter + position;
  animated.y += age * uRiseSpeed * 0.2;
  animated.x += sin(age * 2.1 + aSeed * 17.0) * uWobble * (0.2 + t);
  animated.z += cos(age * 1.7 + aSeed * 11.0) * uWobble * (0.2 + t);

  vAlpha = activeMask * uOpacity * smoothstep(0.0, 0.18, t) * (1.0 - smoothstep(0.74, 1.0, t));
  vRing = 0.34 + fract(aSeed * 13.1) * 0.1;

  vec4 mvPosition = modelViewMatrix * vec4(animated, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uSize * (420.0 / max(1.0, -mvPosition.z));
}
