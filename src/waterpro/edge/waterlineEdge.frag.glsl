precision highp float;

uniform float uOpacity;
uniform float uBlurSoftness;
uniform vec3 uEdgeDarkColor;
uniform vec3 uEdgeHighlightColor;
uniform float uEdgeDarkStrength;
uniform float uEdgeHighlightStrength;
uniform float uDebugEdgeBand;

varying vec2 vBandUv;
varying float vWaveHeight;
varying float vRippleHeight;

float bell(float value, float center, float width) {
  float safeWidth = max(width, 0.0001);
  float normalized = (value - center) / safeWidth;

  return exp(-normalized * normalized);
}

void main() {
  float y = clamp(vBandUv.y, 0.0, 1.0);
  float softness = clamp(uBlurSoftness, 0.05, 1.0);
  float featherWidth = mix(0.08, 0.32, softness);
  float edgeFeather =
    smoothstep(0.0, featherWidth, y) *
    smoothstep(0.0, featherWidth, 1.0 - y);
  float centerBand = bell(y, 0.5, mix(0.075, 0.22, softness));
  float lowerAbsorption = centerBand * smoothstep(0.74, 0.18, y);
  float upperHighlight = bell(y, 0.66, mix(0.035, 0.095, softness));
  float rippleWhisper = clamp(vRippleHeight * 0.18 + abs(vWaveHeight) * 0.025, 0.0, 0.12);
  vec3 color =
    uEdgeDarkColor * lowerAbsorption * uEdgeDarkStrength +
    uEdgeHighlightColor * upperHighlight * uEdgeHighlightStrength;
  float alpha =
    uOpacity *
    edgeFeather *
    (centerBand * 0.52 + lowerAbsorption * 0.28 + upperHighlight * 0.16 + rippleWhisper);

  if (uDebugEdgeBand > 0.5) {
    color = mix(color, vec3(0.0, 0.88, 1.0), 0.42);
    alpha = max(alpha, 0.58);
  }

  if (alpha < 0.003) {
    discard;
  }

  gl_FragColor = vec4(color, alpha);
}
