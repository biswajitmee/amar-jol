"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { button, folder, useControls } from "leva";
import { useCallback, useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import {
  getDeploymentHeroLevaValue,
  isProductionDeployment,
} from "@/src/waterpro/debug/deploymentLevaPresets";
import {
  pickPresetValues,
  registerHeroLevaPresetScope,
} from "@/src/waterpro/debug/heroLevaPresetRegistry";

const CURSOR_FLUID_SCOPE = "cursorFluidHover";
const CURSOR_FLUID_PRESET_API = "/api/hero-leva-presets";
const CURSOR_FLUID_LAST_PRESET_NAME = "cursor-fluid-last";
const CURSOR_FLUID_PRESET_KEYS = [
  "enabled",
  "radius",
  "brushSize",
  "decay",
  "trailFadeSeconds",
  "inactiveFadeRate",
  "distortion",
  "glow",
  "trailStrength",
  "ringIntensity",
  "smokeOpacity",
  "followSmooth",
  "velocityBoost",
  "colorPink",
  "colorPurple",
] as const;

type CursorFluidValues = {
  enabled: boolean;
  radius: number;
  brushSize: number;
  decay: number;
  trailFadeSeconds: number;
  inactiveFadeRate: number;
  distortion: number;
  glow: number;
  trailStrength: number;
  ringIntensity: number;
  smokeOpacity: number;
  followSmooth: number;
  velocityBoost: number;
  colorPink: string;
  colorPurple: string;
};

const DEFAULT_VALUES: CursorFluidValues = {
  enabled: true,
  radius: 0.22,
  brushSize: 0.045,
  decay: 0.94,
  trailFadeSeconds: 0.18,
  inactiveFadeRate: 8,
  distortion: 0.025,
  glow: 1.8,
  trailStrength: 1.2,
  ringIntensity: 1.5,
  smokeOpacity: 0.55,
  followSmooth: 0.12,
  velocityBoost: 2.5,
  colorPink: "#ff8bd4",
  colorPurple: "#9b6cff",
};

function getDefaultValue<K extends keyof CursorFluidValues>(
  key: K,
): CursorFluidValues[K] {
  return getDeploymentHeroLevaValue(
    CURSOR_FLUID_SCOPE,
    key,
    DEFAULT_VALUES[key],
  );
}

function getDeploymentValues(): CursorFluidValues {
  return {
    enabled: getDefaultValue("enabled"),
    radius: getDefaultValue("radius"),
    brushSize: getDefaultValue("brushSize"),
    decay: getDefaultValue("decay"),
    trailFadeSeconds: getDefaultValue("trailFadeSeconds"),
    inactiveFadeRate: getDefaultValue("inactiveFadeRate"),
    distortion: getDefaultValue("distortion"),
    glow: getDefaultValue("glow"),
    trailStrength: getDefaultValue("trailStrength"),
    ringIntensity: getDefaultValue("ringIntensity"),
    smokeOpacity: getDefaultValue("smokeOpacity"),
    followSmooth: getDefaultValue("followSmooth"),
    velocityBoost: getDefaultValue("velocityBoost"),
    colorPink: getDefaultValue("colorPink"),
    colorPurple: getDefaultValue("colorPurple"),
  };
}

const fullscreenVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const trailFragmentShader = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTrail;
uniform vec2 uCursor;
uniform vec2 uPrevCursor;
uniform vec2 uResolution;
uniform float uActive;
uniform float uDecay;
uniform float uBrushSize;
uniform float uTrailStrength;
uniform float uVelocity;
uniform float uVelocityBoost;
uniform float uTime;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a;
  vec2 ba = b - a;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 0.00001), 0.0, 1.0);
  return length(pa - ba * h);
}

void main() {
  vec4 trail = texture2D(uTrail, vUv) * uDecay;
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 p = vUv * aspect;
  vec2 c = uCursor * aspect;
  vec2 pc = uPrevCursor * aspect;
  float lineDist = sdSegment(p, pc, c);
  float speedBoost = 1.0 + clamp(uVelocity * uVelocityBoost, 0.0, 4.0);
  float brush = max(0.001, uBrushSize);
  float impulse = smoothstep(brush * 1.8, 0.0, lineDist);
  float organic = 0.74 + 0.26 * noise(vUv * 28.0 + vec2(uTime * 0.18, -uTime * 0.12));
  impulse *= organic * uTrailStrength * speedBoost * uActive;
  float nextTrail = clamp(trail.r + impulse, 0.0, 1.0);
  gl_FragColor = vec4(nextTrail, nextTrail, nextTrail, 1.0);
}
`;

const compositeFragmentShader = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uTrail;
uniform vec2 uCursor;
uniform vec2 uPrevCursor;
uniform vec2 uResolution;
uniform float uTime;
uniform float uActive;
uniform float uRadius;
uniform float uDistortion;
uniform float uGlow;
uniform float uRingIntensity;
uniform float uSmokeOpacity;
uniform vec3 uColorPink;
uniform vec3 uColorPurple;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p *= 2.04;
    a *= 0.5;
  }
  return v;
}

void main() {
  vec2 aspect = vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
  vec2 toCursor = (vUv - uCursor) * aspect;
  float dist = length(toCursor);
  float radius = max(0.001, uRadius);
  float bubble = 1.0 - smoothstep(radius * 0.18, radius, dist);
  float rim = smoothstep(radius, radius * 0.72, dist) * smoothstep(radius * 0.54, radius * 0.92, dist);
  float trail = texture2D(uTrail, vUv).r;
  float n = fbm(vUv * 10.0 + vec2(uTime * 0.075, -uTime * 0.05));
  float smoke = trail * (0.62 + 0.38 * n);

  vec2 dir = normalize(toCursor + vec2(0.0001));
  vec2 chroma = dir / aspect * (bubble * uDistortion * 0.35);
  vec2 trailWarp = vec2(
    texture2D(uTrail, vUv + vec2(0.006, 0.0)).r - texture2D(uTrail, vUv - vec2(0.006, 0.0)).r,
    texture2D(uTrail, vUv + vec2(0.0, 0.006)).r - texture2D(uTrail, vUv - vec2(0.0, 0.006)).r
  );
  vec2 refractUv = vUv - dir / aspect * (bubble * uDistortion) - trailWarp * uDistortion * 1.8;
  vec3 sceneCol = texture2D(uScene, refractUv).rgb;
  sceneCol.r = texture2D(uScene, refractUv + chroma).r;
  sceneCol.b = texture2D(uScene, refractUv - chroma).b;

  vec3 fluidColor = mix(uColorPurple, uColorPink, 0.45 + 0.55 * n);
  float glowMask = clamp((bubble * 0.55 + smoke * uSmokeOpacity + rim * uRingIntensity) * uActive, 0.0, 2.5);
  vec3 glow = fluidColor * glowMask * uGlow;
  float glass = bubble * 0.09 * uActive;
  vec3 lifted = mix(sceneCol, sceneCol + fluidColor * 0.16, glass);

  gl_FragColor = vec4(lifted + glow, 1.0);
}
`;

function makeRenderTarget(
  width: number,
  height: number,
  options: { depthBuffer?: boolean } = {},
) {
  const target = new THREE.WebGLRenderTarget(width, height, {
    depthBuffer: options.depthBuffer ?? false,
    stencilBuffer: false,
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
    type: THREE.UnsignedByteType,
    format: THREE.RGBAFormat,
  });
  target.texture.name = "CursorFluidEffectTarget";

  return target;
}

function CursorFluidScene({ values }: { values: CursorFluidValues }) {
  const { gl, scene, camera, size } = useThree();
  const dpr = gl.getPixelRatio();
  const renderWidth = Math.max(1, Math.floor(size.width * dpr));
  const renderHeight = Math.max(1, Math.floor(size.height * dpr));
  const valuesRef = useRef(values);
  const pointerRef = useRef({
    active: 0,
    isTouching: false,
    hasPointer: false,
    cursor: new THREE.Vector2(0.5, 0.5),
    smooth: new THREE.Vector2(0.5, 0.5),
    previous: new THREE.Vector2(0.5, 0.5),
    velocity: new THREE.Vector2(0, 0),
  });

  valuesRef.current = values;

  const sceneTarget = useMemo(
    () => makeRenderTarget(renderWidth, renderHeight, { depthBuffer: true }),
    [renderHeight, renderWidth],
  );
  const trailA = useMemo(
    () => makeRenderTarget(Math.max(1, Math.floor(renderWidth * 0.35)), Math.max(1, Math.floor(renderHeight * 0.35))),
    [renderHeight, renderWidth],
  );
  const trailB = useMemo(
    () => makeRenderTarget(Math.max(1, Math.floor(renderWidth * 0.35)), Math.max(1, Math.floor(renderHeight * 0.35))),
    [renderHeight, renderWidth],
  );
  const trailTargetsRef = useRef({ read: trailA, write: trailB });

  useEffect(() => {
    trailTargetsRef.current = { read: trailA, write: trailB };
  }, [trailA, trailB]);

  const passResources = useMemo(() => {
    const passCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const passScene = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry(2, 2);
    const trailMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertexShader,
      fragmentShader: trailFragmentShader,
      uniforms: {
        uTrail: { value: trailA.texture },
        uCursor: { value: new THREE.Vector2(0.5, 0.5) },
        uPrevCursor: { value: new THREE.Vector2(0.5, 0.5) },
        uResolution: { value: new THREE.Vector2(renderWidth, renderHeight) },
        uActive: { value: 0 },
        uDecay: { value: DEFAULT_VALUES.decay },
        uBrushSize: { value: DEFAULT_VALUES.brushSize },
        uTrailStrength: { value: DEFAULT_VALUES.trailStrength },
        uVelocity: { value: 0 },
        uVelocityBoost: { value: DEFAULT_VALUES.velocityBoost },
        uTime: { value: 0 },
      },
      depthTest: false,
      depthWrite: false,
    });
    const compositeMaterial = new THREE.ShaderMaterial({
      vertexShader: fullscreenVertexShader,
      fragmentShader: compositeFragmentShader,
      uniforms: {
        uScene: { value: sceneTarget.texture },
        uTrail: { value: trailA.texture },
        uCursor: { value: new THREE.Vector2(0.5, 0.5) },
        uPrevCursor: { value: new THREE.Vector2(0.5, 0.5) },
        uResolution: { value: new THREE.Vector2(renderWidth, renderHeight) },
        uTime: { value: 0 },
        uActive: { value: 0 },
        uRadius: { value: DEFAULT_VALUES.radius },
        uDistortion: { value: DEFAULT_VALUES.distortion },
        uGlow: { value: DEFAULT_VALUES.glow },
        uRingIntensity: { value: DEFAULT_VALUES.ringIntensity },
        uSmokeOpacity: { value: DEFAULT_VALUES.smokeOpacity },
        uColorPink: { value: new THREE.Color(DEFAULT_VALUES.colorPink) },
        uColorPurple: { value: new THREE.Color(DEFAULT_VALUES.colorPurple) },
      },
      depthTest: false,
      depthWrite: false,
    });
    const quad = new THREE.Mesh(geometry, compositeMaterial);
    passScene.add(quad);

    return {
      passCamera,
      passScene,
      quad,
      geometry,
      trailMaterial,
      compositeMaterial,
    };
  }, [renderHeight, renderWidth, sceneTarget.texture, trailA.texture]);

  useEffect(() => {
    return () => {
      sceneTarget.dispose();
      trailA.dispose();
      trailB.dispose();
    };
  }, [sceneTarget, trailA, trailB]);

  useEffect(() => {
    return () => {
      passResources.geometry.dispose();
      passResources.trailMaterial.dispose();
      passResources.compositeMaterial.dispose();
    };
  }, [passResources]);

  useEffect(() => {
    const canvas = gl.domElement;
    const pointer = pointerRef.current;

    const setPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = (event.clientX - rect.left) / Math.max(rect.width, 1);
      const y = 1 - (event.clientY - rect.top) / Math.max(rect.height, 1);
      const insideCanvas = x >= 0 && x <= 1 && y >= 0 && y <= 1;

      if (!insideCanvas) {
        pointer.hasPointer = false;
        pointer.isTouching = false;
        return;
      }

      pointer.cursor.set(
        THREE.MathUtils.clamp(x, 0, 1),
        THREE.MathUtils.clamp(y, 0, 1),
      );
      pointer.hasPointer = true;
      pointer.isTouching = event.pointerType === "touch" ? event.buttons > 0 : false;
      if (event.pointerType !== "touch" || pointer.isTouching) {
        pointer.active = 1;
      }
    };

    const handlePointerMove = (event: PointerEvent) => setPointer(event);
    const handlePointerDown = (event: PointerEvent) => {
      setPointer(event);
      pointer.isTouching = event.pointerType === "touch";
      pointer.active = 1;
    };
    const handlePointerUp = () => {
      pointer.isTouching = false;
    };
    const handlePointerLeave = () => {
      pointer.isTouching = false;
      pointer.hasPointer = false;
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerdown", handlePointerDown, { passive: true });
    window.addEventListener("pointerup", handlePointerUp, { passive: true });
    window.addEventListener("pointercancel", handlePointerUp, { passive: true });
    window.addEventListener("blur", handlePointerLeave);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("pointerup", handlePointerUp);
      window.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("blur", handlePointerLeave);
    };
  }, [gl.domElement]);

  useFrame((state, delta) => {
    const currentValues = valuesRef.current;
    const pointer = pointerRef.current;
    const safeDelta = Math.min(delta, 0.05);
    const isTouchDevice =
      typeof navigator !== "undefined" &&
      (navigator.maxTouchPoints > 0 || window.matchMedia("(pointer: coarse)").matches);
    const shouldStayActive =
      pointer.hasPointer && (!isTouchDevice || pointer.isTouching);
    const fadeRate = shouldStayActive ? 10 : currentValues.inactiveFadeRate;
    pointer.active = THREE.MathUtils.damp(
      pointer.active,
      shouldStayActive ? 1 : 0,
      fadeRate,
      safeDelta,
    );
    pointer.previous.copy(pointer.smooth);
    pointer.smooth.lerp(
      pointer.cursor,
      THREE.MathUtils.clamp(currentValues.followSmooth, 0.01, 1),
    );
    pointer.velocity.copy(pointer.smooth).sub(pointer.previous);
    const velocity = pointer.velocity.length() / Math.max(safeDelta, 0.001);

    const oldAutoClear = gl.autoClear;
    const oldClearColor = new THREE.Color();
    gl.getClearColor(oldClearColor);
    const oldClearAlpha = gl.getClearAlpha();

    gl.autoClear = true;
    gl.setRenderTarget(sceneTarget);
    gl.clear();
    gl.render(scene, camera);

    const { read, write } = trailTargetsRef.current;
    passResources.quad.material = passResources.trailMaterial;
    passResources.trailMaterial.uniforms.uTrail.value = read.texture;
    passResources.trailMaterial.uniforms.uCursor.value.copy(pointer.smooth);
    passResources.trailMaterial.uniforms.uPrevCursor.value.copy(pointer.previous);
    passResources.trailMaterial.uniforms.uResolution.value.set(renderWidth, renderHeight);
    passResources.trailMaterial.uniforms.uActive.value =
      currentValues.enabled ? pointer.active : 0;
    const trailLifetimeDecay = Math.exp(
      -safeDelta / Math.max(currentValues.trailFadeSeconds, 0.03),
    );
    passResources.trailMaterial.uniforms.uDecay.value =
      currentValues.decay ** (safeDelta * 60) * trailLifetimeDecay;
    passResources.trailMaterial.uniforms.uBrushSize.value = currentValues.brushSize;
    passResources.trailMaterial.uniforms.uTrailStrength.value = currentValues.trailStrength;
    passResources.trailMaterial.uniforms.uVelocity.value = velocity;
    passResources.trailMaterial.uniforms.uVelocityBoost.value = currentValues.velocityBoost;
    passResources.trailMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    gl.setRenderTarget(write);
    gl.clear();
    gl.render(passResources.passScene, passResources.passCamera);
    trailTargetsRef.current = { read: write, write: read };

    passResources.quad.material = passResources.compositeMaterial;
    passResources.compositeMaterial.uniforms.uScene.value = sceneTarget.texture;
    passResources.compositeMaterial.uniforms.uTrail.value = write.texture;
    passResources.compositeMaterial.uniforms.uCursor.value.copy(pointer.smooth);
    passResources.compositeMaterial.uniforms.uPrevCursor.value.copy(pointer.previous);
    passResources.compositeMaterial.uniforms.uResolution.value.set(renderWidth, renderHeight);
    passResources.compositeMaterial.uniforms.uTime.value = state.clock.elapsedTime;
    passResources.compositeMaterial.uniforms.uActive.value =
      currentValues.enabled ? pointer.active : 0;
    passResources.compositeMaterial.uniforms.uRadius.value = currentValues.radius;
    passResources.compositeMaterial.uniforms.uDistortion.value = currentValues.distortion;
    passResources.compositeMaterial.uniforms.uGlow.value = currentValues.glow;
    passResources.compositeMaterial.uniforms.uRingIntensity.value = currentValues.ringIntensity;
    passResources.compositeMaterial.uniforms.uSmokeOpacity.value = currentValues.smokeOpacity;
    passResources.compositeMaterial.uniforms.uColorPink.value.set(currentValues.colorPink);
    passResources.compositeMaterial.uniforms.uColorPurple.value.set(currentValues.colorPurple);
    gl.setRenderTarget(null);
    gl.clear();
    gl.render(passResources.passScene, passResources.passCamera);

    gl.autoClear = oldAutoClear;
    gl.setClearColor(oldClearColor, oldClearAlpha);
  }, 1);

  return null;
}

function CursorFluidControls() {
  const valuesRef = useRef<CursorFluidValues>(DEFAULT_VALUES);
  const setRef = useRef<((values: Partial<CursorFluidValues>) => void) | null>(
    null,
  );

  const setPresetStatus = useCallback((message: string) => {
    setRef.current?.({ presetStatus: message } as Partial<CursorFluidValues>);
  }, []);

  const saveCursorPreset = useCallback(async () => {
    try {
      setPresetStatus("Saving cursor preset...");
      const response = await fetch(CURSOR_FLUID_PRESET_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: CURSOR_FLUID_LAST_PRESET_NAME,
          values: {
            [CURSOR_FLUID_SCOPE]: pickPresetValues(
              valuesRef.current,
              CURSOR_FLUID_PRESET_KEYS,
            ),
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Save failed with ${response.status}`);
      }

      setPresetStatus("Saved cursor-fluid-last");
    } catch (error) {
      setPresetStatus(error instanceof Error ? error.message : "Save failed");
    }
  }, [setPresetStatus]);

  const loadCursorPreset = useCallback(async () => {
    try {
      setPresetStatus("Loading cursor preset...");
      const response = await fetch(CURSOR_FLUID_PRESET_API);

      if (!response.ok) {
        throw new Error(`Load failed with ${response.status}`);
      }

      const data = await response.json();
      const savedValues =
        data?.presets?.[CURSOR_FLUID_LAST_PRESET_NAME]?.[CURSOR_FLUID_SCOPE];

      if (!savedValues) {
        setPresetStatus("No saved cursor preset yet");
        return;
      }

      setRef.current?.({
        ...savedValues,
        presetStatus: "Loaded cursor-fluid-last",
      });
    } catch (error) {
      setPresetStatus(error instanceof Error ? error.message : "Load failed");
    }
  }, [setPresetStatus]);

  const [values, setValues] = useControls(
    "Cursor Fluid Hover",
    () => ({
      Preset: folder(
        {
          saveCursorPreset: button(saveCursorPreset),
          loadCursorPreset: button(loadCursorPreset),
          presetStatus: {
            value: "Ready",
            label: "Status",
            editable: false,
          },
        },
        { collapsed: false },
      ),
      Effect: folder(
        {
          enabled: { value: DEFAULT_VALUES.enabled, label: "Enabled" },
          radius: {
            value: DEFAULT_VALUES.radius,
            min: 0.0001,
            max: 0.5,
            step: 0.001,
            label: "Radius",
          },
          brushSize: {
            value: DEFAULT_VALUES.brushSize,
            min: 0.0001,
            max: 0.14,
            step: 0.001,
            label: "Brush size",
          },
          decay: {
            value: DEFAULT_VALUES.decay,
            min: 0.88,
            max: 0.995,
            step: 0.001,
            label: "Decay",
          },
          trailFadeSeconds: {
            value: DEFAULT_VALUES.trailFadeSeconds,
            min: 0.03,
            max: 1.2,
            step: 0.01,
            label: "Trail fade seconds",
          },
          inactiveFadeRate: {
            value: DEFAULT_VALUES.inactiveFadeRate,
            min: 1,
            max: 20,
            step: 0.1,
            label: "Inactive fade rate",
          },
          distortion: {
            value: DEFAULT_VALUES.distortion,
            min: 0,
            max: 0.08,
            step: 0.001,
            label: "Distortion",
          },
          glow: {
            value: DEFAULT_VALUES.glow,
            min: 0,
            max: 5,
            step: 0.01,
            label: "Glow",
          },
          trailStrength: {
            value: DEFAULT_VALUES.trailStrength,
            min: 0,
            max: 4,
            step: 0.01,
            label: "Trail strength",
          },
          ringIntensity: {
            value: DEFAULT_VALUES.ringIntensity,
            min: 0,
            max: 5,
            step: 0.01,
            label: "Ring intensity",
          },
          smokeOpacity: {
            value: DEFAULT_VALUES.smokeOpacity,
            min: 0,
            max: 2,
            step: 0.01,
            label: "Smoke opacity",
          },
          followSmooth: {
            value: DEFAULT_VALUES.followSmooth,
            min: 0.02,
            max: 5.0,
            step: 0.001,
            label: "Follow smooth",
          },
          velocityBoost: {
            value: DEFAULT_VALUES.velocityBoost,
            min: 0,
            max: 8,
            step: 0.01,
            label: "Velocity boost",
          },
          colorPink: {
            value: DEFAULT_VALUES.colorPink,
            label: "Pink",
          },
          colorPurple: {
            value: DEFAULT_VALUES.colorPurple,
            label: "Purple",
          },
        },
        { collapsed: false },
      ),
    }),
    { collapsed: true, order: 6 },
    [loadCursorPreset, saveCursorPreset],
  ) as unknown as [
    CursorFluidValues,
    (values: Partial<CursorFluidValues>) => void,
  ];
  valuesRef.current = values;
  setRef.current = setValues;

  useEffect(() => {
    return registerHeroLevaPresetScope(CURSOR_FLUID_SCOPE, {
      getValues: () =>
        pickPresetValues(valuesRef.current, CURSOR_FLUID_PRESET_KEYS),
      applyValues: setValues as (values: Record<string, unknown>) => void,
    });
  }, [setValues]);

  return <CursorFluidScene values={values} />;
}

export default function CursorFluidEffect() {
  if (isProductionDeployment()) {
    return <CursorFluidScene values={getDeploymentValues()} />;
  }

  return <CursorFluidControls />;
}
