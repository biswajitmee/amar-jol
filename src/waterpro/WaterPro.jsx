"use client";

import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import {
  Color,
  DataTexture,
  DoubleSide,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
  ShaderMaterial,
  Vector2,
  Vector3,
} from "three";
import UnderwaterFX from "./UnderwaterFX";
import {
  DEFAULT_WATER_PRO_PRESET,
  WATER_PRO_PRESETS,
  useWaterDebugPanel,
} from "./debug/WaterDebugPanel";
import FallingLeaf from "./objects/FallingLeaf";
import waterFragmentShader from "./shaders/waterPro.fragment.glsl";
import waterVertexShader from "./shaders/waterPro.vertex.glsl";
import { useRippleFBO } from "./sim/useRippleFBO";
import { useWaterSimulation } from "./sim/useWaterSimulation";

const defaultSettings = {
  preset: DEFAULT_WATER_PRO_PRESET,
  width: 4.2,
  depth: 2.35,
  waterSize: {
    x: 4.2,
    y: 1,
    z: 2.35,
  },
  segments: 96,
  fboSize: 128,
  waveStrength: 0.72,
  waveSpeed: 1,
  waveScale: 1,
  opacity: 0.58,
  rippleStrength: 0.55,
  rippleDamping: 0.985,
  rippleRadius: 0.16,
  rippleResolution: 128,
  foamStrength: 0.82,
  foamDecay: 0.965,
  foamColor: "#f4fbf1",
  fresnelPower: 2.6,
  reflectionStrength: 0.62,
  waterColor: "#66c5c1",
  deepColor: "#174e62",
  underwaterEnabled: true,
  underwaterColor: "#0b6f77",
  underwaterFogColor: "#0a5665",
  underwaterFogDensity: 0.055,
  underwaterTransitionDepth: 0.18,
  underwaterTransitionSpeed: 5.2,
  underwaterParticleCount: 120,
  underwaterParticleOpacity: 0.28,
  underwaterParticleColor: "#c8fff0",
  causticsStrength: 0.42,
  causticsDepth: 0.46,
  causticsColor: "#bfffea",
  sunDirection: [0.36, 0.78, 0.5],
  showDemoLeaves: true,
  showRippleTexture: false,
  showFoamTexture: false,
  showBuoyancySamplePoints: false,
  waves: [
    [1, 0.18, 0.082, 2.7, 0],
    [0.32, 1, 0.056, 1.85, 1.7],
    [-0.72, 0.56, 0.038, 1.16, 3.4],
    [-0.18, -1, 0.025, 0.72, 5.1],
  ],
  normalSampleStep: 0.045,
};

function makeEmptyTexture() {
  const texture = new DataTexture(new Uint8Array([0, 0, 0, 255]), 1, 1, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.needsUpdate = true;
  return texture;
}

function toVector3(value) {
  if (value instanceof Vector3) {
    return value.clone();
  }

  return new Vector3(value?.[0] ?? 0.36, value?.[1] ?? 0.78, value?.[2] ?? 0.5).normalize();
}

function toVectorArray(value, fallback = [0, 0, 0]) {
  const fallbackVector =
    fallback instanceof Vector3
      ? [fallback.x, fallback.y, fallback.z]
      : fallback;

  return [
    value?.x ?? value?.[0] ?? fallbackVector?.[0] ?? 0,
    value?.y ?? value?.[1] ?? fallbackVector?.[1] ?? 0,
    value?.z ?? value?.[2] ?? fallbackVector?.[2] ?? 0,
  ];
}

function normalizeWaterSize(value, defaults) {
  const width = value?.x ?? value?.[0] ?? defaults.width ?? 4.2;
  const vertical = value?.y ?? value?.[1] ?? 1;
  const depth = value?.z ?? value?.[2] ?? defaults.depth ?? 2.35;

  return {
    x: Math.max(0.05, width),
    y: Math.max(0.05, vertical),
    z: Math.max(0.05, depth),
  };
}

function WaterTextureDebugPreview({
  rippleTexture,
  foamTexture,
  showRippleTexture,
  showFoamTexture,
  emptyTexture,
  width,
  depth,
}) {
  const previewSize = Math.min(0.72, Math.max(0.38, width * 0.16));
  const previewGap = previewSize * 0.18;
  const visiblePreviews = [
    showRippleTexture
      ? {
          key: "ripple",
          texture: rippleTexture ?? emptyTexture,
        }
      : null,
    showFoamTexture
      ? {
          key: "foam",
          texture: foamTexture ?? emptyTexture,
        }
      : null,
  ].filter(Boolean);

  if (!visiblePreviews.length) {
    return null;
  }

  const totalWidth = visiblePreviews.length * previewSize + (visiblePreviews.length - 1) * previewGap;
  const startX = -totalWidth / 2 + previewSize / 2;

  return (
    <group position={[0, 0.07, -depth / 2 - previewSize * 0.68]}>
      {visiblePreviews.map((preview, index) => (
        <mesh
          key={preview.key}
          position={[startX + index * (previewSize + previewGap), 0, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          renderOrder={92}
          frustumCulled={false}
        >
          <planeGeometry args={[previewSize, previewSize, 1, 1]} />
          <meshBasicMaterial
            map={preview.texture}
            transparent
            opacity={0.94}
            depthTest={false}
            depthWrite={false}
            side={DoubleSide}
            toneMapped={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function WaterPro({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  debug = true,
  theatreSettings = null,
  usePanelTransform = true,
  onDebugSettingsChange,
  onUnderwaterChange,
  ...overrides
}) {
  const panelValues = useWaterDebugPanel(defaultSettings, { position, scale });
  const selectedPreset =
    theatreSettings?.preset ??
    (debug ? panelValues.preset : overrides.preset) ??
    defaultSettings.preset;
  const presetValues =
    WATER_PRO_PRESETS[selectedPreset] ?? WATER_PRO_PRESETS[DEFAULT_WATER_PRO_PRESET];
  const rawSettings = {
    ...defaultSettings,
    ...presetValues,
    ...(debug ? panelValues : {}),
    ...(theatreSettings ?? {}),
    ...overrides,
  };
  const waterSize = normalizeWaterSize(rawSettings.waterSize, rawSettings);
  const settings = {
    ...rawSettings,
    waterSize,
    width: waterSize.x,
    depth: waterSize.z,
    waveStrength: (rawSettings.waveStrength ?? defaultSettings.waveStrength) * waterSize.y,
  };
  const waterPosition =
    debug && usePanelTransform
      ? toVectorArray(panelValues.waterPosition, position)
      : position;
  const waterScale =
    debug && usePanelTransform ? panelValues.waterScale ?? scale : scale;

  const materialRef = useRef(null);
  const groupRef = useRef(null);
  const lastDebugSettingsKeyRef = useRef("");
  const emptyTexture = useMemo(() => makeEmptyTexture(), []);
  const simulation = useWaterSimulation(settings);
  const rippleFBO = useRippleFBO({
    simulation,
    width: settings.width,
    depth: settings.depth,
    size: settings.rippleResolution ?? settings.fboSize,
    damping: settings.rippleDamping,
    defaultRadius: settings.rippleRadius,
    foamDecay: settings.foamDecay,
    enabled: true,
  });

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uWaterColor: { value: new Color(settings.waterColor) },
      uDeepColor: { value: new Color(settings.deepColor) },
      uUnderwaterColor: { value: new Color(settings.underwaterColor) },
      uUnderwaterMix: { value: 0 },
      uWaveStrength: { value: settings.waveStrength },
      uWaveSpeed: { value: settings.waveSpeed },
      uWaveScale: { value: settings.waveScale },
      uSunDirection: { value: toVector3(settings.sunDirection) },
      uOpacity: { value: settings.opacity },
      uFresnelPower: { value: settings.fresnelPower },
      uReflectionStrength: { value: settings.reflectionStrength },
      uRippleStrength: { value: settings.rippleStrength },
      uRippleTexel: { value: new Vector2(1 / settings.rippleResolution, 1 / settings.rippleResolution) },
      uFoamColor: { value: new Color(settings.foamColor) },
      uFoamStrength: { value: settings.foamStrength },
      uFoamDecay: { value: settings.foamDecay },
      uRippleTexture: { value: emptyTexture },
      uFoamTexture: { value: emptyTexture },
    }),
    [emptyTexture],
  );

  const material = useMemo(
    () =>
      new ShaderMaterial({
        uniforms,
        vertexShader: waterVertexShader,
        fragmentShader: waterFragmentShader,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: DoubleSide,
        toneMapped: false,
      }),
    [uniforms],
  );

  useFrame(({ clock }) => {
    const time = clock.elapsedTime;
    const activeMaterial = materialRef.current ?? material;

    activeMaterial.uniforms.uTime.value = time;
    activeMaterial.uniforms.uWaterColor.value.set(settings.waterColor);
    activeMaterial.uniforms.uDeepColor.value.set(settings.deepColor);
    activeMaterial.uniforms.uUnderwaterColor.value.set(settings.underwaterColor);
    activeMaterial.uniforms.uWaveStrength.value = settings.waveStrength;
    activeMaterial.uniforms.uWaveSpeed.value = settings.waveSpeed;
    activeMaterial.uniforms.uWaveScale.value = settings.waveScale;
    activeMaterial.uniforms.uSunDirection.value.copy(toVector3(settings.sunDirection));
    activeMaterial.uniforms.uOpacity.value = settings.opacity;
    activeMaterial.uniforms.uFresnelPower.value = settings.fresnelPower;
    activeMaterial.uniforms.uReflectionStrength.value = settings.reflectionStrength;
    activeMaterial.uniforms.uRippleStrength.value = settings.rippleStrength;
    activeMaterial.uniforms.uRippleTexel.value.copy(rippleFBO.texelSize);
    activeMaterial.uniforms.uFoamColor.value.set(settings.foamColor);
    activeMaterial.uniforms.uFoamStrength.value = settings.foamStrength;
    activeMaterial.uniforms.uFoamDecay.value = settings.foamDecay;
    activeMaterial.uniforms.uRippleTexture.value = rippleFBO.rippleTexture ?? emptyTexture;
    activeMaterial.uniforms.uFoamTexture.value = rippleFBO.foamTexture ?? emptyTexture;
  });

  useEffect(() => {
    if (debug && onDebugSettingsChange) {
      const nextKey = JSON.stringify(panelValues);

      if (nextKey === lastDebugSettingsKeyRef.current) {
        return;
      }

      lastDebugSettingsKeyRef.current = nextKey;
      onDebugSettingsChange?.(panelValues);
    }
  }, [debug, onDebugSettingsChange, panelValues]);

  useEffect(() => {
    return () => {
      emptyTexture.dispose();
      material.dispose();
    };
  }, [emptyTexture, material]);

  return (
    <group ref={groupRef} position={waterPosition} rotation={rotation} scale={waterScale}>
      <mesh renderOrder={22} frustumCulled={false}>
        <planeGeometry args={[settings.width, settings.depth, settings.segments, settings.segments]} />
        <primitive
          ref={materialRef}
          attach="material"
          object={material}
        />
      </mesh>
      <WaterTextureDebugPreview
        rippleTexture={rippleFBO.rippleTexture}
        foamTexture={rippleFBO.foamTexture}
        showRippleTexture={settings.showRippleTexture}
        showFoamTexture={settings.showFoamTexture}
        emptyTexture={emptyTexture}
        width={settings.width}
        depth={settings.depth}
      />
      <UnderwaterFX
        waterGroupRef={groupRef}
        waterMaterialRef={materialRef}
        simulation={simulation}
        sampler={simulation.sampler}
        waterParams={settings}
        width={settings.width}
        depth={settings.depth}
        enabled={settings.underwaterEnabled}
        onUnderwaterChange={onUnderwaterChange}
      />

      {settings.showDemoLeaves ? (
        <>
          <FallingLeaf
            simulation={simulation}
            sampler={simulation.sampler}
            waterParams={settings}
            startPosition={[-0.86, 1.02, -0.24]}
            scale={0.92}
            fallSpeed={0.34}
            windStrength={0.065}
            buoyancy={1.05}
            sinkDelay={5.2}
            sinkSpeed={0.055}
            impactStrength={0.34}
            impactRadius={settings.rippleRadius}
            debug={settings.showBuoyancySamplePoints}
          />
          <FallingLeaf
            simulation={simulation}
            sampler={simulation.sampler}
            waterParams={settings}
            startPosition={[0.62, 1.28, 0.28]}
            scale={0.72}
            fallSpeed={0.3}
            windStrength={0.09}
            buoyancy={0.92}
            sinkDelay={6.4}
            sinkSpeed={0.045}
            impactStrength={0.27}
            impactRadius={settings.rippleRadius * 0.82}
            color="#c06f54"
            debug={settings.showBuoyancySamplePoints}
          />
        </>
      ) : null}
    </group>
  );
}
