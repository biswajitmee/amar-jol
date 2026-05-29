precision highp float;

uniform vec3 uColor;

varying float vAlpha;
varying float vRing;

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);
  float rimInner = smoothstep(vRing - 0.08, vRing - 0.015, d);
  float rimOuter = 1.0 - smoothstep(vRing + 0.015, vRing + 0.08, d);
  float rim = rimInner * rimOuter;
  float core = (1.0 - smoothstep(0.04, 0.42, d)) * 0.18;
  float edgeFade = 1.0 - smoothstep(0.48, 0.5, d);
  float alpha = (rim + core) * vAlpha;
  gl_FragColor = vec4(uColor, alpha * edgeFade);
}
