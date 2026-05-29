"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  ShaderMaterial,
  Vector3,
} from "three";
import fragmentShader from "./shaders/underwaterRays.frag.glsl";
import vertexShader from "./shaders/underwaterRays.vert.glsl";

function makeMaterial(controls) {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uRayLength: { value: controls.rayLength },
      uColor: { value: new Color(controls.rayColor) },
      uIntensity: { value: controls.rayIntensity },
      uOpacity: { value: controls.rayOpacity },
      uSpread: { value: controls.raySpread },
      uSpeed: { value: controls.raySpeed },
      uDepthFade: { value: controls.rayDepthFade },
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

export default function UnderwaterRays({
  reflectionRef,
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
  const setMeshRef = useCallback(
    (node) => {
      meshRef.current = node;

      if (reflectionRef) {
        reflectionRef.current = node;
      }
    },
    [reflectionRef],
  );
  const helpers = useMemo(
    () => ({
      cameraWorld: new Vector3(),
      cameraLocal: new Vector3(),
      edgeA: new Vector3(),
      edgeB: new Vector3(),
    }),
    [],
  );
  const rayLength = Math.max(1, controls.rayLength);
  const rayWidth = Math.max(width * 1.7 * controls.rayScale, width + 1.5);

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

    mesh.visible = Boolean(
      enabled &&
        controls.enabled &&
        controls.raysEnabled &&
        !controls.hideRays,
    );

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
    const waterVisibility = Math.max(0.52, state.underwaterBlend);

    mesh.position.set(
      controls.rayOriginX,
      -rayLength * 0.5 + controls.rayOriginY,
      edgeSign * (depth * 0.5 + 0.06) + controls.rayOriginZ,
    );
    mesh.rotation.z = Math.atan2(controls.rayDirectionX, Math.abs(controls.rayDirectionY)) * 0.32;

    uniforms.uTime.value = controls.freezeUnderwaterTime ? 0 : clock.elapsedTime;
    uniforms.uRayLength.value = rayLength;
    uniforms.uColor.value.set(controls.rayColor);
    uniforms.uIntensity.value = controls.rayIntensity * waterVisibility;
    uniforms.uOpacity.value = controls.rayOpacity;
    uniforms.uSpread.value = controls.raySpread;
    uniforms.uSpeed.value = controls.raySpeed;
    uniforms.uDepthFade.value = controls.rayDepthFade;
  });

  if (!enabled || !controls.enabled || !controls.raysEnabled || controls.hideRays) {
    return null;
  }

  return (
    <mesh ref={setMeshRef} renderOrder={12} frustumCulled={false}>
      <planeGeometry args={[rayWidth, rayLength, 1, 48]} />
      <primitive attach="material" object={material} />
    </mesh>
  );
}
