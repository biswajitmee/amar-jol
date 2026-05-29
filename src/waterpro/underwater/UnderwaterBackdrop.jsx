"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, DoubleSide, ShaderMaterial, Vector3 } from "three";
import fragmentShader from "./shaders/underwaterBackdrop.frag.glsl";
import vertexShader from "./shaders/underwaterBackdrop.vert.glsl";

function makeMaterial(controls) {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBackdropHeight: { value: controls.backdropHeight },
      uShallowColor: { value: new Color(controls.shallowColor) },
      uMidDepthColor: { value: new Color(controls.midDepthColor) },
      uDeepColor: { value: new Color(controls.deepColor) },
      uDepthGradientStrength: { value: controls.depthGradientStrength },
      uDepthFogDensity: { value: controls.fogDensity },
      uHorizonLightColor: { value: new Color(controls.horizonLightColor) },
      uHorizonLightStrength: { value: controls.horizonLightStrength },
      uNoiseScale: { value: controls.noiseScale },
      uNoiseSpeed: { value: controls.noiseSpeed },
      uOpacity: { value: controls.overallOpacity },
      uAbsorptionStrength: { value: controls.absorptionStrength },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    toneMapped: false,
  });
}

export default function UnderwaterBackdrop({
  controls,
  underwaterStateRef,
  waterGroupRef,
  width,
  depth,
  enabled = true,
}) {
  const { camera } = useThree();
  const meshRef = useRef(null);
  const material = useMemo(() => makeMaterial(controls), []);
  const helpers = useMemo(
    () => ({
      cameraWorld: new Vector3(),
      cameraLocal: new Vector3(),
      edgeA: new Vector3(),
      edgeB: new Vector3(),
    }),
    [],
  );
  const backdropHeight = Math.max(2, controls.backdropHeight);
  const backdropWidth = Math.max(width * controls.backdropWidthMultiplier, width + 2);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    const waterGroup = waterGroupRef?.current;
    const uniforms = material.uniforms;

    if (!mesh || !waterGroup) {
      return;
    }

    mesh.visible = Boolean(enabled && controls.enabled);

    if (!mesh.visible) {
      return;
    }

    camera.getWorldPosition(helpers.cameraWorld);
    helpers.cameraLocal.copy(helpers.cameraWorld);
    waterGroup.worldToLocal(helpers.cameraLocal);

    helpers.edgeA.set(0, 0, depth * 0.5);
    helpers.edgeB.set(0, 0, -depth * 0.5);

    const edgeSign =
      helpers.edgeA.distanceToSquared(helpers.cameraLocal) <=
      helpers.edgeB.distanceToSquared(helpers.cameraLocal)
        ? 1
        : -1;
    const state = underwaterStateRef.current;
    const opacityBoost = controls.forceUnderwaterPreview
      ? 1
      : Math.max(0.86, 1 - state.underwaterBlend * 0.12);

    mesh.position.set(0, -backdropHeight * 0.5 + 0.035, edgeSign * (depth * 0.5 + 0.035));
    uniforms.uTime.value = controls.freezeUnderwaterTime ? 0 : clock.elapsedTime;
    uniforms.uBackdropHeight.value = backdropHeight;
    uniforms.uShallowColor.value.set(controls.shallowColor);
    uniforms.uMidDepthColor.value.set(controls.midDepthColor);
    uniforms.uDeepColor.value.set(controls.deepColor);
    uniforms.uDepthGradientStrength.value = controls.depthGradientStrength;
    uniforms.uDepthFogDensity.value = controls.fogDensity;
    uniforms.uHorizonLightColor.value.set(controls.horizonLightColor);
    uniforms.uHorizonLightStrength.value = controls.horizonLightStrength;
    uniforms.uNoiseScale.value = controls.noiseScale;
    uniforms.uNoiseSpeed.value = controls.noiseSpeed;
    uniforms.uOpacity.value = controls.overallOpacity * opacityBoost;
    uniforms.uAbsorptionStrength.value = controls.absorptionStrength;
  });

  if (!enabled || !controls.enabled) {
    return null;
  }

  return (
    <mesh ref={meshRef} renderOrder={6} frustumCulled={false}>
      <planeGeometry args={[backdropWidth, backdropHeight, 1, 56]} />
      <primitive attach="material" object={material} />
    </mesh>
  );
}
