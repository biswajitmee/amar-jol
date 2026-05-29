precision highp float;

uniform float uTime;
uniform vec3 uColor;
uniform float uIntensity;
uniform float uScale;
uniform float uSpeed;
uniform float uDistortion;
uniform float uDepthFade;

varying vec2 vUv;
varying vec3 vWorldPosition;

float causticLine(vec2 p, float offset) {
  float waveA = sin(p.x * 2.1 + p.y * 1.5 + offset);
  float waveB = sin(p.x * -1.4 + p.y * 2.7 - offset * 0.73);
  float waveC = sin(p.x * 3.2 - p.y * 0.9 + offset * 0.34);
  return smoothstep(0.14, 0.0, abs(waveA + waveB + waveC) * 0.32);
}

void main() {
  vec2 centered = vUv - 0.5;
  vec2 p = centered * max(0.1, uScale);
  p += vec2(
    sin(p.y * 1.6 + uTime * uSpeed) * uDistortion,
    cos(p.x * 1.3 - uTime * uSpeed * 0.8) * uDistortion
  );
  float caustic =
    causticLine(p, uTime * uSpeed) * 0.62 +
    causticLine(p * 1.46 + vec2(0.37, -0.21), uTime * uSpeed * 1.28) * 0.28;
  float vignette =
    smoothstep(0.54, 0.18, abs(centered.x)) *
    smoothstep(0.54, 0.18, abs(centered.y));
  float alpha = caustic * vignette * uIntensity * uDepthFade;

  gl_FragColor = vec4(uColor * caustic, alpha);
}
