precision highp float;

const int MAX_IMPACTS = 8;

uniform sampler2D uCurrent;
uniform sampler2D uPrevious;
uniform vec2 uTexel;
uniform vec2 uWaterSize;
uniform vec4 uImpacts[MAX_IMPACTS];
uniform int uImpactCount;
uniform float uDamping;

varying vec2 vUv;

float impactStamp(vec4 impact) {
  float radius = max(impact.w, 0.0001);
  float distanceToImpact = length((vUv - impact.xy) * uWaterSize);
  float falloff = 1.0 - smoothstep(radius * 0.12, radius, distanceToImpact);
  float softPeak = 0.65 + 0.35 * cos(min(distanceToImpact / radius, 1.0) * 3.14159265);

  return falloff * softPeak * impact.z;
}

void main() {
  float previous = texture2D(uPrevious, vUv).r;
  float left = texture2D(uCurrent, vUv - vec2(uTexel.x, 0.0)).r;
  float right = texture2D(uCurrent, vUv + vec2(uTexel.x, 0.0)).r;
  float bottom = texture2D(uCurrent, vUv - vec2(0.0, uTexel.y)).r;
  float top = texture2D(uCurrent, vUv + vec2(0.0, uTexel.y)).r;

  float next = (left + right + top + bottom) * 0.5 - previous;
  next *= uDamping;

  for (int i = 0; i < MAX_IMPACTS; i++) {
    if (i < uImpactCount) {
      next += impactStamp(uImpacts[i]);
    }
  }

  float edgeFade =
    smoothstep(0.0, 0.025, vUv.x) *
    smoothstep(0.0, 0.025, vUv.y) *
    smoothstep(0.0, 0.025, 1.0 - vUv.x) *
    smoothstep(0.0, 0.025, 1.0 - vUv.y);

  gl_FragColor = vec4(next * edgeFade, 0.0, 0.0, 1.0);
}
