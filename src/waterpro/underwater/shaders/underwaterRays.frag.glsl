precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uOpacity;
uniform float uSpread;
uniform float uSpeed;
uniform float uDepthFade;

varying vec2 vUv;
varying float vDepth;
varying vec3 vWorldPosition;

float hash(vec2 p) {
  p = fract(p * vec2(91.7, 271.9));
  p += dot(p, p + 35.4);
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
  float x = (vUv.x - 0.5) * max(0.1, uSpread);
  float shafts =
    smoothstep(0.18, 0.0, abs(sin(x * 7.0 + uTime * uSpeed) * 0.18 + x)) * 0.52 +
    smoothstep(0.14, 0.0, abs(sin(x * 11.0 - uTime * uSpeed * 0.6) * 0.12 + x * 0.72)) * 0.34;
  float breakup = noise(vec2(vUv.x * 4.0 + uTime * uSpeed, vUv.y * 2.2 - uTime * uSpeed * 0.45));
  float surfaceFade = smoothstep(0.02, 0.22, vDepth);
  float depthFade = exp(-vDepth * max(0.01, uDepthFade));
  float sideFade = smoothstep(0.0, 0.16, vUv.x) * smoothstep(0.0, 0.16, 1.0 - vUv.x);
  float alpha = shafts * breakup * surfaceFade * depthFade * sideFade * uOpacity * uIntensity;

  gl_FragColor = vec4(uColor, alpha);
}
