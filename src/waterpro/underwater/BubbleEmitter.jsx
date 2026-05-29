"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  ShaderMaterial,
  Vector3,
} from "three";
import { getBubblePreviewBurstToken } from "./underwaterRuntimeStore";
import fragmentShader from "./shaders/bubble.frag.glsl";
import vertexShader from "./shaders/bubble.vert.glsl";

function seeded(index) {
  const x = Math.sin(index * 41.17 + 12.51) * 19341.117;
  return x - Math.floor(x);
}

function makeGeometry(controls) {
  const count = Math.max(1, Math.round(controls.bubbleCount));
  const positions = new Float32Array(count * 3);
  const seeds = new Float32Array(count);
  const delays = new Float32Array(count);

  for (let i = 0; i < count; i += 1) {
    const r0 = seeded(i + 1);
    const r1 = seeded(i + 5);
    const r2 = seeded(i + 9);
    const radius = Math.sqrt(r0) * 0.42;
    const angle = r1 * Math.PI * 2;

    positions[i * 3] = Math.cos(angle) * radius;
    positions[i * 3 + 1] = (r2 - 0.5) * 0.16;
    positions[i * 3 + 2] = Math.sin(angle) * radius * 0.54;
    seeds[i] = seeded(i + 17);
    delays[i] = seeded(i + 23) * 0.54;
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new BufferAttribute(positions, 3));
  geometry.setAttribute("aSeed", new BufferAttribute(seeds, 1));
  geometry.setAttribute("aDelay", new BufferAttribute(delays, 1));

  return geometry;
}

function makeMaterial(controls) {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uBurstStart: { value: -1000 },
      uSize: { value: controls.bubbleSize },
      uRiseSpeed: { value: controls.bubbleRiseSpeed },
      uWobble: { value: controls.bubbleWobble },
      uOpacity: { value: controls.bubbleOpacity },
      uColor: { value: new Color(controls.bubbleColor) },
      uEmitter: { value: new Vector3(0, -0.56, 0) },
    },
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    toneMapped: false,
  });
}

export default function BubbleEmitter({
  reflectionRef,
  controls,
  waterGroupRef,
  width,
  depth,
  enabled = true,
  previewBurstToken = 0,
}) {
  const { camera } = useThree();
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
  const burstStartTimeRef = useRef(-1000);
  const burstTokenRef = useRef(getBubblePreviewBurstToken());
  const previewBurstTokenRef = useRef(previewBurstToken);
  const pendingBurstRef = useRef(false);
  const geometry = useMemo(() => makeGeometry(controls), [controls.bubbleCount]);
  const material = useMemo(() => makeMaterial(controls), []);
  const helpers = useMemo(
    () => ({
      cameraWorld: new Vector3(),
      cameraLocal: new Vector3(),
      targetWorld: new Vector3(),
      targetLocal: new Vector3(),
      edgeA: new Vector3(),
      edgeB: new Vector3(),
    }),
    [],
  );

  useEffect(() => {
    const handlePreviewBurst = () => {
      pendingBurstRef.current = true;
    };

    window.addEventListener("waterpro:bubble-preview", handlePreviewBurst);

    return () => {
      window.removeEventListener("waterpro:bubble-preview", handlePreviewBurst);
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  useFrame(({ clock }) => {
    const points = pointsRef.current;
    const waterGroup = waterGroupRef?.current;
    const uniforms = material.uniforms;

    if (!points || !waterGroup) {
      return;
    }

    points.visible = Boolean(
      enabled &&
        controls.enabled &&
        controls.bubblesEnabled &&
        !controls.hideBubbles,
    );

    if (!points.visible) {
      return;
    }

    const nextToken = getBubblePreviewBurstToken();
    if (
      pendingBurstRef.current ||
      nextToken !== burstTokenRef.current ||
      previewBurstToken !== previewBurstTokenRef.current
    ) {
      pendingBurstRef.current = false;
      burstTokenRef.current = nextToken;
      previewBurstTokenRef.current = previewBurstToken;
      burstStartTimeRef.current = clock.elapsedTime;
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

    uniforms.uTime.value = controls.freezeUnderwaterTime ? 0 : clock.elapsedTime;
    uniforms.uBurstStart.value = burstStartTimeRef.current;
    uniforms.uSize.value = controls.bubbleSize;
    uniforms.uRiseSpeed.value = controls.bubbleRiseSpeed;
    uniforms.uWobble.value = controls.bubbleWobble;
    uniforms.uOpacity.value = controls.bubbleOpacity;
    uniforms.uColor.value.set(controls.bubbleColor);
    if (controls.forceUnderwaterPreview) {
      helpers.targetWorld.set(0, -1.22, -2.75).applyMatrix4(camera.matrixWorld);
      helpers.targetLocal.copy(helpers.targetWorld);
      waterGroup.worldToLocal(helpers.targetLocal);
      uniforms.uEmitter.value.copy(helpers.targetLocal);
    } else {
      uniforms.uEmitter.value.set(
        0,
        -0.58,
        edgeSign * Math.min(depth * 0.36, depth * 0.5 - 0.12),
      );
    }
  });

  if (!enabled || !controls.enabled || !controls.bubblesEnabled || controls.hideBubbles) {
    return null;
  }

  return (
    <points
      ref={setPointsRef}
      geometry={geometry}
      material={material}
      renderOrder={76}
      frustumCulled={false}
    />
  );
}
