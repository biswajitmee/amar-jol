precision highp float;

uniform float uTime;
uniform float uUnderwaterBlend;
uniform float uCameraDepth;
uniform vec3 uFogColor;
uniform vec3 uDeepColor;
uniform float uFogDensity;
uniform float uAbsorptionStrength;
uniform float uOpacity;
uniform float uNoiseScale;
uniform float uNoiseSpeed;

varying vec2 vUv;
varying vec3 vWorldPosition;

float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 19.19);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

void main() {
  float radial = length(vUv - 0.5);
  float vignette = smoothstep(0.84, 0.22, radial);
  float haze = noise(vWorldPosition.xy * uNoiseScale * 0.06 + vec2(uTime * uNoiseSpeed, -uTime * uNoiseSpeed));
  float depthFog = 1.0 - exp(-max(0.0, uCameraDepth + 0.35) * max(0.001, uFogDensity));
  vec3 color = mix(uFogColor, uDeepColor, clamp(depthFog * 0.8 + haze * 0.12, 0.0, 1.0));
  color *= mix(vec3(1.0), vec3(0.68, 0.9, 1.04), clamp(uAbsorptionStrength, 0.0, 1.0));
  float alpha = clamp(
    uUnderwaterBlend * uOpacity * vignette * (0.58 + depthFog * 0.72),
    0.0,
    0.96
  );

  gl_FragColor = vec4(color, alpha);
}
