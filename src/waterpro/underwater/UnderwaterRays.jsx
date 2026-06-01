"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  AdditiveBlending,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  MathUtils,
  Object3D,
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
      uLightMargin: { value: controls.rayLightMargin },
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

const MAX_RAY_DENSITY = 96;
const RAY_RADIAL_SEGMENTS = 10;
const RAY_HEIGHT_SEGMENTS = 20;

function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return fallback;
  }

  return MathUtils.clamp(numeric, min, max);
}

function hash01(index, salt = 0) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;

  return value - Math.floor(value);
}

function makeInstanceAttributes() {
  const seeds = new Float32Array(MAX_RAY_DENSITY);
  const alphas = new Float32Array(MAX_RAY_DENSITY);

  for (let index = 0; index < MAX_RAY_DENSITY; index += 1) {
    seeds[index] = hash01(index, 4.2);
    alphas[index] = 0.62 + hash01(index, 9.7) * 0.38;
  }

  return { seeds, alphas };
}

function makeRayLayout(rayCount, controls, width, depth) {
  const margin = Math.max(0, controls.rayLightMargin ?? 0);
  const spread = Math.max(0.05, controls.raySpread ?? 1);
  const scale = Math.max(0.05, controls.rayScale ?? 1);
  const radiusX = Math.max(0.04, width * 0.5 * scale - margin);
  const radiusZ = Math.max(0.04, depth * 0.5 * scale - margin);
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));

  return Array.from({ length: rayCount }, (_, index) => {
    const normalized = (index + 0.5) / Math.max(1, rayCount);
    const radius = Math.sqrt(normalized);
    const angle = index * goldenAngle + hash01(index, 2.6) * 0.42;
    const jitter = 0.72 + hash01(index, 7.4) * 0.34;
    const x = Math.cos(angle) * radiusX * radius * spread * jitter;
    const z = Math.sin(angle) * radiusZ * radius * spread * jitter;
    const roll = (hash01(index, 5.2) - 0.5) * 0.28;
    const widthScale = 0.76 + hash01(index, 8.8) * 0.52;

    return { x, z, roll, widthScale };
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
  theatreTransform = null,
}) {
  const { camera } = useThree();
  const groupRef = useRef(null);
  const meshRef = useRef(null);
  const dummy = useMemo(() => new Object3D(), []);
  const material = useMemo(() => makeMaterial(controls), []);
  const instanceAttributes = useMemo(() => makeInstanceAttributes(), []);
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
  const rayCount = Math.round(
    clampNumber(controls.rayDensity, 18, 1, MAX_RAY_DENSITY),
  );
  const topRadius = clampNumber(controls.rayTopRadius, 0.035, 0.001, 2);
  const bottomRadius = clampNumber(controls.rayBottomRadius, 0.38, 0.01, 5);
  const rayLayout = useMemo(
    () => makeRayLayout(rayCount, controls, width, depth),
    [
      controls.rayLightMargin,
      controls.rayScale,
      controls.raySpread,
      depth,
      rayCount,
      width,
    ],
  );
  const geometryKey = [
    rayLength.toFixed(3),
    topRadius.toFixed(3),
    bottomRadius.toFixed(3),
  ].join(":");

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  useEffect(() => {
    const mesh = meshRef.current;

    if (!mesh) {
      return;
    }

    mesh.count = rayCount;
    mesh.instanceMatrix.setUsage(DynamicDrawUsage);

    rayLayout.forEach((ray, index) => {
      dummy.position.set(ray.x, 0, ray.z);
      dummy.rotation.set(0, 0, ray.roll);
      dummy.scale.set(ray.widthScale, 1, ray.widthScale);
      dummy.updateMatrix();
      mesh.setMatrixAt(index, dummy.matrix);
    });

    mesh.instanceMatrix.needsUpdate = true;
  }, [dummy, geometryKey, rayCount, rayLayout]);

  useFrame(({ clock }) => {
    const group = groupRef.current;
    const mesh = meshRef.current;
    const waterGroup = waterGroupRef?.current;
    const uniforms = material.uniforms;

    if (!group || !mesh || !waterGroup) {
      return;
    }

    group.visible = Boolean(
      enabled &&
        controls.enabled &&
        controls.raysEnabled &&
        !controls.hideRays,
    );

    if (!group.visible) {
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

    if (theatreTransform?.position) {
      group.position.set(
        theatreTransform.position[0],
        theatreTransform.position[1],
        theatreTransform.position[2],
      );
    } else {
      group.position.set(
        controls.rayOriginX,
        controls.rayOriginY,
        edgeSign * (depth * 0.5 + 0.06) + controls.rayOriginZ,
      );
    }

    if (theatreTransform?.rotation) {
      group.rotation.set(
        theatreTransform.rotation[0],
        theatreTransform.rotation[1],
        theatreTransform.rotation[2],
      );
    } else {
      group.rotation.set(
        0,
        0,
        Math.atan2(controls.rayDirectionX, Math.abs(controls.rayDirectionY)) *
          0.32,
      );
    }

    mesh.position.set(0, -rayLength * 0.5, 0);
    mesh.rotation.set(0, 0, 0);

    uniforms.uTime.value = controls.freezeUnderwaterTime ? 0 : clock.elapsedTime;
    uniforms.uRayLength.value = rayLength;
    uniforms.uColor.value.set(controls.rayColor);
    uniforms.uIntensity.value = controls.rayIntensity * waterVisibility;
    uniforms.uOpacity.value = controls.rayOpacity;
    uniforms.uSpread.value = controls.raySpread;
    uniforms.uSpeed.value = controls.raySpeed;
    uniforms.uDepthFade.value = controls.rayDepthFade;
    uniforms.uLightMargin.value = controls.rayLightMargin ?? 0;
  });

  if (!enabled || !controls.enabled || !controls.raysEnabled || controls.hideRays) {
    return null;
  }

  return (
    <group ref={groupRef} name="WaterPro.UnderwaterGodRays">
      <instancedMesh
        ref={setMeshRef}
        args={[null, null, MAX_RAY_DENSITY]}
        renderOrder={12}
        frustumCulled={false}
      >
        <cylinderGeometry
          key={geometryKey}
          args={[
            topRadius,
            bottomRadius,
            rayLength,
            RAY_RADIAL_SEGMENTS,
            RAY_HEIGHT_SEGMENTS,
            true,
          ]}
        >
          <instancedBufferAttribute
            attach="attributes-aRaySeed"
            args={[instanceAttributes.seeds, 1]}
          />
          <instancedBufferAttribute
            attach="attributes-aRayAlpha"
            args={[instanceAttributes.alphas, 1]}
          />
        </cylinderGeometry>
        <primitive attach="material" object={material} />
      </instancedMesh>
    </group>
  );
}
