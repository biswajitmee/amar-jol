precision highp float;

uniform float uTime;
uniform float uIntensity;
uniform vec3 uColor;
uniform vec2 uWaterSize;

varying vec2 vUv;
varying vec3 vWorldPosition;

float causticLine(vec2 p, float speed, float scale, float offset) {
  vec2 q = p * scale;
  float waveA = sin(q.x * 2.4 + q.y * 1.7 + uTime * speed + offset);
  float waveB = sin(q.x * -1.6 + q.y * 2.9 - uTime * speed * 0.72 + offset * 1.7);
  float line = abs(waveA + waveB);

  return smoothstep(0.18, 0.0, line);
}

void main() {
  vec2 centeredUv = vUv - 0.5;
  vec2 waterUv = centeredUv * uWaterSize;
  float caustic =
    causticLine(waterUv, 0.9, 3.8, 0.0) * 0.58 +
    causticLine(waterUv + vec2(0.21, -0.13), 1.25, 5.6, 1.7) * 0.34 +
    causticLine(waterUv + vec2(-0.18, 0.23), 0.72, 7.2, 3.2) * 0.22;
  float vignette =
    smoothstep(0.52, 0.24, abs(centeredUv.x)) *
    smoothstep(0.52, 0.24, abs(centeredUv.y));
  float alpha = clamp(caustic * vignette * uIntensity, 0.0, 0.65);

  gl_FragColor = vec4(uColor * caustic, alpha);
}
