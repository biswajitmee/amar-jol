"use client";

import { useFrame } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  ShaderMaterial,
} from "three";
import fragmentShader from "./shaders/underwaterCaustics.frag.glsl";
import vertexShader from "./shaders/underwaterCaustics.vert.glsl";

function makeMaterial(controls) {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new Color(controls.causticsColor) },
      uIntensity: { value: controls.causticsIntensity },
      uScale: { value: controls.causticsScale },
      uSpeed: { value: controls.causticsSpeed },
      uDistortion: { value: controls.causticsDistortion },
      uDepthFade: { value: controls.causticsDepthFade },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: AdditiveBlending,
    side: DoubleSide,
    toneMapped: false,
  });
}

export default function UnderwaterCaustics({
  reflectionRef,
  controls,
  underwaterStateRef,
  width,
  depth,
  enabled = true,
}) {
  const material = useMemo(() => makeMaterial(controls), []);
  const meshRef = useRef(null);
  const setMeshRef = useCallback(
    (node) => {
      meshRef.current = node;

      if (reflectionRef) {
        reflectionRef.current = node;
      }
    },
    [reflectionRef],
  );
  const causticsWidth = Math.max(width * 1.8, width + 3);
  const causticsDepth = Math.max(depth * 1.85, depth + 3);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    const uniforms = material.uniforms;

    if (!mesh) {
      return;
    }

    mesh.visible = Boolean(
      enabled &&
        controls.enabled &&
        controls.causticsEnabled &&
        !controls.hideCaustics,
    );

    if (!mesh.visible) {
      return;
    }

    const state = underwaterStateRef.current;
    const visibility = Math.max(0.42, state.underwaterBlend);

    uniforms.uTime.value = controls.freezeUnderwaterTime ? 0 : clock.elapsedTime;
    uniforms.uColor.value.set(controls.causticsColor);
    uniforms.uIntensity.value = controls.causticsIntensity * visibility;
    uniforms.uScale.value = controls.causticsScale;
    uniforms.uSpeed.value = controls.causticsSpeed;
    uniforms.uDistortion.value = controls.causticsDistortion;
    uniforms.uDepthFade.value = controls.causticsDepthFade;
  });

  if (!enabled || !controls.enabled || !controls.causticsEnabled || controls.hideCaustics) {
    return null;
  }

  return (
    <mesh
      ref={setMeshRef}
      position={[0, -0.92, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      renderOrder={10}
      frustumCulled={false}
    >
      <planeGeometry args={[causticsWidth, causticsDepth, 1, 1]} />
      <primitive attach="material" object={material} />
    </mesh>
  );
}
