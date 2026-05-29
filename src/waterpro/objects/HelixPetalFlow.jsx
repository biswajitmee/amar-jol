"use client";

import { useFrame, useLoader } from "@react-three/fiber";
import { useControls } from "leva";
import { useEffect, useMemo, useRef } from "react";
import {
  BufferGeometry,
  DynamicDrawUsage,
  Euler,
  MathUtils,
  Matrix4,
  Mesh,
  Quaternion,
  Vector3,
} from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { HERO_PETAL_MODEL_URL } from "./PetalRain";
import {
  getDeploymentHeroLevaValue,
  isProductionDeployment,
} from "../debug/deploymentLevaPresets";
import {
  pickPresetValues,
  registerHeroLevaPresetScope,
} from "../debug/heroLevaPresetRegistry";

const MAX_SEGMENTS = 56;
const MAX_PETALS_PER_SEGMENT = 7;
const MAX_GARLAND_PETALS = MAX_SEGMENTS * MAX_PETALS_PER_SEGMENT;
const CURVE_SEGMENTS = 180;
const PI2 = Math.PI * 2;
const UP = new Vector3(0, 1, 0);

const defaultHelixPetalFlowSettings = {
  visible: true,
  segmentCount: 48,
  petalsPerSegment: 5,
  radius: 0.72,
  height: 1.94,
  turns: 2.42,
  depthScale: 0.52,
  startAngle: 28,
  tiltX: -4,
  tiltY: 0,
  tiltZ: 5,
  curveOffsetX: 0,
  curveOffsetY: -0.18,
  curveOffsetZ: 0,
  speed: 0.04,
  direction: "Forward",
  flowOffset: 0,
  floatAmount: 0.008,
  floatSpeed: 0.5,
  rotationSpeed: 0.08,
  flutterAmount: 0.026,
  rotationTurns: 1.08,
  baseRotationX: -4,
  baseRotationY: 0,
  baseRotationZ: 5,
  layerRotationX: 4.5,
  layerRotationZ: 8,
  layerTwist: 0.09,
  petalScale: 0.033,
  scaleVariation: 0.34,
  garlandThickness: 0.118,
  garlandDepthScale: 0.78,
  segmentJitter: 0.36,
  radialVariation: 0.42,
  bendVariation: 0.18,
  rotationVariation: 16,
  spinVariation: 0.48,
  driftVariation: 0.34,
  individualSpinSpeed: 0.32,
  individualFloatAmount: 0.011,
  individualFloatSpeed: 0.74,
  frontCleanliness: 0.58,
  opacity: 1,
  showCurve: false,
};
const HELIX_PETAL_FLOW_PRESET_KEYS = Object.keys(
  defaultHelixPetalFlowSettings,
);

function wrap01(value) {
  return ((value % 1) + 1) % 1;
}

function seededUnit(index, salt) {
  const value =
    Math.sin((index + 1) * 12.9898 + (salt + 1) * 78.233) * 43758.5453;

  return value - Math.floor(value);
}

function seededSigned(index, salt) {
  return (seededUnit(index, salt) - 0.5) * 2;
}

function makePetalVariation(index) {
  const spinDirection = seededSigned(index, 6) >= 0 ? 1 : -1;

  return {
    radialAngle: seededUnit(index, 1) * PI2,
    radialDistance: 0.42 + seededUnit(index, 2) * 0.58,
    segmentSeed: seededSigned(index, 3),
    scaleSeed: seededSigned(index, 4),
    rotationSeedX: seededSigned(index, 5),
    rotationSeedY: seededSigned(index, 6),
    rotationSeedZ: seededSigned(index, 7),
    spinDirection,
    spinSpeedSeed: seededUnit(index, 8),
    bendSeedX: seededSigned(index, 9),
    bendSeedY: seededSigned(index, 10),
    bendSeedZ: seededSigned(index, 11),
    driftSeed: seededSigned(index, 12),
    driftPhase: seededUnit(index, 13) * PI2,
    flutterPhase: seededSigned(index, 14) * 0.18,
  };
}

function endpointFade(progress) {
  const fadeIn = MathUtils.smoothstep(progress, 0.018, 0.08);
  const fadeOut = 1 - MathUtils.smoothstep(progress, 0.92, 0.99);

  return MathUtils.clamp(fadeIn * fadeOut, 0, 1);
}

function isMesh(object) {
  return object instanceof Mesh || object?.isMesh === true;
}

function cloneMaterial(material) {
  if (Array.isArray(material)) {
    return cloneMaterial(material[0]);
  }

  const clone = material?.clone?.() ?? material;

  if (clone) {
    clone.needsUpdate = true;
  }

  return clone;
}

function findPetalMesh(sourceScene) {
  let namedPetal = null;
  let largestMesh = null;
  let largestVertexCount = 0;

  sourceScene.traverse((child) => {
    if (!isMesh(child)) {
      return;
    }

    const vertexCount = child.geometry?.attributes?.position?.count ?? 0;

    if (child.name === "FlowerPetalHero") {
      namedPetal = child;
    }

    if (vertexCount > largestVertexCount) {
      largestMesh = child;
      largestVertexCount = vertexCount;
    }
  });

  return namedPetal ?? largestMesh;
}

function usePetalInstancedAsset(gltf) {
  const asset = useMemo(() => {
    const petalMesh = findPetalMesh(gltf.scene);

    if (!petalMesh?.geometry) {
      return null;
    }

    const material = cloneMaterial(petalMesh.material);

    if (material) {
      material.transparent = material.transparent || material.opacity < 1;
      material.needsUpdate = true;
    }

    return {
      geometry: petalMesh.geometry,
      material,
    };
  }, [gltf.scene]);

  useEffect(() => {
    return () => {
      asset?.material?.dispose?.();
    };
  }, [asset]);

  return asset;
}

function sanitizeSettings(values) {
  return {
    visible: Boolean(values.visible),
    segmentCount: MathUtils.clamp(
      Math.round(values.segmentCount),
      1,
      MAX_SEGMENTS,
    ),
    petalsPerSegment: MathUtils.clamp(
      Math.round(values.petalsPerSegment),
      1,
      MAX_PETALS_PER_SEGMENT,
    ),
    radius: Math.max(0.05, values.radius),
    height: Math.max(0.1, values.height),
    turns: Math.max(0.1, values.turns),
    depthScale: Math.max(0.05, values.depthScale),
    startAngle: values.startAngle,
    tiltX: values.tiltX,
    tiltY: values.tiltY,
    tiltZ: values.tiltZ,
    curveOffsetX: values.curveOffsetX,
    curveOffsetY: values.curveOffsetY,
    curveOffsetZ: values.curveOffsetZ,
    speed: Math.max(0, values.speed),
    direction: values.direction === "Reverse" ? "Reverse" : "Forward",
    flowOffset: values.flowOffset,
    floatAmount: Math.max(0, values.floatAmount),
    floatSpeed: Math.max(0, values.floatSpeed),
    rotationSpeed: Math.max(0, values.rotationSpeed),
    flutterAmount: Math.max(0, values.flutterAmount),
    rotationTurns: Math.max(0, values.rotationTurns),
    baseRotationX: values.baseRotationX,
    baseRotationY: values.baseRotationY,
    baseRotationZ: values.baseRotationZ,
    layerRotationX: values.layerRotationX,
    layerRotationZ: values.layerRotationZ,
    layerTwist: MathUtils.clamp(values.layerTwist, -1.5, 1.5),
    petalScale: Math.max(0.005, values.petalScale),
    scaleVariation: MathUtils.clamp(values.scaleVariation, 0, 0.95),
    garlandThickness: Math.max(0, values.garlandThickness),
    garlandDepthScale: MathUtils.clamp(values.garlandDepthScale, 0.1, 2),
    segmentJitter: MathUtils.clamp(values.segmentJitter, 0, 1),
    radialVariation: MathUtils.clamp(values.radialVariation, 0, 1.5),
    bendVariation: MathUtils.clamp(values.bendVariation, 0, 1),
    rotationVariation: Math.max(0, values.rotationVariation),
    spinVariation: MathUtils.clamp(values.spinVariation, 0, 1.5),
    driftVariation: MathUtils.clamp(values.driftVariation, 0, 1.5),
    individualSpinSpeed: Math.max(0, values.individualSpinSpeed),
    individualFloatAmount: Math.max(0, values.individualFloatAmount),
    individualFloatSpeed: Math.max(0, values.individualFloatSpeed),
    frontCleanliness: MathUtils.clamp(values.frontCleanliness, 0, 1),
    opacity: MathUtils.clamp(values.opacity, 0, 1),
    showCurve: Boolean(values.showCurve),
  };
}

function getDeploymentHelixPetalFlowSettings() {
  return Object.fromEntries(
    Object.entries(defaultHelixPetalFlowSettings).map(([key, fallback]) => [
      key,
      getDeploymentHeroLevaValue("helixPetalFlow", key, fallback),
    ]),
  );
}

function writeHelixPoint(progress, settings, target, tiltEuler) {
  const p = MathUtils.clamp(progress, 0, 1);
  const radius = settings.radius;
  const depthRadius = radius * settings.depthScale;
  const startAngle = MathUtils.degToRad(settings.startAngle);
  const angle = p * settings.turns * PI2 + startAngle;
  const ribbonBend = Math.sin((p - 0.5) * Math.PI) * radius * 0.08;
  const diagonalLean = (p - 0.5) * radius * 0.07;
  let x =
    Math.cos(angle) * radius +
    diagonalLean +
    Math.cos(startAngle + 0.72) * ribbonBend;
  let z =
    Math.sin(angle) * depthRadius +
    Math.sin(startAngle + 0.72) * ribbonBend * settings.depthScale * 0.68;
  const y =
    (p - 0.5) * settings.height +
    Math.sin(p * Math.PI) * settings.height * 0.035;

  const centerClear =
    1 - MathUtils.smoothstep(Math.abs(x), radius * 0.1, radius * 0.48);
  const frontClear =
    MathUtils.smoothstep(z, depthRadius * -0.02, depthRadius * 0.42) *
    centerClear;

  if (frontClear > 0) {
    const sideSign = Math.sin(angle) >= 0 ? -1 : 1;
    const lowerFrontClear = 1 - MathUtils.smoothstep(p, 0.22, 0.46);
    x += sideSign * radius * (0.42 + lowerFrontClear * 0.18) * frontClear;
    z -= depthRadius * (0.28 + lowerFrontClear * 0.22) * frontClear;
  }

  target.set(x, y, z);
  target.applyEuler(tiltEuler);
  target.x += settings.curveOffsetX;
  target.y += settings.curveOffsetY;
  target.z += settings.curveOffsetZ;

  return target;
}

function applyMaterialOpacity(material, opacity) {
  if (!material) {
    return;
  }

  if (opacity < 0.999 || material.transparent || material.opacity < 1) {
    material.transparent = true;
    material.opacity = opacity;
    material.needsUpdate = true;
  }
}

function useHelixPetalFlowControls() {
  const [values, setValues] = useControls(
    "Helix Petal Flow",
    () => ({
      visible: {
        value: defaultHelixPetalFlowSettings.visible,
        label: "visible",
      },
      segmentCount: {
        value: defaultHelixPetalFlowSettings.segmentCount,
        min: 1,
        max: MAX_SEGMENTS,
        step: 1,
        label: "segmentCount",
      },
      petalsPerSegment: {
        value: defaultHelixPetalFlowSettings.petalsPerSegment,
        min: 1,
        max: MAX_PETALS_PER_SEGMENT,
        step: 1,
        label: "petalsPerSegment",
      },
      radius: {
        value: defaultHelixPetalFlowSettings.radius,
        min: 0.1,
        max: 50,
        step: 0.01,
        label: "radius",
      },
      height: {
        value: defaultHelixPetalFlowSettings.height,
        min: 0.2,
        max: 20,
        step: 0.01,
        label: "height",
      },
      turns: {
        value: defaultHelixPetalFlowSettings.turns,
        min: 0.25,
        max: 4,
        step: 0.01,
        label: "turns",
      },
      depthScale: {
        value: defaultHelixPetalFlowSettings.depthScale,
        min: 0.1,
        max: 5,
        step: 0.01,
        label: "depthScale",
      },
      startAngle: {
        value: defaultHelixPetalFlowSettings.startAngle,
        min: -360,
        max: 360,
        step: 1,
        label: "startAngle",
      },
      tiltX: {
        value: defaultHelixPetalFlowSettings.tiltX,
        min: -90,
        max: 90,
        step: 0.5,
        label: "tiltX",
      },
      tiltY: {
        value: defaultHelixPetalFlowSettings.tiltY,
        min: -90,
        max: 90,
        step: 0.5,
        label: "tiltY",
      },
      tiltZ: {
        value: defaultHelixPetalFlowSettings.tiltZ,
        min: -90,
        max: 90,
        step: 0.5,
        label: "tiltZ",
      },
      curveOffsetX: {
        value: defaultHelixPetalFlowSettings.curveOffsetX,
        min: -3,
        max: 3,
        step: 0.01,
        label: "curveOffsetX",
      },
      curveOffsetY: {
        value: defaultHelixPetalFlowSettings.curveOffsetY,
        min: -3,
        max: 3,
        step: 0.01,
        label: "curveOffsetY",
      },
      curveOffsetZ: {
        value: defaultHelixPetalFlowSettings.curveOffsetZ,
        min: -3,
        max: 3,
        step: 0.01,
        label: "curveOffsetZ",
      },
      speed: {
        value: defaultHelixPetalFlowSettings.speed,
        min: 0,
        max: 0.22,
        step: 0.001,
        label: "speed",
      },
      direction: {
        value: defaultHelixPetalFlowSettings.direction,
        options: ["Forward", "Reverse"],
        label: "direction",
      },
      flowOffset: {
        value: defaultHelixPetalFlowSettings.flowOffset,
        min: -1,
        max: 1,
        step: 0.001,
        label: "flowOffset",
      },
      floatAmount: {
        value: defaultHelixPetalFlowSettings.floatAmount,
        min: 0,
        max: 0.45,
        step: 0.005,
        label: "floatAmount",
      },
      floatSpeed: {
        value: defaultHelixPetalFlowSettings.floatSpeed,
        min: 0,
        max: 3,
        step: 0.01,
        label: "floatSpeed",
      },
      rotationSpeed: {
        value: defaultHelixPetalFlowSettings.rotationSpeed,
        min: 0,
        max: 1.5,
        step: 0.01,
        label: "rotationSpeed",
      },
      flutterAmount: {
        value: defaultHelixPetalFlowSettings.flutterAmount,
        min: 0,
        max: 0.5,
        step: 0.01,
        label: "flutterAmount",
      },
      rotationTurns: {
        value: defaultHelixPetalFlowSettings.rotationTurns,
        min: 0,
        max: 4,
        step: 0.01,
        label: "rotationTurns",
      },
      baseRotationX: {
        value: defaultHelixPetalFlowSettings.baseRotationX,
        min: -180,
        max: 180,
        step: 0.5,
        label: "baseRotationX",
      },
      baseRotationY: {
        value: defaultHelixPetalFlowSettings.baseRotationY,
        min: -180,
        max: 180,
        step: 0.5,
        label: "baseRotationY",
      },
      baseRotationZ: {
        value: defaultHelixPetalFlowSettings.baseRotationZ,
        min: -180,
        max: 180,
        step: 0.5,
        label: "baseRotationZ",
      },
      layerRotationX: {
        value: defaultHelixPetalFlowSettings.layerRotationX,
        min: -60,
        max: 60,
        step: 0.5,
        label: "layerRotationX",
      },
      layerRotationZ: {
        value: defaultHelixPetalFlowSettings.layerRotationZ,
        min: -80,
        max: 80,
        step: 0.5,
        label: "layerRotationZ",
      },
      layerTwist: {
        value: defaultHelixPetalFlowSettings.layerTwist,
        min: -1.5,
        max: 1.5,
        step: 0.01,
        label: "layerTwist",
      },
      petalScale: {
        value: defaultHelixPetalFlowSettings.petalScale,
        min: 0.005,
        max: 3.3,
        step: 0.001,
        label: "petalScale",
      },
      scaleVariation: {
        value: defaultHelixPetalFlowSettings.scaleVariation,
        min: 0,
        max: 0.95,
        step: 0.01,
        label: "scaleVariation",
      },
      garlandThickness: {
        value: defaultHelixPetalFlowSettings.garlandThickness,
        min: 0,
        max: 0.32,
        step: 0.001,
        label: "garlandThickness",
      },
      garlandDepthScale: {
        value: defaultHelixPetalFlowSettings.garlandDepthScale,
        min: 0.1,
        max: 2,
        step: 0.01,
        label: "garlandDepthScale",
      },
      segmentJitter: {
        value: defaultHelixPetalFlowSettings.segmentJitter,
        min: 0,
        max: 1,
        step: 0.01,
        label: "segmentJitter",
      },
      radialVariation: {
        value: defaultHelixPetalFlowSettings.radialVariation,
        min: 0,
        max: 1.5,
        step: 0.01,
        label: "radialVariation",
      },
      bendVariation: {
        value: defaultHelixPetalFlowSettings.bendVariation,
        min: 0,
        max: 0.6,
        step: 0.01,
        label: "bendVariation",
      },
      rotationVariation: {
        value: defaultHelixPetalFlowSettings.rotationVariation,
        min: 0,
        max: 45,
        step: 0.5,
        label: "rotationVariation",
      },
      spinVariation: {
        value: defaultHelixPetalFlowSettings.spinVariation,
        min: 0,
        max: 1.5,
        step: 0.01,
        label: "spinVariation",
      },
      driftVariation: {
        value: defaultHelixPetalFlowSettings.driftVariation,
        min: 0,
        max: 1.5,
        step: 0.01,
        label: "driftVariation",
      },
      individualSpinSpeed: {
        value: defaultHelixPetalFlowSettings.individualSpinSpeed,
        min: 0,
        max: 2,
        step: 0.01,
        label: "individualSpinSpeed",
      },
      individualFloatAmount: {
        value: defaultHelixPetalFlowSettings.individualFloatAmount,
        min: 0,
        max: 0.12,
        step: 0.001,
        label: "individualFloatAmount",
      },
      individualFloatSpeed: {
        value: defaultHelixPetalFlowSettings.individualFloatSpeed,
        min: 0,
        max: 3,
        step: 0.01,
        label: "individualFloatSpeed",
      },
      frontCleanliness: {
        value: defaultHelixPetalFlowSettings.frontCleanliness,
        min: 0,
        max: 1,
        step: 0.01,
        label: "frontCleanliness",
      },
      opacity: {
        value: defaultHelixPetalFlowSettings.opacity,
        min: 0,
        max: 1,
        step: 0.01,
        label: "opacity",
      },
      showCurve: {
        value: defaultHelixPetalFlowSettings.showCurve,
        label: "showCurve",
      },
    }),
    { collapsed: false, order: 3 },
    [],
  );
  const valuesRef = useRef(values);
  valuesRef.current = values;

  useEffect(() => {
    return registerHeroLevaPresetScope("helixPetalFlow", {
      getValues: () =>
        pickPresetValues(valuesRef.current, HELIX_PETAL_FLOW_PRESET_KEYS),
      applyValues: setValues,
    });
  }, [setValues]);

  if (isProductionDeployment()) {
    return sanitizeSettings(getDeploymentHelixPetalFlowSettings());
  }

  return sanitizeSettings(values);
}

function DebugHelixCurve({ settings }) {
  const geometry = useMemo(() => {
    const tiltEuler = new Euler(
      MathUtils.degToRad(settings.tiltX),
      MathUtils.degToRad(settings.tiltY),
      MathUtils.degToRad(settings.tiltZ),
      "XYZ",
    );
    const point = new Vector3();
    const points = [];

    for (let index = 0; index <= CURVE_SEGMENTS; index += 1) {
      writeHelixPoint(index / CURVE_SEGMENTS, settings, point, tiltEuler);
      points.push(point.clone());
    }

    return new BufferGeometry().setFromPoints(points);
  }, [
    settings.curveOffsetX,
    settings.curveOffsetY,
    settings.curveOffsetZ,
    settings.depthScale,
    settings.height,
    settings.radius,
    settings.startAngle,
    settings.tiltX,
    settings.tiltY,
    settings.tiltZ,
    settings.turns,
  ]);

  useEffect(() => {
    return () => {
      geometry.dispose();
    };
  }, [geometry]);

  return (
    <line
      geometry={geometry}
      visible={settings.showCurve}
      renderOrder={92}
      frustumCulled={false}
    >
      <lineBasicMaterial
        color="#fff5d7"
        transparent
        opacity={0.58}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </line>
  );
}

export default function HelixPetalFlow() {
  const gltf = useLoader(GLTFLoader, HERO_PETAL_MODEL_URL);
  const asset = usePetalInstancedAsset(gltf);
  const settings = useHelixPetalFlowControls();
  const settingsRef = useRef(settings);
  const meshRef = useRef(null);
  const tiltEulerRef = useRef(new Euler());
  const layerEulerRef = useRef(new Euler());
  const spinEulerRef = useRef(new Euler());
  const centerRef = useRef(new Vector3());
  const nextPointRef = useRef(new Vector3());
  const pointRef = useRef(new Vector3());
  const tangentRef = useRef(new Vector3());
  const normalRef = useRef(new Vector3());
  const binormalRef = useRef(new Vector3());
  const lookTargetRef = useRef(new Vector3());
  const scaleRef = useRef(new Vector3());
  const matrixRef = useRef(new Matrix4());
  const targetQuatRef = useRef(new Quaternion());
  const layerQuatRef = useRef(new Quaternion());
  const spinQuatRef = useRef(new Quaternion());
  const variations = useMemo(
    () =>
      Array.from({ length: MAX_GARLAND_PETALS }, (_, index) =>
        makePetalVariation(index),
      ),
    [],
  );

  settingsRef.current = settings;

  useEffect(() => {
    if (meshRef.current?.instanceMatrix) {
      meshRef.current.instanceMatrix.setUsage(DynamicDrawUsage);
    }
  }, [asset]);

  useEffect(() => {
    applyMaterialOpacity(asset?.material, settings.opacity);
  }, [asset, settings.opacity]);

  useFrame(({ clock, camera }) => {
    const mesh = meshRef.current;
    const activeSettings = settingsRef.current;

    if (!mesh || !asset) {
      return;
    }

    const segmentCount = Math.max(1, activeSettings.segmentCount);
    const petalsPerSegment = Math.max(1, activeSettings.petalsPerSegment);
    const activeCount = activeSettings.visible
      ? Math.min(MAX_GARLAND_PETALS, segmentCount * petalsPerSegment)
      : 0;
    const time = clock.elapsedTime;
    const directionSign = activeSettings.direction === "Reverse" ? -1 : 1;

    mesh.count = activeCount;
    tiltEulerRef.current.set(
      MathUtils.degToRad(activeSettings.tiltX),
      MathUtils.degToRad(activeSettings.tiltY),
      MathUtils.degToRad(activeSettings.tiltZ),
      "XYZ",
    );

    for (let index = 0; index < activeCount; index += 1) {
      const variation = variations[index];
      const segmentIndex = Math.floor(index / petalsPerSegment);
      const petalIndex = index % petalsPerSegment;
      const petalPhase = petalIndex / petalsPerSegment;
      const segmentOffset =
        (variation.segmentSeed * activeSettings.segmentJitter) /
        Math.max(32, segmentCount * 2.5);
      const rawProgress = wrap01(
        segmentIndex / segmentCount +
          segmentOffset +
          activeSettings.flowOffset +
          time * activeSettings.speed,
      );
      const progress =
        activeSettings.direction === "Reverse"
          ? wrap01(1 - rawProgress)
          : rawProgress;
      const tangentStep = 0.006 * directionSign;
      const nextProgress = MathUtils.clamp(progress + tangentStep, 0, 1);
      const alternateProgress = MathUtils.clamp(progress - tangentStep, 0, 1);
      const usingAlternateTangent = nextProgress === progress;
      const fade = endpointFade(progress);

      writeHelixPoint(
        progress,
        activeSettings,
        centerRef.current,
        tiltEulerRef.current,
      );
      writeHelixPoint(
        usingAlternateTangent ? alternateProgress : nextProgress,
        activeSettings,
        nextPointRef.current,
        tiltEulerRef.current,
      );

      tangentRef.current.subVectors(nextPointRef.current, centerRef.current);

      if (tangentRef.current.lengthSq() < 0.000001) {
        tangentRef.current.set(0, directionSign, 0.001);
      } else {
        tangentRef.current.normalize();

        if (usingAlternateTangent) {
          tangentRef.current.multiplyScalar(-1);
        }
      }

      normalRef.current.crossVectors(tangentRef.current, UP);

      if (normalRef.current.lengthSq() < 0.000001) {
        normalRef.current.set(1, 0, 0);
      } else {
        normalRef.current.normalize();
      }

      binormalRef.current.crossVectors(normalRef.current, tangentRef.current);

      if (binormalRef.current.lengthSq() < 0.000001) {
        binormalRef.current.set(0, 0, 1);
      } else {
        binormalRef.current.normalize();
      }

      const radialAngle =
        variation.radialAngle +
        petalPhase * PI2 +
        progress * activeSettings.turns * 0.42;
      const radialDistance =
        activeSettings.garlandThickness *
        (variation.radialDistance +
          variation.driftSeed * activeSettings.radialVariation * 0.08);
      const floatPhase =
        time * activeSettings.floatSpeed +
        progress * activeSettings.turns * PI2 +
        variation.flutterPhase;
      const individualFloatPhase =
        time *
          activeSettings.individualFloatSpeed *
          (0.82 + variation.spinSpeedSeed * 0.46) +
        progress * activeSettings.turns * PI2 +
        variation.driftPhase;
      const individualFloat =
        activeSettings.individualFloatAmount *
        (1 + Math.abs(variation.driftSeed) * activeSettings.driftVariation);

      pointRef.current.copy(centerRef.current);
      pointRef.current.addScaledVector(
        normalRef.current,
        Math.cos(radialAngle) * radialDistance +
          Math.sin(individualFloatPhase) * individualFloat * 0.3,
      );
      pointRef.current.addScaledVector(
        binormalRef.current,
        Math.sin(radialAngle) *
          radialDistance *
          activeSettings.garlandDepthScale +
          Math.cos(individualFloatPhase * 0.8) * individualFloat * 0.22,
      );
      pointRef.current.x +=
        Math.sin(floatPhase * 0.82) * activeSettings.floatAmount * 0.16;
      pointRef.current.y +=
        Math.sin(floatPhase * 1.18) * activeSettings.floatAmount +
        Math.sin(individualFloatPhase * 0.72) * individualFloat * 0.24;
      pointRef.current.z +=
        Math.cos(floatPhase * 0.68) * activeSettings.floatAmount * 0.12;

      lookTargetRef.current.copy(camera.position);
      matrixRef.current.lookAt(pointRef.current, lookTargetRef.current, UP);
      targetQuatRef.current.setFromRotationMatrix(matrixRef.current);

      const ribbonRotation =
        progress * activeSettings.rotationTurns * PI2 +
        time * activeSettings.rotationSpeed * directionSign * 0.32;
      const rotationVariation = MathUtils.degToRad(
        activeSettings.rotationVariation,
      );
      const tangentRoll =
        Math.atan2(
          tangentRef.current.x,
          Math.max(0.001, tangentRef.current.y),
        ) * 0.42;
      const spinMultiplier =
        1 + (variation.spinSpeedSeed - 0.5) * activeSettings.spinVariation;
      const individualSpin =
        time *
          activeSettings.individualSpinSpeed *
          spinMultiplier *
          variation.spinDirection *
          directionSign +
        variation.driftPhase * 0.1;

      layerEulerRef.current.set(
        MathUtils.degToRad(activeSettings.baseRotationX) +
          Math.sin(ribbonRotation) *
            MathUtils.degToRad(activeSettings.layerRotationX) +
          variation.rotationSeedX * rotationVariation * 0.42 +
          Math.sin(floatPhase * 1.08) * activeSettings.flutterAmount * 0.16,
        MathUtils.degToRad(activeSettings.baseRotationY) +
          ribbonRotation * activeSettings.layerTwist +
          variation.rotationSeedY * rotationVariation * 0.24,
        MathUtils.degToRad(activeSettings.baseRotationZ) +
          tangentRoll +
          Math.cos(ribbonRotation) *
            MathUtils.degToRad(activeSettings.layerRotationZ) +
          variation.rotationSeedZ * rotationVariation * 0.58 +
          radialAngle * 0.12,
        "XYZ",
      );
      layerQuatRef.current.setFromEuler(layerEulerRef.current);
      spinEulerRef.current.set(
        Math.sin(individualFloatPhase * 0.84) * rotationVariation * 0.07,
        Math.cos(individualFloatPhase * 0.62) * rotationVariation * 0.05 +
          individualSpin * 0.08,
        individualSpin * 0.34,
        "XYZ",
      );
      spinQuatRef.current.setFromEuler(spinEulerRef.current);
      targetQuatRef.current.multiply(layerQuatRef.current).multiply(spinQuatRef.current);

      const frontCenter =
        MathUtils.smoothstep(
          pointRef.current.z,
          activeSettings.radius * activeSettings.depthScale * 0.04,
          activeSettings.radius * activeSettings.depthScale * 0.58,
        ) *
        (1 -
          MathUtils.smoothstep(
            Math.abs(pointRef.current.x),
            activeSettings.radius * 0.12,
            activeSettings.radius * 0.58,
          ));
      const frontScale = 1 - frontCenter * activeSettings.frontCleanliness;
      const verticalScale =
        1 -
        MathUtils.smoothstep(
          Math.abs(pointRef.current.y - activeSettings.curveOffsetY),
          activeSettings.height * 0.32,
          activeSettings.height * 0.64,
        ) *
          0.18;
      const scaleVariation =
        1 +
        variation.scaleSeed * activeSettings.scaleVariation * 0.44 +
        Math.sin(progress * activeSettings.turns * PI2 + petalPhase * PI2) *
          activeSettings.scaleVariation *
          0.1;
      const scalePulse =
        1 + Math.sin(floatPhase * 1.38) * 0.012 * activeSettings.flutterAmount;
      const scale =
        activeSettings.petalScale *
        scaleVariation *
        scalePulse *
        fade *
        frontScale *
        verticalScale;

      if (scale <= 0.0015) {
        scaleRef.current.set(0.0001, 0.0001, 0.0001);
      } else {
        scaleRef.current.set(
          scale * (1 + variation.bendSeedX * activeSettings.bendVariation * 0.16),
          scale * (1 + variation.bendSeedY * activeSettings.bendVariation * 0.1),
          scale * (1 + variation.bendSeedZ * activeSettings.bendVariation * 0.14),
        );
      }

      matrixRef.current.compose(
        pointRef.current,
        targetQuatRef.current,
        scaleRef.current,
      );
      mesh.setMatrixAt(index, matrixRef.current);
    }

    mesh.instanceMatrix.needsUpdate = true;
  });

  if (!asset) {
    return null;
  }

  return (
    <group visible={settings.visible} frustumCulled={false}>
      <DebugHelixCurve settings={settings} />
      <instancedMesh
        ref={meshRef}
        args={[asset.geometry, asset.material, MAX_GARLAND_PETALS]}
        castShadow
        receiveShadow
        renderOrder={46}
        frustumCulled={false}
      />
    </group>
  );
}

useLoader.preload(GLTFLoader, HERO_PETAL_MODEL_URL);
