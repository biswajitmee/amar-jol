precision highp float;

uniform float uTime;
uniform vec3 uShallowColor;
uniform vec3 uMidDepthColor;
uniform vec3 uDeepColor;
uniform float uDepthGradientStrength;
uniform float uDepthFogDensity;
uniform vec3 uHorizonLightColor;
uniform float uHorizonLightStrength;
uniform float uNoiseScale;
uniform float uNoiseSpeed;
uniform float uOpacity;
uniform float uAbsorptionStrength;

varying vec2 vUv;
varying float vDepth;
varying vec3 vWorldPosition;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
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

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    value += noise(p) * amp;
    p *= 2.08;
    amp *= 0.5;
  }
  return value;
}

void main() {
  float depth01 = clamp(pow(vDepth * 0.18, uDepthGradientStrength), 0.0, 1.0);
  float fog = 1.0 - exp(-vDepth * max(0.001, uDepthFogDensity));
  float softNoise = fbm(vWorldPosition.xy * uNoiseScale * 0.18 + vec2(uTime * uNoiseSpeed, -uTime * uNoiseSpeed * 0.7));
  float verticalVeil = fbm(vec2(vUv.x * 1.4, vUv.y * 0.34) + vec2(uTime * uNoiseSpeed * 0.45, 0.0));
  vec3 color = mix(uShallowColor, uMidDepthColor, smoothstep(0.02, 0.54, depth01));
  color = mix(color, uDeepColor, smoothstep(0.42, 1.0, fog));
  color += (softNoise - 0.5) * 0.055;
  color += uHorizonLightColor * uHorizonLightStrength * smoothstep(0.78, 1.0, vUv.y);
  color *= mix(vec3(1.0), vec3(0.72, 0.91, 1.03), clamp(uAbsorptionStrength * fog, 0.0, 1.0));

  float topFeather = smoothstep(0.012, 0.16, vDepth);
  float sideFeather = smoothstep(0.0, 0.18, vUv.x) * smoothstep(0.0, 0.18, 1.0 - vUv.x);
  float veilAlpha = mix(0.88, 1.0, verticalVeil);
  float alpha = topFeather * sideFeather * veilAlpha * uOpacity;

  gl_FragColor = vec4(color, alpha);
}
