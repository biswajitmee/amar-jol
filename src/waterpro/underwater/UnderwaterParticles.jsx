"use client";

import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
  Vector3,
} from "three";
import fragmentShader from "./shaders/underwaterParticles.frag.glsl";
import vertexShader from "./shaders/underwaterParticles.vert.glsl";

function seeded(index) {
  const x = Math.sin(index * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function makeGeometry(controls) {
  const count = Math.max(1, Math.round(controls.particleCount));
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const areaWidth = Math.max(0.2, controls.particleAreaWidth);
  const areaHeight = Math.max(0.2, controls.particleAreaHeight);
  const areaDepth = Math.max(0.2, controls.particleAreaDepth);

  for (let i = 0; i < count; i += 1) {
    const r0 = seeded(i + 1);
    const r1 = seeded(i + 7);
    const r2 = seeded(i + 13);
    const r3 = seeded(i + 19);

    positions[i * 3] = (r0 - 0.5) * areaWidth;
    positions[i * 3 + 1] = -0.12 - r1 * areaHeight;
    positions[i * 3 + 2] = (r2 - 0.5) * areaDepth;
    seeds[i] = r3;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));

  return geometry;
}

function makeMaterial(controls) {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Color("#d7fff6") },
      uSize: { value: controls.particleSize },
      uDriftSpeed: { value: controls.particleDriftSpeed },
      uDriftAmount: { value: controls.particleDriftAmount },
      uOpacity: { value: controls.particleOpacity },
      uUnderwaterBlend: { value: 0 },
      uCameraLocal: { value: new Vector3() },
      uNearFade: { value: controls.particleNearFade },
      uFarFade: { value: controls.particleFarFade },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    toneMapped: false,
  });
}

export default function UnderwaterParticles({
  reflectionRef,
  controls,
  underwaterStateRef,
  enabled = true,
}) {
  const pointsRef = useRef(null);
  const setPointsRef = useCallback(
    (node) => {
      pointsRef.current = node;

      if (reflectionRef) {
        reflectionRef.current = node;
      }
    },
    [reflectionRef],
  );
  const geometry = useMemo(
    () => makeGeometry(controls),
    [
      controls.particleAreaDepth,
      controls.particleAreaHeight,
      controls.particleAreaWidth,
      controls.particleCount,
    ],
  );
  const material = useMemo(() => makeMaterial(controls), []);

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(({ clock }) => {
    const points = pointsRef.current;
    const uniforms = material.uniforms;

    if (!points) {
      return;
    }

    points.visible = Boolean(
      enabled &&
        controls.enabled &&
        controls.particlesEnabled &&
        !controls.hideParticles,
    );

    if (!points.visible) {
      return;
    }

    const state = underwaterStateRef.current;
    const blend = Math.max(0.3, state.underwaterBlend);

    uniforms.uTime.value = controls.freezeUnderwaterTime ? 0 : clock.elapsedTime;
    uniforms.uColor.value.set("#d7fff6");
    uniforms.uSize.value = controls.particleSize;
    uniforms.uDriftSpeed.value = controls.particleDriftSpeed;
    uniforms.uDriftAmount.value = controls.particleDriftAmount;
    uniforms.uOpacity.value = controls.particleOpacity;
    uniforms.uUnderwaterBlend.value = blend;
    uniforms.uCameraLocal.value.copy(state.cameraLocal);
    uniforms.uNearFade.value = controls.particleNearFade;
    uniforms.uFarFade.value = controls.particleFarFade;
  });

  if (!enabled || !controls.enabled || !controls.particlesEnabled || controls.hideParticles) {
    return null;
  }

  return (
    <points ref={setPointsRef} geometry={geometry} renderOrder={18} frustumCulled={false}>
      <primitive attach="material" object={material} />
    </points>
  );
}
