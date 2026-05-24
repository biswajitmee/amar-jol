precision highp float;

uniform float uTime;
uniform vec3 uWaterColor;
uniform vec3 uDeepColor;
uniform vec3 uUnderwaterColor;
uniform float uUnderwaterMix;
uniform vec3 uSunDirection;
uniform float uOpacity;
uniform float uFresnelPower;
uniform float uReflectionStrength;
uniform float uRippleStrength;
uniform vec3 uFoamColor;
uniform float uFoamStrength;
uniform float uFoamDecay;
uniform sampler2D uRippleTexture;
uniform sampler2D uFoamTexture;
uniform vec2 uRippleTexel;
uniform sampler2D uPlanarReflectionTexture;
uniform float uPlanarReflectionEnabled;
uniform float uPlanarReflectionStrength;
uniform float uPlanarReflectionDistortion;
uniform vec3 uPlanarReflectionTint;
uniform float uPlanarReflectionFade;
uniform float uPlanarReflectionDebugFullStrength;
uniform float uPlanarReflectionDebugNoDistortion;
uniform float uPlanarReflectionDebugFixedBlend;

varying vec2 vUv;
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vWaveHeight;
varying float vWaveMask;
varying float vRippleHeight;
varying vec4 vPlanarReflectionCoord;

float hash(vec2 p) {
  p = fract(p * vec2(127.1, 311.7));
  p += dot(p, p + 19.19);
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
    p *= 2.03;
    amplitude *= 0.5;
  }

  return value;
}

void main() {
  vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
  float underwaterMix = clamp(uUnderwaterMix, 0.0, 1.0);
  vec2 noiseUv = vWorldPosition.xz * 3.7 + vec2(uTime * 0.045, -uTime * 0.032);
  float micro = fbm(noiseUv);
  float fine = noise(vWorldPosition.xz * 18.0 + uTime * 0.18);
  float ripple = texture2D(uRippleTexture, vUv).r;
  float rippleLeft = texture2D(uRippleTexture, vUv - vec2(uRippleTexel.x, 0.0)).r;
  float rippleRight = texture2D(uRippleTexture, vUv + vec2(uRippleTexel.x, 0.0)).r;
  float rippleBottom = texture2D(uRippleTexture, vUv - vec2(0.0, uRippleTexel.y)).r;
  float rippleTop = texture2D(uRippleTexture, vUv + vec2(0.0, uRippleTexel.y)).r;
  vec2 rippleGradient = vec2(rippleRight - rippleLeft, rippleTop - rippleBottom);
  vec3 rippleNormal = vec3(-rippleGradient.x, 0.0, -rippleGradient.y) * uRippleStrength * 1.35;
  vec3 normal = normalize(
    vNormal +
    rippleNormal +
    vec3((micro - 0.5) * 0.12, 0.0, (fine - 0.5) * 0.055)
  );
  float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), uFresnelPower);
  float rippleEnergy = clamp(abs(ripple) + abs(vRippleHeight), 0.0, 1.0);
  float foam = texture2D(uFoamTexture, vUv).r;
  float crestNoise = fbm(vWorldPosition.xz * 6.2 + vec2(uTime * 0.12, -uTime * 0.08));
  float crestMask = smoothstep(0.62, 1.0, vWaveMask + rippleEnergy * 0.42 + crestNoise * 0.22);
  float brokenCrest = crestMask * smoothstep(0.58, 0.95, crestNoise) * 0.32;
  float foamLayer = clamp(max(foam, brokenCrest) * uFoamStrength, 0.0, 1.0);
  float foamSoftness = mix(0.82, 1.08, smoothstep(0.92, 0.99, uFoamDecay));
  float shallow = clamp(vWaveMask + rippleEnergy * uRippleStrength * 0.48 + micro * 0.08, 0.0, 1.0);
  vec3 sunDirection = normalize(uSunDirection);
  vec3 halfVector = normalize(sunDirection + viewDirection);
  float sunFacing = max(dot(normal, sunDirection), 0.0);
  float sparkleNoise = smoothstep(0.72, 1.0, noise(vWorldPosition.xz * 42.0 + uTime * 0.6));
  float sparkle =
    pow(max(dot(normal, halfVector), 0.0), 96.0) *
    sparkleNoise *
    sunFacing *
    (1.0 - underwaterMix * 0.72);
  float underside = (gl_FrontFacing ? 0.0 : 1.0) * underwaterMix;
  float undersideShimmer =
    (sin(vWorldPosition.x * 14.0 + uTime * 2.1) *
    sin(vWorldPosition.z * 11.0 - uTime * 1.6) * 0.5 + 0.5) *
    smoothstep(0.15, 1.0, underside);

  vec3 reflectionColor = vec3(1.0, 0.86, 0.58);
  vec3 color = mix(uDeepColor, uWaterColor, shallow);
  color = mix(color, reflectionColor, fresnel * uReflectionStrength);
  color += reflectionColor * sparkle * uReflectionStrength * 1.35;
  color += vec3(0.72, 0.95, 0.92) * rippleEnergy * uRippleStrength * 0.2;
  color += reflectionColor * sparkle * rippleEnergy * uRippleStrength * 0.65;

  float reflectionW =
    sign(vPlanarReflectionCoord.w) *
    max(abs(vPlanarReflectionCoord.w), 0.0001);
  vec3 projectedReflection = vPlanarReflectionCoord.xyz / reflectionW;
  vec2 planarDistortion =
    (normal.xz * 0.45 + rippleGradient * uRippleStrength * 0.35) *
    uPlanarReflectionDistortion *
    (1.0 - step(0.5, uPlanarReflectionDebugNoDistortion));
  vec2 planarReflectionUv = projectedReflection.xy + planarDistortion;
  float planarReflectionBounds =
    step(0.0, planarReflectionUv.x) *
    step(0.0, planarReflectionUv.y) *
    step(planarReflectionUv.x, 1.0) *
    step(planarReflectionUv.y, 1.0);
  float planarReflectionEdge =
    smoothstep(0.0, 0.045, planarReflectionUv.x) *
    smoothstep(0.0, 0.045, planarReflectionUv.y) *
    smoothstep(0.0, 0.045, 1.0 - planarReflectionUv.x) *
    smoothstep(0.0, 0.045, 1.0 - planarReflectionUv.y);
  vec3 planarReflectionColor =
    texture2D(uPlanarReflectionTexture, planarReflectionUv).rgb *
    uPlanarReflectionTint;
  float planarReflectionLuma = dot(planarReflectionColor, vec3(0.299, 0.587, 0.114));
  float planarObjectBoost = smoothstep(0.16, 0.62, 1.0 - planarReflectionLuma) * 0.82;
  float planarAngleWeight = mix(0.025, 0.78, smoothstep(0.02, 0.92, fresnel));
  float planarVisibility =
    (1.0 - underwaterMix) *
    planarReflectionBounds *
    mix(1.0, planarReflectionEdge, uPlanarReflectionFade) *
    max(planarAngleWeight, planarObjectBoost);
  float planarReflectionBlend = clamp(
    uPlanarReflectionEnabled *
    uPlanarReflectionStrength *
    planarVisibility,
    0.0,
    0.56
  );
  planarReflectionBlend = mix(
    planarReflectionBlend,
    (1.0 - underwaterMix) * planarReflectionBounds,
    step(0.5, uPlanarReflectionDebugFixedBlend)
  );
  color = mix(color, planarReflectionColor, planarReflectionBlend);

  color = mix(color, uFoamColor, clamp(foamLayer * foamSoftness * 1.18, 0.0, 1.0));
  color += uFoamColor * foamLayer * (0.12 + fresnel * 0.24);
  color = mix(color, color * vec3(0.82, 0.94, 1.02), smoothstep(-0.24, -0.02, vWaveHeight) * 0.38);
  color = mix(color, mix(uDeepColor, uUnderwaterColor, 0.72), underwaterMix * 0.56);
  color = mix(color, vec3(dot(color, vec3(0.299, 0.587, 0.114))), underwaterMix * 0.14);
  color += uUnderwaterColor * undersideShimmer * 0.22;
  color += vec3(0.55, 0.94, 0.82) * underside * fresnel * 0.18;
  color = mix(
    color,
    planarReflectionColor,
    step(0.5, uPlanarReflectionDebugFullStrength) *
      (1.0 - underwaterMix)
  );

  float alpha = clamp(
    uOpacity +
    fresnel * 0.14 +
    rippleEnergy * 0.08 +
    foamLayer * 0.28 * (1.0 - underwaterMix * 0.5) +
    underside * 0.16,
    0.0,
    1.0
  );
  gl_FragColor = vec4(color, alpha);
}
