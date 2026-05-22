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
import { WATER_PRO_PRESETS, useWaterDebugPanel } from "./debug/WaterDebugPanel";
import FallingLeaf from "./objects/FallingLeaf";
import waterFragmentShader from "./shaders/waterPro.fragment.glsl";
import waterVertexShader from "./shaders/waterPro.vertex.glsl";
import { useRippleFBO } from "./sim/useRippleFBO";
import { useWaterSimulation } from "./sim/useWaterSimulation";

const defaultSettings = {
  width: 4.2,
  depth: 2.35,
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

export default function WaterPro({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  debug = true,
  onUnderwaterChange,
  ...overrides
}) {
  const panelValues = useWaterDebugPanel(defaultSettings);
  const presetValues = WATER_PRO_PRESETS[panelValues.preset] ?? WATER_PRO_PRESETS.softHero;
  const settings = {
    ...defaultSettings,
    ...presetValues,
    ...(debug ? panelValues : {}),
    ...overrides,
  };

  const materialRef = useRef(null);
  const groupRef = useRef(null);
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
    return () => {
      emptyTexture.dispose();
      material.dispose();
    };
  }, [emptyTexture, material]);

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={scale}>
      <mesh renderOrder={22} frustumCulled={false}>
        <planeGeometry args={[settings.width, settings.depth, settings.segments, settings.segments]} />
        <primitive
          ref={materialRef}
          attach="material"
          object={material}
        />
      </mesh>
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
          />
        </>
      ) : null}
    </group>
  );
}
