precision highp float;

uniform float uTime;
uniform float uWaveStrength;
uniform float uWaveSpeed;
uniform float uWaveScale;
uniform float uRippleStrength;
uniform sampler2D uRippleTexture;
uniform vec2 uRippleTexel;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vWaveHeight;
varying float vWaveMask;
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

float sampleHeight(vec2 p) {
  return layeredGerstner(p).y;
}

void main() {
  vUv = uv;

  vec2 surfacePosition = position.xy;
  vec3 displacement = layeredGerstner(surfacePosition);
  float ripple = texture2D(uRippleTexture, uv).r;
  float rippleLeft = texture2D(uRippleTexture, uv - vec2(uRippleTexel.x, 0.0)).r;
  float rippleRight = texture2D(uRippleTexture, uv + vec2(uRippleTexel.x, 0.0)).r;
  float rippleBottom = texture2D(uRippleTexture, uv - vec2(0.0, uRippleTexel.y)).r;
  float rippleTop = texture2D(uRippleTexture, uv + vec2(0.0, uRippleTexel.y)).r;
  vec2 rippleGradient = vec2(rippleRight - rippleLeft, rippleTop - rippleBottom) * uRippleStrength;
  float rippleDisplacement = ripple * uRippleStrength * 0.085;

  vec2 eps = vec2(0.045, 0.0);
  float center = sampleHeight(surfacePosition);
  float dx = sampleHeight(surfacePosition + eps.xy) - sampleHeight(surfacePosition - eps.xy);
  float dz = sampleHeight(surfacePosition + eps.yx) - sampleHeight(surfacePosition - eps.yx);

  vec3 localPosition = vec3(
    surfacePosition.x + displacement.x,
    displacement.y + rippleDisplacement,
    surfacePosition.y + displacement.z
  );

  vWaveHeight = center;
  vRippleHeight = ripple;
  vWaveMask = smoothstep(-0.08, 0.16, center + rippleDisplacement);
  vNormal = normalize(vec3(-dx - rippleGradient.x * 0.16, 0.09, -dz - rippleGradient.y * 0.16));

  vec4 worldPosition = modelMatrix * vec4(localPosition, 1.0);
  vWorldPosition = worldPosition.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
