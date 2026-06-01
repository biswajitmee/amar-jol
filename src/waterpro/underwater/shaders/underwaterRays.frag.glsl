precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uOpacity;
uniform float uSpread;
uniform float uSpeed;
uniform float uDepthFade;
uniform float uLightMargin;
uniform float uRayLength;

varying vec2 vUv;
varying float vDepth;
varying float vRaySeed;
varying float vRayAlpha;
varying vec3 vLocalPosition;
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
  float around = abs(vUv.x - 0.5) * 2.0;
  float radialCore = pow(1.0 - clamp(around, 0.0, 1.0), 0.42);
  float seamSoftness = smoothstep(0.0, 0.08, vUv.x) *
    smoothstep(0.0, 0.08, 1.0 - vUv.x);
  float surfaceFade = smoothstep(0.0, max(0.08, uRayLength * 0.12), vDepth);
  float bottomFade = smoothstep(uRayLength, uRayLength * 0.34, vDepth);
  float depthFade = exp(-vDepth * max(0.01, uDepthFade) * 0.42);
  float marginFade = smoothstep(
    0.0,
    0.6 + max(0.0, uLightMargin) * 0.35,
    length(vLocalPosition.xz)
  );

  float flow = uTime * uSpeed;
  float breakup = noise(vec2(
    vUv.x * (5.0 + uSpread * 1.4) + vRaySeed * 17.0 + flow,
    vUv.y * 3.1 - flow * 0.64
  ));
  float fineBreakup = noise(vec2(
    vUv.x * 18.0 + vRaySeed * 29.0 - flow * 1.7,
    vUv.y * 8.0 + flow
  ));
  float shaftTexture = mix(0.34, 1.0, breakup) * mix(0.55, 1.0, fineBreakup);
  float alpha = radialCore *
    seamSoftness *
    surfaceFade *
    bottomFade *
    depthFade *
    marginFade *
    shaftTexture *
    vRayAlpha *
    uOpacity *
    uIntensity;

  gl_FragColor = vec4(uColor, clamp(alpha, 0.0, 1.0));
}
