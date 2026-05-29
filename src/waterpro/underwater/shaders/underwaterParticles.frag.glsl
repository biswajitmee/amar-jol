precision highp float;

uniform vec3 uColor;

varying float vAlpha;

void main() {
  vec2 p = gl_PointCoord - 0.5;
  float d = length(p);
  float alpha = smoothstep(0.5, 0.08, d) * vAlpha;
  gl_FragColor = vec4(uColor, alpha);
}
