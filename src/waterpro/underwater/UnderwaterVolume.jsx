"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { Color, DoubleSide, ShaderMaterial, Vector3 } from "three";
import fragmentShader from "./shaders/underwaterVolume.frag.glsl";
import vertexShader from "./shaders/underwaterVolume.vert.glsl";

function makeMaterial(controls) {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uUnderwaterBlend: { value: 0 },
      uCameraDepth: { value: 0 },
      uFogColor: { value: new Color(controls.fogColor) },
      uDeepColor: { value: new Color(controls.deepColor) },
      uFogDensity: { value: controls.fogDensity },
      uAbsorptionStrength: { value: controls.absorptionStrength },
      uOpacity: { value: controls.volumeOpacity },
      uNoiseScale: { value: controls.noiseScale },
      uNoiseSpeed: { value: controls.noiseSpeed },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: DoubleSide,
    toneMapped: false,
  });
}

export default function UnderwaterVolume({
  controls,
  underwaterStateRef,
  waterGroupRef,
  enabled = true,
}) {
  const { camera } = useThree();
  const meshRef = useRef(null);
  const material = useMemo(() => makeMaterial(controls), []);
  const helpers = useMemo(
    () => ({
      cameraWorld: new Vector3(),
      cameraLocal: new Vector3(),
    }),
    [],
  );

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    const waterGroup = waterGroupRef?.current;
    const state = underwaterStateRef.current;
    const blend = enabled && controls.enabled ? state.underwaterBlend : 0;
    const uniforms = material.uniforms;

    if (!mesh || !waterGroup) {
      return;
    }

    mesh.visible = blend > 0.01;

    if (!mesh.visible) {
      return;
    }

    camera.getWorldPosition(helpers.cameraWorld);
    helpers.cameraLocal.copy(helpers.cameraWorld);
    waterGroup.worldToLocal(helpers.cameraLocal);
    mesh.position.copy(helpers.cameraLocal);
    mesh.scale.setScalar(8);

    uniforms.uTime.value = controls.freezeUnderwaterTime ? 0 : clock.elapsedTime;
    uniforms.uUnderwaterBlend.value = blend;
    uniforms.uCameraDepth.value = Math.max(0, state.cameraWaterDepth);
    uniforms.uFogColor.value.set(controls.fogColor);
    uniforms.uDeepColor.value.set(controls.deepColor);
    uniforms.uFogDensity.value = controls.fogDensity;
    uniforms.uAbsorptionStrength.value = controls.absorptionStrength;
    uniforms.uOpacity.value = controls.volumeOpacity;
    uniforms.uNoiseScale.value = controls.noiseScale;
    uniforms.uNoiseSpeed.value = controls.noiseSpeed;
  });

  if (!enabled || !controls.enabled) {
    return null;
  }

  return (
    <mesh ref={meshRef} renderOrder={64} frustumCulled={false}>
      <sphereGeometry args={[1, 32, 16]} />
      <primitive attach="material" object={material} />
    </mesh>
  );
}
