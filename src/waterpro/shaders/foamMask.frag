precision highp float;

const int MAX_FOAM_IMPACTS = 12;

uniform sampler2D uPrevious;
uniform vec4 uImpacts[MAX_FOAM_IMPACTS];
uniform vec4 uImpactParams[MAX_FOAM_IMPACTS];
uniform int uImpactCount;
uniform vec2 uWaterSize;
uniform float uTime;
uniform float uDelta;
uniform float uFoamDecay;

varying vec2 vUv;

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
  float amplitude = 0.5;

  for (int i = 0; i < 4; i++) {
    value += noise(p) * amplitude;
    p *= 2.02;
    amplitude *= 0.52;
  }

  return value;
}

float brokenFoamRing(vec4 impact, vec4 params) {
  vec2 toImpact = (vUv - impact.xy) * uWaterSize;
  float distanceToImpact = length(toImpact);
  float age = max(uTime - impact.w, 0.0);
  float lifetime = max(params.z, 0.001);
  float progress = clamp(age / lifetime, 0.0, 1.0);
  float radius = impact.z + params.w * smoothstep(0.0, 1.0, progress);
  float ringWidth = mix(0.025, 0.055, progress) + radius * 0.08;
  float angle = atan(toImpact.y, toImpact.x);
  float angularNoise = fbm(vec2(angle * 2.8 + impact.x * 17.0, age * 0.62 + impact.y * 13.0));
  float edgeNoise = fbm(vUv * uWaterSize * 7.5 + vec2(age * 0.32, -age * 0.24));
  float edgeShift = (angularNoise - 0.5) * ringWidth * 1.65 + (edgeNoise - 0.5) * ringWidth * 0.75;
  float distanceToRing = abs(distanceToImpact - radius + edgeShift);
  float ring = 1.0 - smoothstep(ringWidth * 0.35, ringWidth, distanceToRing);
  float brokenMask = smoothstep(0.18, 0.82, angularNoise + edgeNoise * 0.34);
  float flecks = smoothstep(0.72, 0.95, fbm(vUv * uWaterSize * 18.0 + age * 0.58));
  float fade = pow(1.0 - progress, 1.65);
  float energy = clamp(params.y * (0.48 + params.x), 0.0, 1.0);

  return clamp(ring * max(brokenMask, flecks * 0.55) * energy * fade, 0.0, 1.0);
}

void main() {
  float previous = texture2D(uPrevious, vUv).r * pow(uFoamDecay, uDelta * 60.0);
  float foam = previous;

  for (int i = 0; i < MAX_FOAM_IMPACTS; i++) {
    if (i < uImpactCount) {
      foam = max(foam, brokenFoamRing(uImpacts[i], uImpactParams[i]));
    }
  }

  gl_FragColor = vec4(clamp(foam, 0.0, 1.0), 0.0, 0.0, 1.0);
}
