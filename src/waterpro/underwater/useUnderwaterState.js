"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import { MathUtils, Vector3 } from "three";
import { sampleWaterHeight } from "../sim/buoyancy";

function isInsideWaterBounds(point, width, depth) {
  const margin = 0.35;

  return (
    Math.abs(point.x) <= width * 0.5 + margin &&
    Math.abs(point.z) <= depth * 0.5 + margin
  );
}

export default function useUnderwaterState({
  waterGroupRef,
  simulation,
  sampler,
  waterParams,
  width,
  depth,
  enabled = true,
  crossingBlendDistance = 0.34,
  forceUnderwaterPreview = false,
}) {
  const { camera } = useThree();
  const stateRef = useRef({
    isUnderwater: false,
    underwaterBlend: forceUnderwaterPreview ? 1 : 0,
    cameraWaterDepth: 0,
    waterHeightAtCamera: 0,
    insideWaterBounds: false,
    cameraLocal: new Vector3(),
    cameraWorld: new Vector3(),
  });
  const helpers = useMemo(
    () => ({
      cameraWorld: new Vector3(),
      cameraLocal: new Vector3(),
    }),
    [],
  );

  useFrame((state, delta) => {
    const waterGroup = waterGroupRef?.current;

    if (!waterGroup) {
      return;
    }

    camera.getWorldPosition(helpers.cameraWorld);
    helpers.cameraLocal.copy(helpers.cameraWorld);
    waterGroup.worldToLocal(helpers.cameraLocal);

    const time = simulation?.time ?? state.clock.elapsedTime;
    const waterHeightAtCamera = sampleWaterHeight({
      sampler,
      simulation,
      x: helpers.cameraLocal.x,
      z: helpers.cameraLocal.z,
      time,
      params: waterParams,
      includeRipples: true,
    });
    const cameraWaterDepth = waterHeightAtCamera - helpers.cameraLocal.y;
    const safeBlendDistance = Math.max(0.02, crossingBlendDistance);
    const insideWaterBounds = isInsideWaterBounds(helpers.cameraLocal, width, depth);
    const targetBlend =
      enabled && (forceUnderwaterPreview || insideWaterBounds)
        ? forceUnderwaterPreview
          ? 1
          : MathUtils.clamp(
              (cameraWaterDepth + safeBlendDistance * 0.5) / safeBlendDistance,
              0,
              1,
            )
        : 0;
    const nextBlend = MathUtils.damp(
      stateRef.current.underwaterBlend,
      targetBlend,
      5.2,
      delta,
    );

    stateRef.current.isUnderwater = nextBlend > 0.45;
    stateRef.current.underwaterBlend = nextBlend;
    stateRef.current.cameraWaterDepth = forceUnderwaterPreview
      ? Math.max(cameraWaterDepth, safeBlendDistance * 4)
      : cameraWaterDepth;
    stateRef.current.waterHeightAtCamera = waterHeightAtCamera;
    stateRef.current.insideWaterBounds = insideWaterBounds;
    stateRef.current.cameraLocal.copy(helpers.cameraLocal);
    stateRef.current.cameraWorld.copy(helpers.cameraWorld);
  });

  return stateRef;
}
