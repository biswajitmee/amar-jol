precision highp float;

uniform float uTime;
uniform float uWaveStrength;
uniform float uWaveSpeed;
uniform float uWaveScale;
uniform float uRippleStrength;
uniform sampler2D uRippleTexture;
uniform float uFollowRipples;
uniform float uWidth;
uniform float uDepth;
uniform float uEdgeSign;
uniform float uWorldThickness;
uniform float uPositionOffset;
uniform float uDepthOffset;

varying vec2 vBandUv;
varying float vWaveHeight;
varying float vRippleHeight;

const float PI = 3.141592653589793;

vec3 gerstner(vec2 p, vec2 waveDirection, float steepness, float wavelength, float phaseOffset) {
  vec2 direction = normalize(waveDirection);
  float scaledWavelength = max(wavelength * uWaveScale, 0.001);
  float k = 2.0 * PI / scaledWavelength;
  float speed = sqrt(9.8 / k) * uWaveSpeed;
  float phase = k * dot(direction, p) - speed * uTime + phaseOffset;
  float amplitude = steepness / k * uWaveStrength;

  return vec3(
    direction.x * cos(phase) * amplitude,
    sin(phase) * amplitude,
    direction.y * cos(phase) * amplitude
  );
}

vec3 layeredGerstner(vec2 p) {
  return
    gerstner(p, vec2(1.0, 0.18), 0.082, 2.7, 0.0) +
    gerstner(p, vec2(0.32, 1.0), 0.056, 1.85, 1.7) +
    gerstner(p, vec2(-0.72, 0.56), 0.038, 1.16, 3.4) +
    gerstner(p, vec2(-0.18, -1.0), 0.025, 0.72, 5.1);
}

void main() {
  vBandUv = uv;

  float centeredAcrossBand = uv.y - 0.5;
  float edgeCoord = uEdgeSign * (uDepth * 0.5 + uDepthOffset);
  vec2 surfacePosition = vec2(
    position.x,
    edgeCoord + uEdgeSign * centeredAcrossBand * uWorldThickness
  );
  vec3 displacement = layeredGerstner(surfacePosition);
  vec2 waterUv = clamp(
    vec2(surfacePosition.x / max(uWidth, 0.0001) + 0.5, surfacePosition.y / max(uDepth, 0.0001) + 0.5),
    0.0,
    1.0
  );
  float ripple = texture2D(uRippleTexture, waterUv).r * step(0.5, uFollowRipples);
  float rippleDisplacement = ripple * uRippleStrength * 0.085;
  vec3 localPosition = vec3(
    surfacePosition.x + displacement.x,
    displacement.y + rippleDisplacement + uPositionOffset,
    surfacePosition.y + displacement.z
  );

  vWaveHeight = displacement.y;
  vRippleHeight = ripple;

  gl_Position = projectionMatrix * modelViewMatrix * vec4(localPosition, 1.0);
}
