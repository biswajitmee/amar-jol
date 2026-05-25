"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { folder, useControls } from "leva";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  ShaderMaterial,
  Vector3,
} from "three";
import { getDeploymentHeroLevaValue } from "../debug/deploymentLevaPresets";
import {
  pickPresetValues,
  registerHeroLevaPresetScope,
} from "../debug/heroLevaPresetRegistry";
import waterlineFragmentShader from "./waterlineEdge.frag.glsl";
import waterlineVertexShader from "./waterlineEdge.vert.glsl";

const WATERLINE_EDGE_PRESET_KEYS = [
  "enabled",
  "visualThickness",
  "worldThickness",
  "opacity",
  "blurSoftness",
  "edgeDarkColor",
  "edgeHighlightColor",
  "edgeDarkStrength",
  "edgeHighlightStrength",
  "positionOffset",
  "depthOffset",
  "followRipples",
  "debugEdgeBand",
];

const defaultControls = {
  enabled: true,
  visualThickness: 7,
  worldThickness: 0.08,
  opacity: 0.32,
  blurSoftness: 0.66,
  edgeDarkColor: "#062f38",
  edgeHighlightColor: "#f0d1a0",
  edgeDarkStrength: 0.58,
  edgeHighlightStrength: 0.14,
  positionOffset: 0.006,
  depthOffset: 0,
  followRipples: true,
  debugEdgeBand: false,
};

function getDeploymentWaterlineControls() {
  return Object.fromEntries(
    Object.entries(defaultControls).map(([key, fallback]) => [
      key,
      getDeploymentHeroLevaValue("waterlineEdge", key, fallback),
    ]),
  );
}

function createEdgeGeometry(width, segments) {
  const safeSegments = Math.max(8, Math.round(segments ?? 96));
  const positions = [];
  const uvs = [];
  const indices = [];

  for (let xIndex = 0; xIndex <= safeSegments; xIndex += 1) {
    const u = xIndex / safeSegments;
    const x = (u - 0.5) * width;

    positions.push(x, 0, 0, x, 1, 0);
    uvs.push(u, 0, u, 1);
  }

  for (let xIndex = 0; xIndex < safeSegments; xIndex += 1) {
    const a = xIndex * 2;
    const b = a + 1;
    const c = a + 2;
    const d = a + 3;

    indices.push(a, c, b, b, c, d);
  }

  const geometry = new BufferGeometry();
  const positionAttribute = new BufferAttribute(new Float32Array(positions), 3);

  positionAttribute.setUsage(DynamicDrawUsage);
  geometry.setAttribute("position", positionAttribute);
  geometry.setAttribute("uv", new BufferAttribute(new Float32Array(uvs), 2));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();

  return geometry;
}

function makeMaterial(rippleTexture) {
  return new ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uWaveStrength: { value: 1 },
      uWaveSpeed: { value: 1 },
      uWaveScale: { value: 1 },
      uRippleStrength: { value: 0 },
      uRippleTexture: { value: rippleTexture },
      uFollowRipples: { value: 1 },
      uWidth: { value: 1 },
      uDepth: { value: 1 },
      uEdgeSign: { value: 1 },
      uWorldThickness: { value: defaultControls.worldThickness },
      uPositionOffset: { value: defaultControls.positionOffset },
      uDepthOffset: { value: 0 },
      uOpacity: { value: defaultControls.opacity },
      uBlurSoftness: { value: defaultControls.blurSoftness },
      uEdgeDarkColor: { value: new Color(defaultControls.edgeDarkColor) },
      uEdgeHighlightColor: { value: new Color(defaultControls.edgeHighlightColor) },
      uEdgeDarkStrength: { value: defaultControls.edgeDarkStrength },
      uEdgeHighlightStrength: { value: defaultControls.edgeHighlightStrength },
      uDebugEdgeBand: { value: 0 },
    },
    vertexShader: waterlineVertexShader,
    fragmentShader: waterlineFragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    side: DoubleSide,
    toneMapped: false,
  });
}

function useWaterlineEdgeControls() {
  const [controls, setControls] = useControls(
    "Waterline Edge",
    () => ({
      enabled: {
        value: defaultControls.enabled,
        label: "Enabled",
      },
      Shape: folder(
        {
          visualThickness: {
            value: defaultControls.visualThickness,
            min: 2,
            max: 18,
            step: 0.1,
            label: "Visual px",
          },
          worldThickness: {
            value: defaultControls.worldThickness,
            min: 0.002,
            max: 0.22,
            step: 0.001,
            label: "World thickness",
          },
          positionOffset: {
            value: defaultControls.positionOffset,
            min: -0.05,
            max: 0.08,
            step: 0.001,
            label: "Position offset",
          },
          depthOffset: {
            value: defaultControls.depthOffset,
            min: -0.12,
            max: 0.12,
            step: 0.001,
            label: "Depth offset",
          },
          followRipples: {
            value: defaultControls.followRipples,
            label: "Follow ripples",
          },
        },
        { collapsed: false },
      ),
      Look: folder(
        {
          opacity: {
            value: defaultControls.opacity,
            min: 0,
            max: 1,
            step: 0.01,
            label: "Opacity",
          },
          blurSoftness: {
            value: defaultControls.blurSoftness,
            min: 0.05,
            max: 1,
            step: 0.01,
            label: "Blur softness",
          },
          edgeDarkColor: {
            value: defaultControls.edgeDarkColor,
            label: "Dark color",
          },
          edgeHighlightColor: {
            value: defaultControls.edgeHighlightColor,
            label: "Highlight color",
          },
          edgeDarkStrength: {
            value: defaultControls.edgeDarkStrength,
            min: 0,
            max: 1.5,
            step: 0.01,
            label: "Dark strength",
          },
          edgeHighlightStrength: {
            value: defaultControls.edgeHighlightStrength,
            min: 0,
            max: 1,
            step: 0.01,
            label: "Highlight strength",
          },
          debugEdgeBand: {
            value: defaultControls.debugEdgeBand,
            label: "Debug band",
          },
        },
        { collapsed: false },
      ),
    }),
    { collapsed: true, order: 5 },
    [],
  );
  const controlsRef = useRef(controls);

  controlsRef.current = controls;

  useEffect(() => {
    return registerHeroLevaPresetScope("waterlineEdge", {
      getValues: () =>
        pickPresetValues(controlsRef.current, WATERLINE_EDGE_PRESET_KEYS),
      applyValues: setControls,
    });
  }, [setControls]);

  return controls;
}

function setExternalRef(ref, value) {
  if (!ref) {
    return;
  }

  ref.current = value;
}

function WaterlineEdgeBandMesh({
  controls,
  edgeMeshRef,
  waterGroupRef,
  settings,
  rippleTexture,
  fallbackTexture,
}) {
  const { camera, size } = useThree();
  const meshRef = useRef(null);
  const helpers = useMemo(
    () => ({
      cameraWorld: new Vector3(),
      edgeA: new Vector3(),
      edgeB: new Vector3(),
      probeA: new Vector3(),
      probeB: new Vector3(),
      projectedA: new Vector3(),
      projectedB: new Vector3(),
    }),
    [],
  );
  const geometry = useMemo(
    () => createEdgeGeometry(settings.width, settings.segments),
    [settings.segments, settings.width],
  );
  const material = useMemo(
    () => makeMaterial(rippleTexture ?? fallbackTexture),
    [fallbackTexture, rippleTexture],
  );
  const setMeshRef = useCallback(
    (node) => {
      meshRef.current = node;
      setExternalRef(edgeMeshRef, node);
    },
    [edgeMeshRef],
  );

  useEffect(() => {
    return () => {
      setExternalRef(edgeMeshRef, null);
      geometry.dispose();
      material.dispose();
    };
  }, [edgeMeshRef, geometry, material]);

  useFrame(({ clock }) => {
    const mesh = meshRef.current;
    const waterGroup = waterGroupRef?.current;
    const uniforms = material.uniforms;

    if (!mesh || !waterGroup) {
      return;
    }

    mesh.visible = Boolean(controls.enabled);

    if (!mesh.visible) {
      return;
    }

    waterGroup.updateWorldMatrix(true, false);
    camera.updateMatrixWorld();
    camera.getWorldPosition(helpers.cameraWorld);

    helpers.edgeA
      .set(0, 0, settings.depth * 0.5)
      .applyMatrix4(waterGroup.matrixWorld);
    helpers.edgeB
      .set(0, 0, -settings.depth * 0.5)
      .applyMatrix4(waterGroup.matrixWorld);

    const edgeSign =
      helpers.edgeA.distanceToSquared(helpers.cameraWorld) <=
      helpers.edgeB.distanceToSquared(helpers.cameraWorld)
        ? 1
        : -1;
    const edgeCoord = edgeSign * (settings.depth * 0.5 + controls.depthOffset);
    const localProbe = 0.01;

    helpers.probeA
      .set(0, 0, edgeCoord)
      .applyMatrix4(waterGroup.matrixWorld)
      .project(camera);
    helpers.probeB
      .set(0, 0, edgeCoord + edgeSign * localProbe)
      .applyMatrix4(waterGroup.matrixWorld)
      .project(camera);

    const pixelDistance =
      Math.hypot(
        (helpers.probeB.x - helpers.probeA.x) * size.width * 0.5,
        (helpers.probeB.y - helpers.probeA.y) * size.height * 0.5,
      ) || 0;
    const localThicknessFromPixels =
      pixelDistance > 0.0001
        ? (controls.visualThickness * localProbe) / pixelDistance
        : controls.worldThickness;
    const effectiveThickness = Math.max(
      0.0005,
      Math.min(controls.worldThickness, localThicknessFromPixels),
    );

    uniforms.uTime.value = clock.elapsedTime;
    uniforms.uWaveStrength.value = settings.waveStrength;
    uniforms.uWaveSpeed.value = settings.waveSpeed;
    uniforms.uWaveScale.value = settings.waveScale;
    uniforms.uRippleStrength.value = settings.rippleStrength;
    uniforms.uRippleTexture.value = rippleTexture ?? fallbackTexture;
    uniforms.uFollowRipples.value = controls.followRipples ? 1 : 0;
    uniforms.uWidth.value = settings.width;
    uniforms.uDepth.value = settings.depth;
    uniforms.uEdgeSign.value = edgeSign;
    uniforms.uWorldThickness.value = effectiveThickness;
    uniforms.uPositionOffset.value = controls.positionOffset;
    uniforms.uDepthOffset.value = controls.depthOffset;
    uniforms.uOpacity.value = controls.opacity;
    uniforms.uBlurSoftness.value = controls.blurSoftness;
    uniforms.uEdgeDarkColor.value.set(controls.edgeDarkColor);
    uniforms.uEdgeHighlightColor.value.set(controls.edgeHighlightColor);
    uniforms.uEdgeDarkStrength.value = controls.edgeDarkStrength;
    uniforms.uEdgeHighlightStrength.value = controls.edgeHighlightStrength;
    uniforms.uDebugEdgeBand.value = controls.debugEdgeBand ? 1 : 0;
  });

  if (!controls.enabled) {
    return null;
  }

  return (
    <mesh ref={setMeshRef} renderOrder={24} frustumCulled={false}>
      <primitive attach="geometry" object={geometry} />
      <primitive attach="material" object={material} />
    </mesh>
  );
}

function WaterlineEdgeBandWithControls(props) {
  const controls = useWaterlineEdgeControls();

  return <WaterlineEdgeBandMesh {...props} controls={controls} />;
}

export default function WaterlineEdgeBand({ debug = true, ...props }) {
  if (!debug) {
    return (
      <WaterlineEdgeBandMesh
        {...props}
        controls={getDeploymentWaterlineControls()}
      />
    );
  }

  return <WaterlineEdgeBandWithControls {...props} />;
}
